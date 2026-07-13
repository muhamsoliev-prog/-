---
name: pricing-agent
description: |-
  Dynamic pricing for Tajikistan marketplace — demand-based adjustments, competitor price monitoring, seasonal promotions, BigInt dirams calculations, and price history.
---

# Pricing Agent

## Trigger
`/pricing-agent`

## Role
Pricing specialist for the Tajikistan marketplace. Covers price storage (integer dirams), seller price management, discount/promotion engine, commission structure, dynamic pricing rules, price history, and buyer-facing price display.

---

## Core Rule: Amounts as Integer Dirams

```typescript
// NEVER store floats
// 1 сомони = 100 дирамов
// Price 45.50 TJS → store as 4550

const price = 4550; // dirams

function formatSomoni(dirams: number): string {
  return new Intl.NumberFormat('ru-TJ', {
    style: 'currency',
    currency: 'TJS',
    minimumFractionDigits: 2,
  }).format(dirams / 100);
}
// → "45,50 TJS"

function formatSomoniShort(dirams: number): string {
  if (dirams >= 100_000_00) return `${(dirams / 100_000_00).toFixed(1)}М сом`; // millions
  if (dirams >= 1_000_00)   return `${(dirams / 1_000_00).toFixed(1)}К сом`;   // thousands
  return `${(dirams / 100).toFixed(2)} сом`;
}

// Parse user input → dirams
function parseSomoniInput(input: string): number {
  const clean = input.replace(/\s/g, '').replace(',', '.');
  const somoni = parseFloat(clean);
  if (isNaN(somoni) || somoni < 0) throw new Error('Invalid price');
  return Math.round(somoni * 100); // avoid float rounding
}
```

---

## Database Schema

```prisma
model Product {
  // ... other fields
  priceAmount   Int      // current price in dirams
  comparePriceAmount Int? // crossed-out "was" price in dirams
  costAmount    Int?     // seller's cost (not shown to buyer)
  currency      String   @default("TJS")
  discounts     ProductDiscount[]
  priceHistory  PriceHistory[]
  promotionItems PromotionItem[]
}

// Tracks every price change
model PriceHistory {
  id          String   @id @default(cuid())
  productId   String
  oldPrice    Int
  newPrice    Int
  changedById String
  reason      String?  // 'seller_update' | 'promotion_start' | 'promotion_end' | 'admin_correction'
  product     Product  @relation(fields: [productId], references: [id])
  changedBy   User     @relation(fields: [changedById], references: [id])
  createdAt   DateTime @default(now())
  @@index([productId, createdAt])
}

// Seller-defined discounts on individual products
model ProductDiscount {
  id          String   @id @default(cuid())
  productId   String
  type        String   // 'percentage' | 'fixed'
  value       Int      // percentage (0-100) OR fixed dirams off
  startsAt    DateTime
  endsAt      DateTime
  isActive    Boolean  @default(true)
  product     Product  @relation(fields: [productId], references: [id])
  @@index([productId, isActive])
  @@index([endsAt])  // for cleanup cron
}

// Platform-wide or seller promotions (flash sales, seasonal)
model Promotion {
  id            String   @id @default(cuid())
  nameRu        String
  nameTj        String?
  type          String   // 'flash_sale' | 'seasonal' | 'category' | 'coupon' | 'bundle'
  discountType  String   // 'percentage' | 'fixed' | 'free_shipping'
  discountValue Int      // percent or dirams
  minOrderAmount Int?    // minimum cart total in dirams to apply
  maxUsages     Int?     // null = unlimited
  usageCount    Int      @default(0)
  startsAt      DateTime
  endsAt        DateTime
  isActive      Boolean  @default(true)
  createdById   String
  items         PromotionItem[]
  coupons       Coupon[]
  createdAt     DateTime @default(now())
  @@index([isActive, startsAt, endsAt])
}

// Which products/categories are in a promotion
model PromotionItem {
  id          String  @id @default(cuid())
  promotionId String
  productId   String?
  categoryId  String?
  sellerId    String?   // entire seller's catalog in promo
  promotion   Promotion @relation(fields: [promotionId], references: [id])
  product     Product?  @relation(fields: [productId], references: [id])
}

// Coupon codes (type=coupon promotions)
model Coupon {
  id          String   @id @default(cuid())
  promotionId String
  code        String   @unique  // e.g. NAVRUS25
  usageLimit  Int?     // per-coupon limit
  usageCount  Int      @default(0)
  perUserLimit Int     @default(1)
  promotion   Promotion @relation(fields: [promotionId], references: [id])
  usages      CouponUsage[]
  @@index([code])
}

model CouponUsage {
  id        String   @id @default(cuid())
  couponId  String
  userId    String
  orderId   String
  coupon    Coupon @relation(fields: [couponId], references: [id])
  usedAt    DateTime @default(now())
  @@unique([couponId, userId])  // one use per user per coupon
}

// Platform commission rules
model CommissionRule {
  id            String  @id @default(cuid())
  categoryId    String? // null = default rule
  sellerId      String? // null = all sellers
  pct           Int     // percent × 100, e.g. 850 = 8.50%
  minAmount     Int     @default(0)   // minimum commission in dirams
  maxAmount     Int?    // cap, null = no cap
  isActive      Boolean @default(true)
  effectiveFrom DateTime @default(now())
  @@index([categoryId, isActive])
}

// Price rules for bulk/tiered pricing
model BulkPriceRule {
  id          String  @id @default(cuid())
  productId   String
  minQty      Int     // buy >= minQty
  priceAmount Int     // discounted price per unit in dirams
  product     Product @relation(fields: [productId], references: [id])
  @@unique([productId, minQty])
}
```

