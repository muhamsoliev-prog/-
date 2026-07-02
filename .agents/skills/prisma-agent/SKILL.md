# Prisma Agent Skill

## Trigger
`/prisma-agent`

## Role
You are the Prisma ORM Engineer for a Tajikistan marketplace. You design schemas, write migrations, optimize queries, and handle the BigInt dirams pattern, soft deletes, multi-tenancy, and full-text search — all tuned for PostgreSQL on Supabase/Neon.

---

## Core Conventions

```prisma
// All monetary values: BigInt in dirams (1 TJS = 100 dirams). NEVER Decimal/Float for money.
// Soft delete: deletedAt DateTime? on every user-visible model
// All IDs: String @id @default(cuid()) — never auto-increment Int
// Timestamps: createdAt DateTime @default(now()), updatedAt DateTime @updatedAt
// Enums: define in Prisma, use String in DB for flexibility
```

---

## Marketplace Schema (core models)

```prisma
// prisma/schema.prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["fullTextSearch", "fullTextIndex"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id          String   @id @default(cuid())
  phone       String   @unique  // +992XXXXXXXXX
  phoneHash   String   @unique  // bcrypt hash for fraud logs
  name        String?
  lang        String   @default("ru")  // ru | tg
  regionId    String   @default("dushanbe")
  loyaltyPts  Int      @default(0)
  deviceFp    String?  // device fingerprint for fraud
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?

  orders      Order[]
  reviews     Review[]
  credits     UserCredit[]
  referrals   Referral[] @relation("Referrer")
  referred    Referral?  @relation("Referee")

  @@index([phone])
  @@index([regionId])
  @@index([deletedAt])
}

model Seller {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  phone       String   @unique
  regionId    String
  rating      Decimal  @default(0) @db.Decimal(3, 2)
  isVerified  Boolean  @default(false)
  createdAt   DateTime @default(now())
  deletedAt   DateTime?
  products    Product[]

  @@index([slug])
  @@index([regionId, isVerified])
}

model Product {
  id                  String   @id @default(cuid())
  sellerId            String
  categoryId          String
  titleRu             String
  titleTg             String
  descriptionRu       String?  @db.Text
  descriptionTg       String?  @db.Text
  priceDirams         BigInt
  originalPriceDirams BigInt?
  stockQty            Int      @default(0)
  imageUrls           String[]
  attributes          Json     @default("{}")
  regionIds           String[] // available delivery regions
  rating              Decimal  @default(0) @db.Decimal(3, 2)
  reviewCount         Int      @default(0)
  orderCount30d       Int      @default(0)
  isActive            Boolean  @default(true)
  publishedAt         DateTime?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  deletedAt           DateTime?

  seller    Seller   @relation(fields: [sellerId], references: [id])
  category  Category @relation(fields: [categoryId], references: [id])
  reviews   Review[]
  items     OrderItem[]

  @@index([sellerId, deletedAt])
  @@index([categoryId, isActive])
  @@index([priceDirams])
  @@index([orderCount30d(sort: Desc)])
}

model Category {
  id       String     @id @default(cuid())
  slug     String     @unique
  nameRu   String
  nameTg   String
  parentId String?
  parent   Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children Category[] @relation("CategoryTree")
  products Product[]

  @@index([parentId])
  @@index([slug])
}

model Order {
  id            String   @id @default(cuid())
  userId        String
  addressId     String
  status        String   @default("pending")
  // pending | confirmed | shipped | delivered | cancelled | returned
  paymentMethod String   @default("cod")
  totalDirams   BigInt
  deliveryDirams BigInt  @default(0)
  discountDirams BigInt  @default(0)
  regionId      String
  promoCode     String?
  lang          String   @default("ru")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user      User       @relation(fields: [userId], references: [id])
  items     OrderItem[]
  fraudLog  OrderFraudLog?

  @@index([userId, status])
  @@index([status, createdAt])
  @@index([regionId, createdAt])
}

model OrderItem {
  id          String  @id @default(cuid())
  orderId     String
  productId   String
  qty         Int
  priceDirams BigInt

  order   Order   @relation(fields: [orderId], references: [id])
  product Product @relation(fields: [productId], references: [id])

  @@index([orderId])
  @@index([productId])
}

model Review {
  id          String   @id @default(cuid())
  userId      String
  productId   String
  rating      Int      // 1-5
  text        String?  @db.Text
  status      String   @default("active")  // active | flagged | removed
  fraudScore  Int?
  createdAt   DateTime @default(now())
  deletedAt   DateTime?

  user    User    @relation(fields: [userId], references: [id])
  product Product @relation(fields: [productId], references: [id])

  @@unique([userId, productId])
  @@index([productId, status])
  @@index([status, fraudScore])
}
```

---

## Query Patterns

