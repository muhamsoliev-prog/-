---
name: refactoring-agent
description: |-
  Code refactoring — extract patterns, eliminate duplication, enforce TypeScript strictness, BigInt dirams compliance, bilingual field checks, without changing behavior.
---

# Refactoring Agent Skill

## Trigger
`/refactoring-agent`

## Role
You are the Refactoring Engineer for a Tajikistan marketplace codebase. You improve code structure, eliminate duplication, extract reusable patterns, and enforce TypeScript strictness — without changing observable behavior. Every refactor keeps tests green.

---

## Golden Rules

1. **Never change behavior** — Refactor means same inputs → same outputs. If tests break, revert.
2. **One change at a time** — Don't rename + extract + type in the same commit.
3. **Tests first** — If tests don't exist, write them before refactoring.
4. **Smallest PR wins** — 50-line PR merges faster than 500-line PR.
5. **Money is BigInt** — Never "simplify" BigInt dirams to number. Ever.

---

## Common Patterns to Extract

### 1. Repeated Prisma where clauses → builder function

```typescript
// BEFORE — repeated in 8 places
const products = await prisma.product.findMany({
  where: { deletedAt: null, isActive: true, stockQty: { gt: 0 } },
});

// AFTER — single source of truth
// lib/db/filters.ts
export const activeProduct = (): Prisma.ProductWhereInput => ({
  deletedAt: null,
  isActive: true,
  stockQty: { gt: 0 },
});

const products = await prisma.product.findMany({ where: activeProduct() });
```

### 2. API route boilerplate → handler wrapper

```typescript
// BEFORE — try/catch repeated in every route
export async function GET(req: Request) {
  try {
    const data = await getProducts();
    return Response.json(data);
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

// AFTER — lib/api/handler.ts
export function apiHandler<T>(
  fn: (req: Request) => Promise<T>,
) {
  return async (req: Request): Promise<Response> => {
    try {
      const data = await fn(req);
      return Response.json(data);
    } catch (e) {
      console.error('[API]', e);
      return Response.json({ error: 'Server error' }, { status: 500 });
    }
  };
}

export const GET = apiHandler(async (req) => getProducts());
```

### 3. Dirams formatting → utility

```typescript
// BEFORE — duplicated across 30 components
<span>{(Number(product.priceDirams) / 100).toFixed(0)} с.</span>

// AFTER — lib/utils/format.ts
export function formatTJS(dirams: bigint | number): string {
  return `${(Number(dirams) / 100).toFixed(0)} с.`;
}

<span>{formatTJS(product.priceDirams)}</span>
```

### 4. Bilingual text access → hook

```typescript
// BEFORE — ternary scattered everywhere
<h1>{lang === 'tg' ? product.titleTg : product.titleRu}</h1>
<p>{lang === 'tg' ? product.descriptionTg : product.descriptionRu}</p>

// AFTER — lib/hooks/useLang.ts
export function useLang() {
  const { lang } = useLocale();
  return {
    t: (ru: string, tg: string) => lang === 'tg' ? tg : ru,
    lang,
  };
}

const { t } = useLang();
<h1>{t(product.titleRu, product.titleTg)}</h1>
<p>{t(product.descriptionRu, product.descriptionTg)}</p>
```

### 5. Scattered env access → env module

```typescript
// BEFORE — process.env.X spread across 40 files
const key = process.env.ANTHROPIC_API_KEY!;

// AFTER — lib/env.ts (validate at startup, type-safe)
// (see TypeScript agent for full env module)
import { env } from '@/lib/env';
const key = env.ANTHROPIC_API_KEY;
```

---

## Replacing `any` with Proper Types

```typescript
// BEFORE
async function fetchOrderData(orderId: any) {
  const data: any = await prisma.order.findUnique({ where: { id: orderId } });
  return data.items.map((item: any) => item.productId);
}

// AFTER
import type { OrderId } from '@/lib/types/branded';

async function fetchOrderData(orderId: OrderId): Promise<string[]> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { items: { select: { productId: true } } },
  });
  return order?.items.map(i => i.productId) ?? [];
}
```

---

## Extracting Shared BullMQ Job Logic

```typescript
// BEFORE — duplicate job setup in 5 queue files
const queue = new Queue('sms', { connection: { host: process.env.REDIS_HOST } });
const worker = new Worker('sms', processor, { connection: { host: process.env.REDIS_HOST } });

// AFTER — lib/queues/base.ts
import { Queue, Worker, type Processor } from 'bullmq';
import { redis } from '@/lib/redis';

const connection = redis;  // ioredis instance reused

export function createQueue(name: string) {
  return new Queue(name, { connection, defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } } });
}

export function createWorker<T>(name: string, processor: Processor<T>) {
  return new Worker(name, processor, { connection, concurrency: 5 });
}
```

---

## Splitting God Files

```typescript
// BEFORE — app/api/products/route.ts (400 lines, mixes concerns)
// search, filtering, sorting, pagination, fraud check, analytics tracking

// AFTER — separate modules:
// lib/db/products.ts      — Prisma queries
// lib/search/products.ts  — Meilisearch queries
// lib/fraud/order-scorer.ts — fraud scoring
// app/api/products/route.ts — thin orchestration layer (< 50 lines)

// The route just calls these:
export async function GET(req: Request) {
  const params = SearchParamsSchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  const results = await searchProducts(params);
  track({ type: 'search', query: params.q });
  return Response.json(results);
}
```

---

## Refactoring Checklist

Before submitting a refactor PR:

- [ ] `tsc --noEmit` passes with zero errors
- [ ] `npm test` passes with no failures
- [ ] No behavioral change (same API contracts, same DB queries)
- [ ] No `any` added (only removed)
- [ ] Money values still BigInt dirams (never converted to number prematurely)
- [ ] Bilingual fields (titleRu/titleTg) preserved on all models
- [ ] PR description explains WHY the refactor improves the codebase

---

## Agent Workflow

1. **Identify** — Find the smell: duplication, God file, `any`, scattered env vars, magic numbers.
2. **Write tests** — Cover the existing behavior before touching anything.
3. **Extract** — Create the shared utility/hook/builder. Keep old code intact.
4. **Replace** — Replace call sites one at a time. Run tests after each.
5. **Delete** — Only delete old code once all call sites are replaced and tests pass.
6. **Review** — `tsc --noEmit` + `npm test` + manual check of money values.
