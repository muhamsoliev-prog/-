---
name: docs
description: |-
  Code documentation skill — JSDoc/TSDoc for TypeScript, README generation,
  API endpoint documentation, React component prop docs, bilingual (RU+TG) comments.
  Trigger: whenever asked to "document", "add docs", "write JSDoc", "document API",
  "create README", or "describe props" for any file in the project.
---

# Documentation Skill

## Trigger
`/docs` — or when user asks to document code, write JSDoc, generate README, or describe an API.

## Core Rules

1. **Comments only for non-obvious WHY** — never explain WHAT (identifiers already do that)
2. **Bilingual descriptions** — public APIs get `@description` in both Russian and English
3. **No multi-paragraph docstrings** — one concise summary line maximum
4. **Types from TypeScript** — never repeat types in JSDoc when TS already has them

---

## TypeScript / TSDoc

```typescript
/**
 * Converts BigInt dirams to TJS string for display.
 * 1 TJS = 100 dirams; uses `Number()` only at UI boundary.
 */
export function formatTJS(dirams: bigint): string {
  return (Number(dirams) / 100).toLocaleString('ru-TJ')
}

/**
 * Applies a percentage discount. Clamps to 0 — never negative.
 * @param priceDirams - Original price in dirams
 * @param discountPct - Percentage 0–100
 */
export function applyDiscount(priceDirams: bigint, discountPct: number): bigint {
  const discount = BigInt(Math.round(Number(priceDirams) * discountPct / 100))
  return priceDirams > discount ? priceDirams - discount : 0n
}
```

### When NOT to add JSDoc
```typescript
// ❌ Obvious — no comment needed
const isLoading = ref(false)
const items = await prisma.product.findMany({ take: 20 })

// ✅ Non-obvious WHY — comment worthwhile
// Tajikistan seismic zone 8 — SNiP requires minimum 14mm rebar
const MIN_REBAR_MM = 14
```

---

## React Component Props

Use TSDoc on the interface, not on the component:

```tsx
/** Props for the ProductCard component. */
interface ProductCardProps {
  /** Bilingual product (rendered in current locale). */
  product: { titleRu: string; titleTg: string; priceDirams: bigint }
  /** Current locale — determines which language field to render. */
  lang: 'ru' | 'tg'
  /** Called when the user taps "Add to cart". Receives product id. */
  onAddToCart?: (id: string) => void
}
```

---

## API Route Documentation

Document Route Handlers with a short JSDoc block + inline Zod schema:

```typescript
/**
 * POST /api/orders
 * Creates an order with COD or card payment.
 * @body { cartId, paymentMethod, deliveryAddressId }
 * @returns { orderId, status: 'pending' }
 */
export async function POST(request: Request) {
  const schema = z.object({
    cartId:            z.string().cuid(),
    paymentMethod:     z.enum(['cod', 'card']),  // COD must be first option in UI
    deliveryAddressId: z.string().cuid(),
  })
  // ...
}
```

---

## README Template

When generating a README for a feature module:

```markdown
# <ФичаRu> / <ФичаTg>

Short description (1-2 sentences).

## Setup

```bash
# Required env vars
ANTHROPIC_API_KEY=...
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/feature` | Creates a resource |
| GET  | `/api/feature/:id` | Returns resource by id |

## Data Model

Key fields (BigInt dirams, bilingual fields):

```prisma
model Feature {
  titleRu     String
  titleTg     String
  priceDirams BigInt
}
```

## Usage

```tsx
import { FeatureComponent } from '@/components/features/feature'
<FeatureComponent lang="ru" />
```
```

---

## Bilingual JSDoc

For any public exported function that will be called from UI:

```typescript
/**
 * RU: Вычисляет стоимость доставки в dirams на основе зоны и веса.
 * TG: Арзиши расониданро дар dirams аз рӯи минтақа ва вазн ҳисоб мекунад.
 */
export function calcDeliveryCost(zoneId: string, weightKg: number): bigint { ... }
```

---

## Checklist before marking "documented"

- [ ] All exported functions have one-line TSDoc summary
- [ ] Non-obvious WHY comments added (not WHAT)
- [ ] Zod schemas have inline field comments for validation constraints
- [ ] README covers setup, API table, data model, usage example
- [ ] No type duplication between TSDoc and TypeScript signatures