```typescript
// lib/db/products.ts
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Type-safe where builder
export interface ProductFilters {
  categoryId?: string;
  minDirams?: bigint;
  maxDirams?: bigint;
  regionId?: string;
  sellerId?: string;
  inStock?: boolean;
}

export function buildProductWhere(f: ProductFilters): Prisma.ProductWhereInput {
  return {
    deletedAt: null,
    isActive:  true,
    ...(f.categoryId && { categoryId: f.categoryId }),
    ...(f.sellerId   && { sellerId:   f.sellerId }),
    ...(f.regionId   && { regionIds:  { has: f.regionId } }),
    ...(f.inStock    && { stockQty:   { gt: 0 } }),
    ...((f.minDirams !== undefined || f.maxDirams !== undefined) && {
      priceDirams: {
        ...(f.minDirams !== undefined && { gte: f.minDirams }),
        ...(f.maxDirams !== undefined && { lte: f.maxDirams }),
      },
    }),
  };
}

// Cursor-based pagination (preferred over offset for large datasets)
export async function getProductsCursor(
  where: Prisma.ProductWhereInput,
  cursor?: string,
  take = 20,
) {
  const items = await prisma.product.findMany({
    where,
    orderBy: [{ orderCount30d: 'desc' }, { createdAt: 'desc' }],
    take: take + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    select: {
      id: true, titleRu: true, titleTg: true,
      priceDirams: true, originalPriceDirams: true,
      imageUrls: true, rating: true, reviewCount: true,
      stockQty: true, sellerId: true,
    },
  });

  const hasNext = items.length > take;
  return { items: items.slice(0, take), nextCursor: hasNext ? items[take - 1]?.id : null };
}
```

---

## Transactions

```typescript
// lib/db/order.ts

export async function placeOrder(input: PlaceOrderInput) {
  return prisma.$transaction(async (tx) => {
    // 1. Check & reserve stock atomically
    for (const item of input.items) {
      const result = await tx.product.updateMany({
        where: { id: item.productId, stockQty: { gte: item.qty }, deletedAt: null },
        data:  { stockQty: { decrement: item.qty } },
      });
      if (result.count === 0) throw new Error(`Out of stock: ${item.productId}`);
    }

    // 2. Create order
    const order = await tx.order.create({
      data: {
        userId:        input.userId,
        addressId:     input.addressId,
        paymentMethod: input.paymentMethod,
        regionId:      input.regionId,
        totalDirams:   input.totalDirams,
        items: { create: input.items.map(i => ({
          productId:  i.productId,
          qty:        i.qty,
          priceDirams: i.priceDirams,
        })) },
      },
    });

    // 3. Mark promo used
    if (input.promoCode) {
      await tx.promoCodeUse.create({
        data: { code: input.promoCode, userId: input.userId, orderId: order.id },
      });
    }

    return order;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
}
```

---

## Raw SQL for Analytics

```typescript
// lib/db/analytics.ts
import { prisma } from '@/lib/prisma';

// Daily revenue aggregation — use raw SQL for window functions
export async function getDailyRevenue(days = 30): Promise<Array<{ date: string; revenueDirams: bigint }>> {
  const rows = await prisma.$queryRaw<Array<{ date: string; revenue_dirams: bigint }>>`
    SELECT
      DATE_TRUNC('day', created_at)::date::text AS date,
      SUM(total_dirams)                          AS revenue_dirams
    FROM "Order"
    WHERE status = 'delivered'
      AND created_at >= NOW() - INTERVAL '${Prisma.raw(String(days))} days'
    GROUP BY 1
    ORDER BY 1
  `;
  return rows.map(r => ({ date: r.date, revenueDirams: r.revenue_dirams }));
}

// Cohort retention — monthly
export async function getCohortRetention(): Promise<Array<{ cohort: string; month: number; rate: number }>> {
  return prisma.$queryRaw`
    WITH cohorts AS (
      SELECT id, DATE_TRUNC('month', created_at) AS cohort_month
      FROM "User" WHERE deleted_at IS NULL
    ),
    orders AS (
      SELECT DISTINCT user_id, DATE_TRUNC('month', created_at) AS order_month
      FROM "Order" WHERE status != 'cancelled'
    )
    SELECT
      cohort_month::text AS cohort,
      EXTRACT(MONTH FROM AGE(order_month, cohort_month))::int AS month,
      COUNT(DISTINCT o.user_id)::float / COUNT(DISTINCT c.id) AS rate
    FROM cohorts c
    LEFT JOIN orders o ON c.id = o.user_id
    GROUP BY 1, 2
    ORDER BY 1, 2
  `;
}
```

---

## Migration Best Practices

```bash
# Development
npx prisma migrate dev --name add_loyalty_transactions
# Production
npx prisma migrate deploy

# Never modify existing migrations — create new ones
# For large tables (>1M rows) use concurrent index creation:
```

```prisma
// In migration SQL — add index without locking:
// CREATE INDEX CONCURRENTLY "Product_priceDirams_idx" ON "Product" ("priceDirams");
```

---

## Seeding

```typescript
// prisma/seed.ts
import { prisma } from '@/lib/prisma';
import { SEED_FAQ } from '@/lib/chatbot/faq';

async function main() {
  // Upsert idempotently
  await prisma.category.upsert({
    where:  { slug: 'electronics' },
    update: {},
    create: { slug: 'electronics', nameRu: 'Электроника', nameTg: 'Электроника' },
  });

  console.log('Seed complete');
}

main().catch(console.error).finally(() => prisma.$disconnect());
```

```json
// package.json
{
  "prisma": { "seed": "tsx prisma/seed.ts" }
}
```

---

## Agent Workflow

1. **Never** use `Decimal` or `Float` for money — always `BigInt` (dirams).
2. **Soft delete** — add `deletedAt DateTime?` and always filter `WHERE deletedAt IS NULL`.
3. **Indexes** — add composite indexes for every common query pattern; use `CONCURRENTLY` for production.
4. **Transactions** — wrap multi-step writes in `$transaction` with `ReadCommitted` isolation.
5. **Raw SQL** — use `$queryRaw` only for analytics aggregations; use ORM for CRUD.
6. **Migrations** — never edit past migrations; always create new ones.
7. **Select** — always use `select` to limit returned columns; avoid fetching `@db.Text` fields unnecessarily.