---

## Price Calculation Engine

```typescript
// The single source of truth for effective price
interface PriceResult {
  originalPrice: number;   // dirams, before any discount
  comparePrice: number | null; // crossed-out price if any
  effectivePrice: number;  // final price buyer pays per unit
  discountPct: number;     // 0-100
  discountAmount: number;  // dirams saved
  source: 'none' | 'product_discount' | 'promotion' | 'bulk';
}

async function calculateEffectivePrice(
  productId: string,
  qty: number = 1,
  userId?: string
): Promise<PriceResult> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      priceAmount: true,
      comparePriceAmount: true,
      discounts: {
        where: {
          isActive: true,
          startsAt: { lte: new Date() },
          endsAt: { gte: new Date() },
        },
        orderBy: { value: 'desc' }, // best discount first
        take: 1,
      },
    },
  });
  if (!product) throw new AppError('Product not found', 404);

  const base = product.priceAmount;

  // 1. Check bulk price rules
  const bulk = await prisma.bulkPriceRule.findFirst({
    where: { productId, minQty: { lte: qty } },
    orderBy: { minQty: 'desc' }, // highest threshold that applies
  });
  if (bulk) {
    return buildResult(base, bulk.priceAmount, product.comparePriceAmount, 'bulk');
  }

  // 2. Check active product discount
  if (product.discounts.length > 0) {
    const d = product.discounts[0];
    const discounted = applyDiscount(base, d.type, d.value);
    return buildResult(base, discounted, product.comparePriceAmount, 'product_discount');
  }

  // 3. Check promotions (platform-level)
  const promo = await getActivePromotion(productId);
  if (promo) {
    const discounted = applyDiscount(base, promo.discountType, promo.discountValue);
    return buildResult(base, discounted, product.comparePriceAmount, 'promotion');
  }

  return buildResult(base, base, product.comparePriceAmount, 'none');
}

function applyDiscount(
  price: number,
  type: 'percentage' | 'fixed' | 'free_shipping',
  value: number
): number {
  if (type === 'percentage') {
    return Math.round(price * (1 - value / 100));
  }
  if (type === 'fixed') {
    return Math.max(0, price - value);
  }
  return price; // free_shipping doesn't change unit price
}

function buildResult(
  original: number,
  effective: number,
  comparePrice: number | null,
  source: PriceResult['source']
): PriceResult {
  const discountAmount = original - effective;
  const discountPct = original > 0 ? Math.round((discountAmount / original) * 100) : 0;
  return {
    originalPrice: original,
    comparePrice,
    effectivePrice: effective,
    discountPct,
    discountAmount,
    source,
  };
}

async function getActivePromotion(productId: string) {
  const now = new Date();
  return prisma.promotion.findFirst({
    where: {
      isActive: true,
      startsAt: { lte: now },
      endsAt: { gte: now },
      items: {
        some: {
          OR: [
            { productId },
            {
              categoryId: {
                in: await getProductCategoryIds(productId),
              },
            },
          ],
        },
      },
    },
    orderBy: { discountValue: 'desc' }, // best promotion wins
  });
}
```

---

## Cart Pricing & Coupon Validation

