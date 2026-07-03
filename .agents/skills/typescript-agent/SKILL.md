---
name: typescript-agent
description: |-
  TypeScript strict mode specialist — advanced types, generics, utility types, discriminated unions, BigInt dirams type safety, and Zod schema integration.
---

# TypeScript Agent Skill

## Trigger
`/typescript-agent`

## Role
You are the TypeScript Engineer for a Tajikistan marketplace. You enforce strict typing, eliminate `any`, design branded types for domain values (dirams, phone, userId), and configure tsconfig for Next.js 14 App Router with maximum safety. All monetary values are `bigint` or `Dirams` branded integers — never `number` for money.

---

## tsconfig.json (strict baseline)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

## Branded Types for Domain Safety

```typescript
// lib/types/branded.ts

// Opaque brand pattern — zero runtime cost
declare const brand: unique symbol;
type Brand<T, B> = T & { readonly [brand]: B };

// Monetary — always integer dirams (1 TJS = 100 dirams)
export type Dirams = Brand<bigint, 'Dirams'>;
export const dirams = (n: bigint): Dirams => n as Dirams;
export const tjsToDir = (tjs: number): Dirams => dirams(BigInt(Math.round(tjs * 100)));
export const dirToTjs = (d: Dirams): number => Number(d) / 100;

// IDs — prevent mixing userId with orderId etc.
export type UserId   = Brand<string, 'UserId'>;
export type OrderId  = Brand<string, 'OrderId'>;
export type ProductId = Brand<string, 'ProductId'>;
export type SellerId = Brand<string, 'SellerId'>;

export const userId   = (s: string): UserId   => s as UserId;
export const orderId  = (s: string): OrderId  => s as OrderId;
export const productId = (s: string): ProductId => s as ProductId;
export const sellerId = (s: string): SellerId => s as SellerId;

// Phone — TJ format +992XXXXXXXXX
export type TJPhone = Brand<string, 'TJPhone'>;
export function parseTJPhone(raw: string): TJPhone {
  const digits = raw.replace(/\D/g, '');
  const normalized = digits.startsWith('992') ? `+${digits}` : `+992${digits}`;
  if (!/^\+992[0-9]{9}$/.test(normalized)) throw new Error(`Invalid TJ phone: ${raw}`);
  return normalized as TJPhone;
}

// Region
export type RegionId = 'dushanbe' | 'khujand' | 'kulob' | 'qurghonteppa' | 'gbao' | 'other';

// Language
export type Lang = 'ru' | 'tg';

// Bilingual string pair — enforce both languages always present
export interface BilingualText {
  ru: string;
  tg: string;
}
export const bilingualText = (ru: string, tg: string): BilingualText => ({ ru, tg });
```

---

## Result Type (no thrown errors)

```typescript
// lib/types/result.ts

export type Ok<T>  = { ok: true;  value: T };
export type Err<E> = { ok: false; error: E };
export type Result<T, E = string> = Ok<T> | Err<E>;

export const ok  = <T>(value: T): Ok<T>   => ({ ok: true,  value });
export const err = <E>(error: E): Err<E>  => ({ ok: false, error });

// Unwrap or throw
export function unwrap<T>(r: Result<T>): T {
  if (!r.ok) throw new Error(r.error);
  return r.value;
}

// Usage:
// async function placeOrder(id: OrderId): Promise<Result<Order, 'NOT_FOUND' | 'FRAUD'>> {
//   const order = await prisma.order.findUnique({ where: { id } });
//   if (!order) return err('NOT_FOUND');
//   return ok(order);
// }
```

---

## Zod Schemas for API Validation

```typescript
// lib/schemas/order.ts
import { z } from 'zod';

const TJ_PHONE_REGEX = /^\+992[0-9]{9}$/;

export const CreateOrderSchema = z.object({
  productIds: z.array(z.string().cuid()).min(1).max(50),
  addressId:  z.string().cuid(),
  promoCode:  z.string().max(32).optional(),
  paymentMethod: z.enum(['cod', 'card', 'points']),
  lang: z.enum(['ru', 'tg']).default('ru'),
});

export const PhoneSchema = z.string().regex(TJ_PHONE_REGEX, 'Номер телефона должен начинаться с +992');

export const PaginationSchema = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

// Validated API handler helper
export function validateBody<T>(schema: z.ZodType<T>, body: unknown): Result<T> {
  const result = schema.safeParse(body);
  return result.success
    ? ok(result.data)
    : err(result.error.errors.map(e => e.message).join(', '));
}
```

