---
name: data-analysis
description: |-
  Data analysis for e-commerce and construction marketplace — Prisma aggregate queries,
  BigInt dirams financial metrics (GMV, AOV, LTV), Recharts dashboards, BullMQ queue stats,
  Meilisearch analytics. All monetary values in BigInt dirams (1 TJS = 100 dirams).
  Trigger: whenever asked to "analyze", "show stats", "build dashboard", "calculate metrics",
  "chart sales", or "revenue report".
---

# Data Analysis Skill

## Trigger
`/data-analysis` — or when user asks for analytics, metrics, reports, charts, or dashboards.

---

## Critical: BigInt dirams in aggregations

Prisma returns `Decimal` from `_sum`, `_avg` — always convert explicitly:

```typescript
// ✅ Prisma aggregate → BigInt dirams
const result = await prisma.order.aggregate({
  _sum: { totalDirams: true },
  _count: { id: true },
  where: { status: 'DELIVERED', createdAt: { gte: startDate } },
})

const gmvDirams: bigint = BigInt(result._sum.totalDirams?.toString() ?? '0')
const orderCount: number = result._count.id

// ✅ AOV — average order value
const aovDirams: bigint = orderCount > 0 ? gmvDirams / BigInt(orderCount) : 0n

// ✅ Display only (never store as number)
const gmvTJS = Number(gmvDirams) / 100
```

---

## Key Metrics

### GMV — Gross Merchandise Value
```typescript
async function getGMV(from: Date, to: Date): Promise<bigint> {
  const res = await prisma.order.aggregate({
    _sum: { totalDirams: true },
    where: { status: { in: ['DELIVERED', 'SHIPPED'] }, createdAt: { gte: from, lte: to } },
  })
  return BigInt(res._sum.totalDirams?.toString() ?? '0')
}
```

### Conversion Rate
```typescript
async function getConversionRate(from: Date, to: Date) {
  const [orders, sessions] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: from, lte: to } } }),
    prisma.analyticsEvent.count({
      where: { event: 'session_start', createdAt: { gte: from, lte: to } },
    }),
  ])
  return sessions > 0 ? (orders / sessions) * 100 : 0
}
```

### COD vs Card Split
```typescript
async function getPaymentSplit(from: Date, to: Date) {
  const byMethod = await prisma.order.groupBy({
    by: ['paymentMethod'],
    _count: { id: true },
    _sum: { totalDirams: true },
    where: { createdAt: { gte: from, lte: to } },
    take: 10,
  })
  // COD should be ~60% — alert if it drops below 50%
  return byMethod.map(m => ({
    method: m.paymentMethod,
    count: m._count.id,
    revenueDirams: BigInt(m._sum.totalDirams?.toString() ?? '0'),
  }))
}
```

---

## Prisma Aggregation Patterns

```typescript
// Daily revenue timeseries (last 30 days)
const daily = await prisma.$queryRaw<{ day: Date; revenueDirams: bigint }[]>`
  SELECT
    DATE_TRUNC('day', created_at) AS day,
    SUM(total_dirams)::bigint AS "revenueDirams"
  FROM orders
  WHERE created_at >= NOW() - INTERVAL '30 days'
    AND status IN ('DELIVERED', 'SHIPPED')
  GROUP BY 1
  ORDER BY 1
`

// Top products by revenue
const topProducts = await prisma.orderItem.groupBy({
  by: ['productId'],
  _sum: { subtotalDirams: true },
  _count: { id: true },
  orderBy: { _sum: { subtotalDirams: 'desc' } },
  take: 10,
})
```

---

## Recharts Dashboard Component

```tsx
// components/features/analytics/RevenueDashboard.tsx
'use client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface DailyRevenue {
  day: string           // 'YYYY-MM-DD'
  revenueTJS: number    // converted from dirams for display only
}

interface Props {
  data: DailyRevenue[]
  lang?: 'ru' | 'tg'
}

export function RevenueDashboard({ data, lang = 'ru' }: Props) {
  const label = lang === 'ru' ? 'Выручка (TJS)' : 'Даромад (TJS)'

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={v => `${v.toLocaleString('ru')} ₸`} width={80} />
          <Tooltip
            formatter={(v: number) => [`${v.toLocaleString('ru')} TJS`, label]}
            labelFormatter={d => new Date(d).toLocaleDateString('ru')}
          />
          <Line type="monotone" dataKey="revenueTJS" stroke="#6366f1" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

---

## API Route: Analytics Endpoint

```typescript
// app/api/analytics/revenue/route.ts
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const days = Math.min(parseInt(searchParams.get('days') ?? '30'), 365)

  const from = new Date(Date.now() - days * 86_400_000)

  const [gmvResult, orderCount, topProducts] = await Promise.all([
    prisma.order.aggregate({
      _sum: { totalDirams: true },
      where: { status: { in: ['DELIVERED', 'SHIPPED'] }, createdAt: { gte: from } },
    }),
    prisma.order.count({ where: { createdAt: { gte: from } } }),
    prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { subtotalDirams: true },
      orderBy: { _sum: { subtotalDirams: 'desc' } },
      take: 10,
    }),
  ])

  const gmvDirams = BigInt(gmvResult._sum.totalDirams?.toString() ?? '0')
  const aovDirams = orderCount > 0 ? gmvDirams / BigInt(orderCount) : 0n

  return Response.json({
    gmvDirams:   gmvDirams.toString(),
    aovDirams:   aovDirams.toString(),
    orderCount,
    topProducts: topProducts.map(p => ({
      productId:     p.productId,
      revenueDirams: BigInt(p._sum.subtotalDirams?.toString() ?? '0').toString(),
    })),
  })
}
```

---

## BullMQ Queue Stats

```typescript
import { Queue } from 'bullmq'
import { redis } from '@/lib/redis'

async function getQueueStats(queueName: string) {
  const q = new Queue(queueName, { connection: redis })
  const [waiting, active, completed, failed] = await Promise.all([
    q.getWaitingCount(),
    q.getActiveCount(),
    q.getCompletedCount(),
    q.getFailedCount(),
  ])
  return { waiting, active, completed, failed, successRate: completed / (completed + failed) * 100 }
}
```

---

## Meilisearch Search Analytics

```typescript
import { meilisearch } from '@/lib/search'

async function getSearchStats() {
  const stats = await meilisearch.getStats()
  return Object.entries(stats.indexes).map(([name, info]) => ({
    index: name,
    documents: info.numberOfDocuments,
    isIndexing: info.isIndexing,
  }))
}
```

---

## Checklist

- [ ] All money values stored/computed as `bigint` dirams
- [ ] `Number(dirams) / 100` only at display layer (React components)
- [ ] Prisma aggregates use `.toString()` before `BigInt()` conversion
- [ ] `findMany` and `groupBy` always have `take` limit
- [ ] Date ranges validated (not longer than 1 year)
- [ ] Dashboard components use `ResponsiveContainer` (mobile-first)