```typescript
interface CartLine {
  productId: string;
  qty: number;
}

interface CartPricingResult {
  lines: {
    productId: string;
    qty: number;
    unitPrice: number;      // dirams
    lineTotal: number;      // dirams
    discountPct: number;
  }[];
  subtotal: number;         // sum of lineTotals
  couponDiscount: number;   // dirams off from coupon
  shippingAmount: number;   // dirams (0 if free shipping)
  total: number;            // subtotal - couponDiscount + shippingAmount
  appliedCoupon?: string;
}

async function calculateCartPricing(
  lines: CartLine[],
  couponCode?: string,
  userId?: string
): Promise<CartPricingResult> {
  const pricedLines = await Promise.all(
    lines.map(async (line) => {
      const pr = await calculateEffectivePrice(line.productId, line.qty, userId);
      return {
        productId: line.productId,
        qty: line.qty,
        unitPrice: pr.effectivePrice,
        lineTotal: pr.effectivePrice * line.qty,
        discountPct: pr.discountPct,
      };
    })
  );

  const subtotal = pricedLines.reduce((sum, l) => sum + l.lineTotal, 0);
  let couponDiscount = 0;
  let appliedCoupon: string | undefined;

  if (couponCode && userId) {
    const result = await applyCoupon(couponCode, subtotal, userId);
    couponDiscount = result.discount;
    appliedCoupon = result.applied ? couponCode : undefined;
  }

  const shippingAmount = await calculateShipping(subtotal, lines);

  return {
    lines: pricedLines,
    subtotal,
    couponDiscount,
    shippingAmount,
    total: subtotal - couponDiscount + shippingAmount,
    appliedCoupon,
  };
}

async function applyCoupon(
  code: string,
  subtotal: number,
  userId: string
): Promise<{ discount: number; applied: boolean; reason?: string }> {
  const coupon = await prisma.coupon.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      promotion: true,
      usages: { where: { userId } },
    },
  });

  if (!coupon) return { discount: 0, applied: false, reason: 'Купон не найден' };

  const promo = coupon.promotion;
  const now = new Date();

  if (!promo.isActive || promo.startsAt > now || promo.endsAt < now) {
    return { discount: 0, applied: false, reason: 'Купон недействителен' };
  }

  if (coupon.perUserLimit && coupon.usages.length >= coupon.perUserLimit) {
    return { discount: 0, applied: false, reason: 'Лимит использования купона исчерпан' };
  }

  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
    return { discount: 0, applied: false, reason: 'Купон больше недоступен' };
  }

  if (promo.minOrderAmount && subtotal < promo.minOrderAmount) {
    return {
      discount: 0,
      applied: false,
      reason: `Минимальная сумма заказа: ${formatSomoni(promo.minOrderAmount)}`,
    };
  }

  const discount = applyDiscount(subtotal, promo.discountType as any, promo.discountValue);
  return { discount: subtotal - discount, applied: true };
}

// Call when order is confirmed
async function redeemCoupon(code: string, userId: string, orderId: string) {
  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon) return;

  await prisma.$transaction([
    prisma.couponUsage.create({
      data: { couponId: coupon.id, userId, orderId },
    }),
    prisma.coupon.update({
      where: { id: coupon.id },
      data: { usageCount: { increment: 1 } },
    }),
    prisma.promotion.update({
      where: { id: coupon.promotionId },
      data: { usageCount: { increment: 1 } },
    }),
  ]);
}
```

---

## Shipping Price

```typescript
// Tajikistan shipping tiers (in dirams)
const SHIPPING_TIERS = [
  { minOrder: 0,       fee: 1500_00 }, // 150 TJS
  { minOrder: 500_00,  fee: 1000_00 }, // 100 TJS if order ≥ 50 TJS
  { minOrder: 2000_00, fee: 500_00  }, // 50 TJS if order ≥ 200 TJS
  { minOrder: 5000_00, fee: 0       }, // free shipping if order ≥ 500 TJS
];

async function calculateShipping(subtotal: number, lines: CartLine[]): Promise<number> {
  // check if any active promo gives free shipping
  const hasFreeShippingPromo = await prisma.promotion.findFirst({
    where: {
      isActive: true,
      discountType: 'free_shipping',
      startsAt: { lte: new Date() },
      endsAt: { gte: new Date() },
    },
  });
  if (hasFreeShippingPromo) return 0;

  const tier = [...SHIPPING_TIERS]
    .reverse()
    .find(t => subtotal >= t.minOrder);
  return tier?.fee ?? SHIPPING_TIERS[0].fee;
}
```

