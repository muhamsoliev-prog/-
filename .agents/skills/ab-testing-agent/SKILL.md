# A/B Testing Agent Skill

## Trigger
`/ab-testing-agent`

## Role
You are the Experimentation Engineer for a Tajikistan marketplace. You design, run, and analyse A/B tests — from checkout button copy to recommendation algorithms — using deterministic bucketing, statistical significance testing, and safe rollout via feature flags. All experiments are server-side, COD-compatible, and bilingual (RU/TG).

---

## Experiment Design

```typescript
// lib/experiments/types.ts

export interface Experiment {
  id: string;                         // 'checkout-cta-v2'
  name: string;
  hypothesis: string;                 // what we expect to improve
  metric: MetricKey;                  // primary success metric
  guardMetrics: MetricKey[];          // must not degrade
  variants: Variant[];
  trafficPct: number;                 // 0-100 % of users in experiment
  startedAt: Date;
  endedAt?: Date;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'rolled_back';
  minSamplePerVariant: number;        // stop rule
  confidenceLevel: number;           // typically 0.95
}

export interface Variant {
  id: string;               // 'control' | 'treatment_a' | 'treatment_b'
  name: string;
  weight: number;           // 0-100, must sum to 100 across variants
  config: Record<string, unknown>;   // arbitrary config payload
}

export type MetricKey =
  | 'order_rate'            // orders / sessions
  | 'add_to_cart_rate'
  | 'checkout_completion'
  | 'avg_order_value_dirams'
  | 'revenue_per_session_dirams'
  | 'bounce_rate'
  | 'search_click_rate'
  | 'promo_code_usage'
  | 'return_rate';
```

---

## Deterministic Bucketing

```typescript
// lib/experiments/bucketing.ts
import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

// Deterministic: same userId + experimentId → always same variant
// No need to store per-user assignment (stateless)
export function assignVariant(userId: string, experiment: Experiment): Variant | null {
  // Check if user is in experiment traffic
  const trafficHash = hashBucket(`traffic:${experiment.id}:${userId}`);
  if (trafficHash >= experiment.trafficPct) return null;

  // Assign to variant by weight
  const variantHash = hashBucket(`variant:${experiment.id}:${userId}`);
  let cumulative = 0;
  for (const variant of experiment.variants) {
    cumulative += variant.weight;
    if (variantHash < cumulative) return variant;
  }
  return experiment.variants.at(-1) ?? null;
}

// Returns integer 0-99
function hashBucket(key: string): number {
  const hash = createHash('sha256').update(key).digest('hex');
  return parseInt(hash.slice(0, 8), 16) % 100;
}

// Cached experiment list (refresh every 60s)
let cachedExperiments: Experiment[] | null = null;
let cacheTs = 0;

export async function getRunningExperiments(): Promise<Experiment[]> {
  if (cachedExperiments && Date.now() - cacheTs < 60_000) return cachedExperiments;

  const rows = await prisma.experiment.findMany({
    where: { status: 'running' },
    include: { variants: true },
  });

  cachedExperiments = rows.map(r => ({
    ...r,
    variants: r.variants.sort((a, b) => a.weight - b.weight),
  })) as Experiment[];
  cacheTs = Date.now();
  return cachedExperiments;
}

// Get all active assignments for a user (used in page render)
export async function getUserAssignments(userId: string): Promise<Record<string, string>> {
  const experiments = await getRunningExperiments();
  const assignments: Record<string, string> = {};

  for (const exp of experiments) {
    const variant = assignVariant(userId, exp);
    if (variant) assignments[exp.id] = variant.id;
  }

  return assignments;
}
```

---

## Experiment Context (React)

```tsx
// lib/experiments/context.tsx
'use client';

import { createContext, useContext } from 'react';

interface ExperimentContextValue {
  assignments: Record<string, string>;   // { 'experiment-id': 'variant-id' }
}

const ExperimentContext = createContext<ExperimentContextValue>({ assignments: {} });

export function ExperimentProvider({
  assignments,
  children,
}: {
  assignments: Record<string, string>;
  children: React.ReactNode;
}) {
  return (
    <ExperimentContext.Provider value={{ assignments }}>
      {children}
    </ExperimentContext.Provider>
  );
}

export function useVariant(experimentId: string): string {
  const { assignments } = useContext(ExperimentContext);
  return assignments[experimentId] ?? 'control';
}

// Usage in any component:
// const variant = useVariant('checkout-cta-v2');
// if (variant === 'treatment_a') return <ButtonA />;
// return <ButtonControl />;
```