---

## Generic Pagination

```typescript
// lib/types/pagination.ts

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
}

export function buildPage<T>(items: T[], total: number, page: number, limit: number): Page<T> {
  return { items, total, page, limit, hasNext: page * limit < total };
}

// Prisma helper
export function paginate(page: number, limit: number) {
  return { skip: (page - 1) * limit, take: limit };
}
```

---

## Discriminated Unions for Event System

```typescript
// lib/types/events.ts

export type DomainEvent =
  | { type: 'order.placed';    orderId: OrderId;  userId: UserId; totalDirams: Dirams }
  | { type: 'order.cancelled'; orderId: OrderId;  reason: string }
  | { type: 'review.submitted'; reviewId: string; userId: UserId; productId: ProductId; rating: 1|2|3|4|5 }
  | { type: 'user.registered'; userId: UserId; phone: TJPhone; regionId: RegionId }
  | { type: 'promo.applied';   orderId: OrderId;  code: string; discountDirams: Dirams };

// Exhaustive handler enforced by TypeScript
export function handleEvent(event: DomainEvent): void {
  switch (event.type) {
    case 'order.placed':    /* ... */ break;
    case 'order.cancelled': /* ... */ break;
    case 'review.submitted': /* ... */ break;
    case 'user.registered': /* ... */ break;
    case 'promo.applied':   /* ... */ break;
    default:
      event satisfies never;
  }
}
```

---

## Utility Types

```typescript
// lib/types/utils.ts

// Deep readonly
export type Immutable<T> = { readonly [K in keyof T]: Immutable<T[K]> };

// Non-nullable deep
export type NonNullableDeep<T> = { [K in keyof T]-?: NonNullableDeep<NonNullable<T[K]>> };

// Pick & require subset
export type RequiredPick<T, K extends keyof T> = Required<Pick<T, K>> & Omit<T, K>;

// Awaited return type shorthand
export type AsyncReturn<T extends (...args: never[]) => Promise<unknown>> =
  Awaited<ReturnType<T>>;

// Env variable checker (throws at startup if missing)
export function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}
```

---

## Type-Safe Environment

```typescript
// lib/env.ts — single source of truth for env vars
import { requireEnv } from './types/utils';

export const env = {
  DATABASE_URL:       requireEnv('DATABASE_URL'),
  REDIS_URL:          requireEnv('REDIS_URL'),
  MEILISEARCH_HOST:   requireEnv('MEILISEARCH_HOST'),
  MEILISEARCH_KEY:    requireEnv('MEILISEARCH_KEY'),
  ANTHROPIC_API_KEY:  requireEnv('ANTHROPIC_API_KEY'),
  BEELINE_SMS_KEY:    requireEnv('BEELINE_SMS_KEY'),
  VAPID_PUBLIC:       requireEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY'),
  VAPID_PRIVATE:      requireEnv('VAPID_PRIVATE_KEY'),
  TELEGRAM_BOT_TOKEN: requireEnv('TELEGRAM_BOT_TOKEN'),
  NEXTAUTH_SECRET:    requireEnv('NEXTAUTH_SECRET'),
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  IS_PROD: process.env.NODE_ENV === 'production',
} as const;
```

---

## Agent Workflow

1. **Audit** — Run `tsc --noEmit` and fix all errors before adding new features.
2. **No `any`** — Replace with `unknown` + type guard, or the correct narrow type.
3. **Money** — All monetary values as `Dirams` (bigint brand). Convert to TJS number only at the API response boundary.
4. **IDs** — Use branded `UserId`, `OrderId`, etc. to prevent cross-domain ID confusion.
5. **Results** — Use `Result<T, E>` instead of throwing for expected error paths.
6. **Zod** — Validate all API inputs at the boundary; trust internal types everywhere else.
7. **Exhaustiveness** — Use `satisfies never` in switch defaults to catch unhandled cases at compile time.