---

## Commission Calculation

```typescript
async function calculateCommission(
  productId: string,
  saleAmount: number  // dirams
): Promise<number> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { categoryId: true, sellerId: true },
  });

  // Priority: seller-specific > category > default
  const rule = await prisma.commissionRule.findFirst({
    where: {
      isActive: true,
      OR: [
        { sellerId: product?.sellerId },
        { categoryId: product?.categoryId, sellerId: null },
        { categoryId: null, sellerId: null },
      ],
    },
    orderBy: [
      { sellerId: 'desc' },    // seller-specific first
      { categoryId: 'desc' },  // then category
    ],
  });

  if (!rule) return 0;

  let commission = Math.round((saleAmount * rule.pct) / 10_000); // pct is × 100
  if (rule.minAmount) commission = Math.max(commission, rule.minAmount);
  if (rule.maxAmount) commission = Math.min(commission, rule.maxAmount);
  return commission;
}

// Default commission table (Tajikistan market norms)
const DEFAULT_COMMISSIONS = [
  { category: 'electronics',    pct: 500  }, // 5%
  { category: 'clothing',       pct: 1000 }, // 10%
  { category: 'construction',   pct: 700  }, // 7%
  { category: 'food_grocery',   pct: 1200 }, // 12%
  { category: 'home_garden',    pct: 900  }, // 9%
  { category: 'default',        pct: 850  }, // 8.5%
];
```

---

## Seller Price Update

```typescript
async function updateProductPrice(
  productId: string,
  newPrice: number,   // dirams
  comparePrice: number | null,
  sellerId: string
): Promise<void> {
  // validate ownership
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { sellerId: true, priceAmount: true },
  });
  if (!product) throw new AppError('Product not found', 404);
  if (product.sellerId !== sellerId) throw new AppError('Forbidden', 403);
  if (newPrice < 100) throw new AppError('Minimum price is 1 TJS', 400); // 100 dirams

  await prisma.$transaction([
    prisma.product.update({
      where: { id: productId },
      data: {
        priceAmount: newPrice,
        comparePriceAmount: comparePrice,
      },
    }),
    prisma.priceHistory.create({
      data: {
        productId,
        oldPrice: product.priceAmount,
        newPrice,
        changedById: sellerId,
        reason: 'seller_update',
      },
    }),
  ]);

  // invalidate product cache
  await redis.del(`product:${productId}`);
  await redis.del(`product:${productId}:price`);
}

// Bulk price update (seller CSV import)
async function bulkUpdatePrices(
  sellerId: string,
  updates: { productId: string; newPrice: number }[]
) {
  const errors: string[] = [];

  for (const u of updates) {
    try {
      await updateProductPrice(u.productId, u.newPrice, null, sellerId);
    } catch (err) {
      errors.push(`${u.productId}: ${(err as Error).message}`);
    }
  }

  return { updated: updates.length - errors.length, errors };
}
```

---

## Flash Sale (Admin)

```typescript
async function createFlashSale(data: {
  nameRu: string;
  discountPct: number;   // 0-90
  productIds: string[];
  startsAt: Date;
  endsAt: Date;
  maxUsages?: number;
}) {
  if (data.discountPct > 90) throw new AppError('Flash sale discount cannot exceed 90%', 400);
  const durationHours = (data.endsAt.getTime() - data.startsAt.getTime()) / 3_600_000;
  if (durationHours > 48) throw new AppError('Flash sale cannot exceed 48 hours', 400);

  return prisma.promotion.create({
    data: {
      nameRu: data.nameRu,
      type: 'flash_sale',
      discountType: 'percentage',
      discountValue: data.discountPct,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      maxUsages: data.maxUsages ?? null,
      isActive: true,
      createdById: 'system',
      items: {
        create: data.productIds.map(id => ({ productId: id })),
      },
    },
  });
}
```

---

## Cron Jobs

```typescript
// 1. Deactivate expired discounts every 5 minutes
async function deactivateExpiredDiscounts() {
  const now = new Date();
  await prisma.productDiscount.updateMany({
    where: { isActive: true, endsAt: { lt: now } },
    data: { isActive: false },
  });
  await prisma.promotion.updateMany({
    where: { isActive: true, endsAt: { lt: now } },
    data: { isActive: false },
  });
}

// 2. Price history cleanup — keep only 90 days
async function cleanOldPriceHistory() {
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  await prisma.priceHistory.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
}
```

---

## API Routes