---

## Server-Side Assignment (Next.js Layout)

```typescript
// app/layout.tsx — inject assignments server-side
import { getUserAssignments } from '@/lib/experiments/bucketing';
import { getAuthUser } from '@/lib/auth';
import { ExperimentProvider } from '@/lib/experiments/context';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  const assignments = user ? await getUserAssignments(user.id) : {};

  return (
    <html lang="ru">
      <body>
        <ExperimentProvider assignments={assignments}>
          {children}
        </ExperimentProvider>
      </body>
    </html>
  );
}
```

---

## Event Tracking for Experiments

```typescript
// lib/experiments/tracking.ts
import { redis } from '@/lib/redis';
import { prisma } from '@/lib/prisma';

export async function trackExposure(
  userId: string,
  experimentId: string,
  variantId: string,
): Promise<void> {
  const dayKey = new Date().toISOString().slice(0, 10);
  // Count exposures per variant per day in Redis
  await redis.hincrby(`exp:${experimentId}:${dayKey}:${variantId}`, 'exposures', 1);
  // Unique users per variant
  await redis.sadd(`exp:${experimentId}:users:${variantId}`, userId);
}

export async function trackConversion(
  userId: string,
  experimentId: string,
  variantId: string,
  metric: MetricKey,
  value: number = 1,   // for rate metrics: 1; for value metrics: dirams
): Promise<void> {
  const dayKey = new Date().toISOString().slice(0, 10);
  await redis.hincrbyfloat(`exp:${experimentId}:${dayKey}:${variantId}`, `metric:${metric}`, value);
  // Unique converters
  await redis.sadd(`exp:${experimentId}:converted:${variantId}:${metric}`, userId);
}

// Call these automatically from analytics tracker:
// On page load: trackExposure(userId, experimentId, variantId)
// On order_placed: trackConversion(userId, expId, variantId, 'order_rate')
// On order_placed: trackConversion(userId, expId, variantId, 'revenue_per_session_dirams', orderDirams)
```

---

## Statistical Analysis

```typescript
// lib/experiments/stats.ts

export interface ExperimentResults {
  experimentId: string;
  variants: VariantStats[];
  winner: string | null;
  significant: boolean;
  confidence: number;
  recommendation: string;
}

export interface VariantStats {
  variantId: string;
  users: number;
  conversions: number;
  conversionRate: number;
  avgValueDirams?: number;
  relativeUplift?: number;     // vs control
  pValue?: number;
  significant?: boolean;
}

// Two-proportion z-test for conversion rates
export function zTest(
  controlConversions: number, controlUsers: number,
  treatmentConversions: number, treatmentUsers: number,
): { pValue: number; significant: boolean; uplift: number } {
  if (controlUsers === 0 || treatmentUsers === 0) {
    return { pValue: 1, significant: false, uplift: 0 };
  }

  const p1 = controlConversions / controlUsers;
  const p2 = treatmentConversions / treatmentUsers;
  const pPool = (controlConversions + treatmentConversions) / (controlUsers + treatmentUsers);
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / controlUsers + 1 / treatmentUsers));

  if (se === 0) return { pValue: 1, significant: false, uplift: 0 };

  const z = Math.abs((p2 - p1) / se);
  // Approximate p-value from z-score (two-tailed)
  const pValue = 2 * (1 - normalCDF(z));
  const uplift = p1 > 0 ? (p2 - p1) / p1 : 0;

  return { pValue, significant: pValue < 0.05, uplift };
}

function normalCDF(z: number): number {
  const t = 1 / (1 + 0.2315419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.7814779 + t * (-1.8212560 + t * 1.3302744))));
  return z > 0 ? 1 - p : p;
}

// Minimum detectable effect — sample size calculator
export function requiredSampleSize(
  baselineRate: number,
  minDetectableEffect: number,  // e.g. 0.05 for 5% relative lift
  alpha = 0.05,
  power = 0.80,
): number {
  const p1 = baselineRate;
  const p2 = baselineRate * (1 + minDetectableEffect);
  const z_alpha = 1.96;   // alpha = 0.05 two-tailed
  const z_beta = 0.842;   // power = 0.80
  const n = Math.ceil(
    (z_alpha * Math.sqrt(2 * p1 * (1 - p1)) + z_beta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2
    / (p2 - p1) ** 2
  );
  return n;
}
```