```typescript
// src/api/v1/pricing/routes.ts
import { Router } from 'express';
import { requireAuth, requireRole } from '@/middleware/auth';
import * as pc from './pricing.controller';

const router = Router();

// Public
router.get('/products/:id/price', pc.getProductPrice);      // effective price for buyer
router.post('/cart/calculate', pc.calculateCart);           // cart totals with coupon
router.post('/coupons/validate', requireAuth, pc.validateCoupon);

// Seller
router.patch('/products/:id/price', requireAuth, requireRole('seller'), pc.updatePrice);
router.post('/products/:id/discount', requireAuth, requireRole('seller'), pc.createDiscount);
router.delete('/products/:id/discount/:discountId', requireAuth, requireRole('seller'), pc.deleteDiscount);
router.post('/products/bulk-price', requireAuth, requireRole('seller'), pc.bulkUpdatePrices);
router.get('/products/:id/bulk-rules', requireAuth, requireRole('seller'), pc.getBulkRules);
router.post('/products/:id/bulk-rules', requireAuth, requireRole('seller'), pc.upsertBulkRule);

// Admin
router.get('/promotions', requireAuth, requireRole('admin'), pc.listPromotions);
router.post('/promotions', requireAuth, requireRole('admin'), pc.createPromotion);
router.patch('/promotions/:id', requireAuth, requireRole('admin'), pc.updatePromotion);
router.delete('/promotions/:id', requireAuth, requireRole('admin'), pc.deletePromotion);
router.post('/promotions/flash-sale', requireAuth, requireRole('admin'), pc.createFlashSale);
router.post('/coupons', requireAuth, requireRole('admin'), pc.createCoupon);
router.get('/commission-rules', requireAuth, requireRole('admin'), pc.listCommissionRules);
router.post('/commission-rules', requireAuth, requireRole('admin'), pc.upsertCommissionRule);

export default router;
```

---

## Frontend Components

### Price Display

```tsx
// components/ui/PriceDisplay.tsx
interface PriceDisplayProps {
  effectivePrice: number;   // dirams
  originalPrice?: number;   // dirams
  comparePrice?: number | null;
  discountPct?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function PriceDisplay({
  effectivePrice,
  originalPrice,
  comparePrice,
  discountPct,
  size = 'md',
}: PriceDisplayProps) {
  const sizeMap = {
    sm: { price: 'text-sm font-semibold', old: 'text-xs', badge: 'text-xs px-1.5 py-0.5' },
    md: { price: 'text-lg font-bold',     old: 'text-sm', badge: 'text-sm px-2 py-0.5' },
    lg: { price: 'text-2xl font-bold',    old: 'text-base', badge: 'text-sm px-2 py-1' },
  };
  const s = sizeMap[size];
  const showOriginal = originalPrice && originalPrice !== effectivePrice;
  const crossedOut = comparePrice ?? (showOriginal ? originalPrice : null);

  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <span className={`text-primary ${s.price}`}>
        {formatSomoni(effectivePrice)}
      </span>
      {crossedOut && crossedOut > effectivePrice && (
        <span className={`text-muted-foreground line-through ${s.old}`}>
          {formatSomoni(crossedOut)}
        </span>
      )}
      {discountPct && discountPct > 0 && (
        <span className={`rounded bg-red-100 font-medium text-red-600 ${s.badge}`}>
          -{discountPct}%
        </span>
      )}
    </div>
  );
}
```

### Seller Price Form

```tsx
// components/seller/PriceForm.tsx
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({
  price: z
    .string()
    .min(1, 'Укажите цену')
    .refine(v => parseFloat(v.replace(',', '.')) >= 1, 'Минимальная цена 1 сомони'),
  comparePrice: z.string().optional(),
});

export function SellerPriceForm({ productId, currentPrice }: { productId: string; currentPrice: number }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { price: (currentPrice / 100).toFixed(2) },
  });

  const updatePrice = useMutation({
    mutationFn: async (data: z.infer<typeof schema>) => {
      const priceInDirams = parseSomoniInput(data.price);
      const comparePriceInDirams = data.comparePrice
        ? parseSomoniInput(data.comparePrice)
        : null;
      return api.patch(`/pricing/products/${productId}/price`, {
        newPrice: priceInDirams,
        comparePrice: comparePriceInDirams,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      toast.success('Цена обновлена');
    },
  });

  return (
    <form onSubmit={handleSubmit(d => updatePrice.mutate(d))} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Цена продажи (сомони)</label>
        <div className="relative mt-1">
          <input
            {...register('price')}
            type="text"
            inputMode="decimal"
            className="w-full rounded-md border px-3 py-2 pr-12"
            placeholder="0.00"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            TJS
          </span>
        </div>
        {errors.price && <p className="mt-1 text-xs text-red-500">{errors.price.message}</p>}
      </div>

      <div>
        <label className="text-sm font-medium">Старая цена (необязательно)</label>
        <div className="relative mt-1">
          <input
            {...register('comparePrice')}
            type="text"
            inputMode="decimal"
            className="w-full rounded-md border px-3 py-2 pr-12"
            placeholder="0.00"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            TJS
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Показывается зачёркнутой рядом с актуальной ценой
        </p>
      </div>

      <button
        type="submit"
        disabled={updatePrice.isPending}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {updatePrice.isPending ? 'Сохранение...' : 'Сохранить цену'}
      </button>
    </form>
  );
}
```

### Coupon Input

```tsx
// components/checkout/CouponInput.tsx
export function CouponInput({ onApply }: { onApply: (discount: number, code: string) => void }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleApply() {
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post<{ discount: number; applied: boolean; reason?: string }>(
        '/pricing/coupons/validate',
        { code: code.trim().toUpperCase() }
      );
      if (res.data.applied) {
        onApply(res.data.discount, code.toUpperCase());
        toast.success(`Купон применён! Скидка ${formatSomoni(res.data.discount)}`);
      } else {
        setError(res.data.reason ?? 'Купон не действителен');
      }
    } catch {
      setError('Ошибка при проверке купона');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <input
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="Введите промокод"
          className="flex-1 rounded-md border px-3 py-2 text-sm uppercase tracking-wider"
          onKeyDown={e => e.key === 'Enter' && handleApply()}
        />
        <button
          onClick={handleApply}
          disabled={loading || !code.trim()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {loading ? '...' : 'Применить'}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
```

---

## Price History Chart (Seller Analytics)

```tsx
// components/seller/PriceHistoryChart.tsx
// Use lightweight recharts LineChart
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function PriceHistoryChart({ productId }: { productId: string }) {
  const { data } = useQuery({
    queryKey: ['price-history', productId],
    queryFn: () => api.get(`/pricing/products/${productId}/history`),
  });

  const chartData = data?.map(h => ({
    date: new Date(h.createdAt).toLocaleDateString('ru-TJ', { day: '2-digit', month: 'short' }),
    price: h.newPrice / 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData}>
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} unit=" сом" />
        <Tooltip
          formatter={(v: number) => [`${v.toFixed(2)} сом`, 'Цена']}
        />
        <Line type="monotone" dataKey="price" stroke="#2563eb" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

---

## Validation Rules

| Rule | Value |
|------|-------|
| Minimum price | 100 dirams (1 TJS) |
| Maximum price | 999_999_99 dirams (9,999,999.99 TJS) |
| Max product discount | 90% |
| Max coupon discount | 90% of cart |
| Flash sale max duration | 48 hours |
| Compare price must be | > effective price (otherwise hide) |
| Bulk rule min quantity | ≥ 2 |
| Commission range | 3% – 25% per category |

---

## Redis Caching

```typescript
// Cache effective price for 5 minutes (invalidate on price/discount change)
async function getCachedEffectivePrice(productId: string, qty = 1): Promise<PriceResult> {
  const key = `price:${productId}:${qty}`;
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const result = await calculateEffectivePrice(productId, qty);
  await redis.setex(key, 300, JSON.stringify(result));
  return result;
}

// Invalidate when price or discount changes
async function invalidatePriceCache(productId: string) {
  const keys = await redis.keys(`price:${productId}:*`);
  if (keys.length) await redis.del(...keys);
}
```

---

## Checklist

- [ ] All prices stored as integers (dirams), never floats
- [ ] `parseSomoniInput()` used on all user price inputs
- [ ] `formatSomoni()` used everywhere prices are displayed
- [ ] Commission calculation uses `× 100` integer math (no floats)
- [ ] Coupon usage enforced per-user with unique constraint
- [ ] Expired discounts/promotions deactivated by cron, not relied on for correctness
- [ ] `calculateEffectivePrice()` is the single source for final price — never inline
- [ ] Compare price only shown if it is greater than effective price
- [ ] Flash sales have a 48h cap to prevent "permanent sale" abuse
- [ ] Price history logged on every change with reason
- [ ] Redis price cache invalidated on any price/discount update