---

## Experiment Examples for TJ Marketplace

```typescript
// lib/experiments/presets.ts — ready-to-launch experiments

export const EXPERIMENT_PRESETS = [
  {
    id: 'checkout-cta-text',
    name: 'CTA на кнопке оформления',
    hypothesis: 'Более конкретный текст кнопки повысит checkout completion',
    metric: 'checkout_completion' as MetricKey,
    variants: [
      { id: 'control', name: 'Оформить заказ', weight: 50, config: { ctaText: { ru: 'Оформить заказ', tg: 'Расмӣ кардани фармоиш' } } },
      { id: 'treatment', name: 'Купить — оплата при получении', weight: 50, config: { ctaText: { ru: 'Купить — оплата при получении', tg: 'Харидан — пардохт ҳангоми қабул' } } },
    ],
    trafficPct: 50,
    minSamplePerVariant: 500,
  },
  {
    id: 'product-price-display',
    name: 'Отображение скидки',
    hypothesis: 'Показ % экономии рядом с ценой увеличит add-to-cart rate',
    metric: 'add_to_cart_rate' as MetricKey,
    variants: [
      { id: 'control', name: 'Только цена', weight: 50, config: { showSavingsPct: false } },
      { id: 'treatment', name: 'Цена + % экономии', weight: 50, config: { showSavingsPct: true } },
    ],
    trafficPct: 100,
    minSamplePerVariant: 1000,
  },
  {
    id: 'rec-algorithm',
    name: 'Алгоритм рекомендаций',
    hypothesis: 'Увеличение веса коллаборативной фильтрации с 50% до 65% повысит CVR',
    metric: 'order_rate' as MetricKey,
    variants: [
      { id: 'control', name: 'Collab 50%', weight: 50, config: { collabWeight: 0.50, contentWeight: 0.25, trendingWeight: 0.15, seasonalWeight: 0.10 } },
      { id: 'treatment', name: 'Collab 65%', weight: 50, config: { collabWeight: 0.65, contentWeight: 0.15, trendingWeight: 0.10, seasonalWeight: 0.10 } },
    ],
    trafficPct: 30,
    minSamplePerVariant: 2000,
  },
  {
    id: 'free-delivery-threshold',
    name: 'Порог бесплатной доставки',
    hypothesis: 'Снижение порога с 500 до 350 TJS увеличит avg order value',
    metric: 'avg_order_value_dirams' as MetricKey,
    variants: [
      { id: 'control', name: '500 с.', weight: 50, config: { freeDeliveryThresholdDirams: 50_000 } },
      { id: 'treatment', name: '350 с.', weight: 50, config: { freeDeliveryThresholdDirams: 35_000 } },
    ],
    trafficPct: 50,
    minSamplePerVariant: 300,
  },
];
```

---

## Prisma Models

```prisma
model Experiment {
  id                  String    @id
  name                String
  hypothesis          String
  metric              String
  guardMetrics        String[]
  trafficPct          Int
  status              String    @default("draft")
  minSamplePerVariant Int
  confidenceLevel     Float     @default(0.95)
  startedAt           DateTime?
  endedAt             DateTime?
  createdAt           DateTime  @default(now())
  variants            ExperimentVariant[]

  @@index([status])
}

model ExperimentVariant {
  id           String     @id @default(cuid())
  experimentId String
  variantId    String
  name         String
  weight       Int
  config       Json
  experiment   Experiment @relation(fields: [experimentId], references: [id])

  @@unique([experimentId, variantId])
}
```

---

## Agent Workflow

1. **Design** — Define hypothesis, primary metric, guard metrics, and minimum sample size via `requiredSampleSize()`.
2. **Launch** — Set `status = 'running'`, `trafficPct` typically starts at 10% then ramps.
3. **Track** — `trackExposure()` on first page view with experiment; `trackConversion()` on metric event.
4. **Analyse** — Run `zTest()` daily. Significant at p < 0.05 with both variants > `minSamplePerVariant`.
5. **Guard rails** — If guard metric (e.g. `return_rate`) degrades > 10%, auto-pause experiment.
6. **Ship or rollback** — Winner variant → update code + `status = 'completed'`. Loser → `status = 'rolled_back'`.
7. **Never** — Run two experiments on same user flow concurrently (confounds results).
8. **COD note** — For COD order experiments, conversion signal is `order_placed` not `payment_confirmed` since COD pays on delivery. Measure `return_rate` as guard metric.
