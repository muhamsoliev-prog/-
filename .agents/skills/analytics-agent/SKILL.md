# Analytics Agent Skill

## Trigger
`/analytics-agent`

## Role
You are the Analytics Engineer for a Tajikistan e-commerce marketplace. You implement event tracking, funnel analysis, cohort retention, revenue dashboards, seller KPIs, regional breakdowns, and real-time counters — all stored in PostgreSQL + Redis, rendered in Next.js with Recharts, and aggregated nightly via BullMQ. All monetary values are integer dirams (1 TJS = 100 dirams).

---

## TJ Analytics Context

```typescript
const TJ_ANALYTICS_CONTEXT = {
  currency: 'TJS',
  dirams_per_tjs: 100,
  regions: ['dushanbe', 'khujand', 'kulob', 'qurghonteppa', 'gbao', 'other'],
  paymentMethods: ['cod', 'card', 'wallet'],
  codShare: 0.60,
  mobileShare: 0.82,
  languages: ['ru', 'tg'],
  fiscalYearStart: 'january',
  peakHours_utc5: [20, 21, 22],    // 8–10pm Dushanbe time
  weeklyPeak: 'saturday',
  seasonalPeaks: ['navruz_march', 'construction_apr_sep', 'back_to_school_aug', 'new_year_dec'],
};
```

---

## Event Schema

```typescript
// lib/analytics/events.ts

export type AnalyticsEvent =
  // Discovery
  | 'page_view'
  | 'search_query'
  | 'search_click'
  | 'category_browse'
  | 'banner_click'
  // Product
  | 'product_view'
  | 'product_image_swipe'
  | 'review_read'
  | 'share_product'
  // Funnel
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'wishlist_add'
  | 'checkout_start'
  | 'checkout_address'
  | 'checkout_payment'
  | 'order_placed'
  | 'order_cancelled'
  | 'order_delivered'
  | 'order_returned'
  // Engagement
  | 'promo_code_applied'
  | 'promo_code_failed'
  | 'push_subscribed'
  | 'push_clicked'
  | 'telegram_channel_click'
  | 'referral_link_click'
  // Seller
  | 'seller_profile_view'
  | 'seller_chat_open';

export interface AnalyticsEventPayload {
  event: AnalyticsEvent;
  userId?: string;
  sessionId: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  platform: 'android' | 'ios' | 'web';
  lang: 'ru' | 'tg';
  regionId?: string;
  // Context properties
  productId?: string;
  categoryId?: string;
  searchQuery?: string;
  orderId?: string;
  amountDirams?: number;        // integer dirams only
  promoCode?: string;
  referralSource?: string;      // 'telegram' | 'sms' | 'organic' | 'direct'
  pageUrl?: string;
  // Timestamps
  ts: number;                   // Unix ms
}
```

---

## Event Ingestion API

```typescript
// app/api/analytics/event/route.ts
import { NextRequest } from 'next/server';
import { redis } from '@/lib/redis';
import { analyticsQueue } from '@/lib/queues/analytics';

export const runtime = 'nodejs';

// Hot path — fast Redis write, async Postgres via BullMQ
export async function POST(req: NextRequest) {
  const payload: AnalyticsEventPayload = await req.json();

  // Basic validation
  if (!payload.event || !payload.sessionId || !payload.ts) {
    return Response.json({ ok: false }, { status: 400 });
  }

  // Sanitise: monetary value must be integer
  if (payload.amountDirams !== undefined) {
    payload.amountDirams = Math.round(payload.amountDirams);
  }

  const dayKey = new Date().toISOString().slice(0, 10);   // YYYY-MM-DD

  // Real-time counters in Redis (TTL 8 days)
  await Promise.all([
    redis.hincrby(`analytics:events:${dayKey}`, payload.event, 1),
    payload.productId && redis.zincrby(`analytics:product_views:${dayKey}`, 1, payload.productId),
    payload.categoryId && redis.zincrby(`analytics:category_views:${dayKey}`, 1, payload.categoryId),
    payload.searchQuery && redis.zincrby(`analytics:searches:${dayKey}`, 1, payload.searchQuery.toLowerCase()),
    payload.regionId && redis.hincrby(`analytics:regions:${dayKey}`, payload.regionId, 1),
    payload.userId && redis.sadd(`analytics:dau:${dayKey}`, payload.userId),
  ].filter(Boolean));

  // Async DB write
  await analyticsQueue.add('persist-event', payload, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2_000 },
  });

  return Response.json({ ok: true });
}
```

---

## Prisma Models

```prisma
// prisma/schema.prisma additions

model AnalyticsEvent {
  id             String   @id @default(cuid())
  event          String
  userId         String?
  sessionId      String
  deviceType     String
  platform       String
  lang           String
  regionId       String?
  productId      String?
  categoryId     String?
  searchQuery    String?
  orderId        String?
  amountDirams   BigInt?
  promoCode      String?
  referralSource String?
  pageUrl        String?
  ts             DateTime

  @@index([event, ts])
  @@index([userId, ts])
  @@index([productId, event])
  @@index([ts])
  @@index([regionId, ts])
}

model DailyMetrics {
  id                    String   @id @default(cuid())
  date                  DateTime @db.Date
  dau                   Int      @default(0)
  mau                   Int      @default(0)
  newUsers              Int      @default(0)
  sessions              Int      @default(0)
  orders                Int      @default(0)
  revenueDirams         BigInt   @default(0)
  avgOrderValueDirams   BigInt   @default(0)
  codOrders             Int      @default(0)
  cardOrders            Int      @default(0)
  cancelledOrders       Int      @default(0)
  returnedOrders        Int      @default(0)
  productViews          Int      @default(0)
  addToCartCount        Int      @default(0)
  checkoutStartCount    Int      @default(0)
  orderPlacedCount      Int      @default(0)

  @@unique([date])
  @@index([date])
}

model ProductMetrics {
  id             String   @id @default(cuid())
  date           DateTime @db.Date
  productId      String
  views          Int      @default(0)
  addToCart      Int      @default(0)
  orders         Int      @default(0)
  revenueDirams  BigInt   @default(0)
  wishlistAdds   Int      @default(0)
  ctr            Float    @default(0)   // click-through rate from search

  @@unique([date, productId])
  @@index([productId, date])
}

model SellerMetrics {
  id              String   @id @default(cuid())
  date            DateTime @db.Date
  sellerId        String
  orders          Int      @default(0)
  revenueDirams   BigInt   @default(0)
  cancelledOrders Int      @default(0)
  returnedOrders  Int      @default(0)
  avgRating       Float    @default(0)
  newListings     Int      @default(0)

  @@unique([date, sellerId])
  @@index([sellerId, date])
}

model CohortRetention {
  id             String   @id @default(cuid())
  cohortMonth    DateTime @db.Date   // first month of the cohort
  retentionMonth DateTime @db.Date   // the observed month
  cohortSize     Int
  activeUsers    Int
  retentionPct   Float

  @@unique([cohortMonth, retentionMonth])
  @@index([cohortMonth])
}
```

---

## Nightly Aggregation Worker

```typescript
// workers/analytics.worker.ts
import { Worker, Queue } from 'bullmq';
import { redis } from '@/lib/redis';
import { prisma } from '@/lib/prisma';

export const analyticsQueue = new Queue('analytics', { connection: redis });

export async function scheduleAnalyticsJobs() {
  // Nightly aggregation at 01:00 UTC (06:00 Dushanbe)
  await analyticsQueue.add('aggregate-daily', {}, {
    repeat: { cron: '0 1 * * *' },
    jobId: 'aggregate-daily',
  });
  // Cohort retention — first day of month
  await analyticsQueue.add('compute-cohorts', {}, {
    repeat: { cron: '0 2 1 * *' },
    jobId: 'compute-cohorts',
  });
}

new Worker('analytics', async (job) => {
  switch (job.name) {
    case 'persist-event':
      await persistEvent(job.data);
      break;
    case 'aggregate-daily':
      await aggregateYesterday();
      break;
    case 'compute-cohorts':
      await computeCohortRetention();
      break;
  }
}, { connection: redis, concurrency: 10 });

async function persistEvent(payload: AnalyticsEventPayload) {
  await prisma.analyticsEvent.create({
    data: {
      event: payload.event,
      userId: payload.userId,
      sessionId: payload.sessionId,
      deviceType: payload.deviceType,
      platform: payload.platform,
      lang: payload.lang,
      regionId: payload.regionId,
      productId: payload.productId,
      categoryId: payload.categoryId,
      searchQuery: payload.searchQuery,
      orderId: payload.orderId,
      amountDirams: payload.amountDirams ? BigInt(payload.amountDirams) : null,
      promoCode: payload.promoCode,
      referralSource: payload.referralSource,
      pageUrl: payload.pageUrl,
      ts: new Date(payload.ts),
    },
  });
}

async function aggregateYesterday() {
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  yesterday.setUTCHours(0, 0, 0, 0);
  const today = new Date(yesterday.getTime() + 86_400_000);

  const [orders, events, newUsers, dauSet] = await Promise.all([
    prisma.order.aggregate({
      where: { createdAt: { gte: yesterday, lt: today } },
      _count: true,
      _sum: { totalDirams: true },
      _avg: { totalDirams: true },
    }),
    prisma.analyticsEvent.groupBy({
      by: ['event'],
      where: { ts: { gte: yesterday, lt: today } },
      _count: true,
    }),
    prisma.user.count({ where: { createdAt: { gte: yesterday, lt: today } } }),
    redis.scard(`analytics:dau:${yesterday.toISOString().slice(0, 10)}`),
  ]);

  const eventMap = Object.fromEntries(events.map(e => [e.event, e._count]));

  const codOrders = await prisma.order.count({
    where: { createdAt: { gte: yesterday, lt: today }, paymentMethod: 'cod' },
  });

  await prisma.dailyMetrics.upsert({
    where: { date: yesterday },
    create: {
      date: yesterday,
      dau: dauSet,
      newUsers,
      orders: orders._count,
      revenueDirams: orders._sum.totalDirams ?? BigInt(0),
      avgOrderValueDirams: orders._avg.totalDirams ? BigInt(Math.round(Number(orders._avg.totalDirams))) : BigInt(0),
      codOrders,
      cardOrders: orders._count - codOrders,
      productViews: eventMap['product_view'] ?? 0,
      addToCartCount: eventMap['add_to_cart'] ?? 0,
      checkoutStartCount: eventMap['checkout_start'] ?? 0,
      orderPlacedCount: eventMap['order_placed'] ?? 0,
    },
    update: {},  // never overwrite historical data
  });
}

async function computeCohortRetention() {
  // Get all cohort months (users grouped by signup month)
  const cohorts = await prisma.$queryRaw<Array<{ cohort_month: Date; cohort_size: bigint }>>`
    SELECT DATE_TRUNC('month', "createdAt") AS cohort_month,
           COUNT(*) AS cohort_size
    FROM "User"
    GROUP BY 1
    ORDER BY 1
  `;

  const currentMonth = new Date();
  currentMonth.setUTCDate(1);
  currentMonth.setUTCHours(0, 0, 0, 0);

  for (const cohort of cohorts) {
    let retentionMonth = new Date(cohort.cohort_month);

    while (retentionMonth <= currentMonth) {
      const nextMonth = new Date(retentionMonth.getTime());
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const activeUsers = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT u.id)
        FROM "User" u
        INNER JOIN "Order" o ON o."userId" = u.id
        WHERE DATE_TRUNC('month', u."createdAt") = ${cohort.cohort_month}
          AND DATE_TRUNC('month', o."createdAt") = ${retentionMonth}
      `;

      const active = Number(activeUsers[0].count);
      const cohortSize = Number(cohort.cohort_size);

      await prisma.cohortRetention.upsert({
        where: {
          cohortMonth_retentionMonth: {
            cohortMonth: cohort.cohort_month,
            retentionMonth,
          },
        },
        create: {
          cohortMonth: cohort.cohort_month,
          retentionMonth,
          cohortSize,
          activeUsers: active,
          retentionPct: cohortSize > 0 ? active / cohortSize : 0,
        },
        update: { activeUsers: active, retentionPct: cohortSize > 0 ? active / cohortSize : 0 },
      });

      retentionMonth = nextMonth;
    }
  }
}
```

---

## Analytics API Routes

```typescript
// app/api/admin/analytics/overview/route.ts
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const days = Number(searchParams.get('days') ?? 30);

  const since = new Date(Date.now() - days * 86_400_000);
  const todayKey = new Date().toISOString().slice(0, 10);

  const [metrics, dailySeries, realtimeDAU] = await Promise.all([
    prisma.dailyMetrics.aggregate({
      where: { date: { gte: since } },
      _sum: { orders: true, revenueDirams: true, newUsers: true, productViews: true },
      _avg: { avgOrderValueDirams: true },
    }),
    prisma.dailyMetrics.findMany({
      where: { date: { gte: since } },
      orderBy: { date: 'asc' },
      select: { date: true, orders: true, revenueDirams: true, dau: true, newUsers: true },
    }),
    redis.scard(`analytics:dau:${todayKey}`),
  ]);

  return Response.json({
    totals: {
      orders: metrics._sum.orders ?? 0,
      revenueTJS: Number(metrics._sum.revenueDirams ?? 0) / 100,
      newUsers: metrics._sum.newUsers ?? 0,
      productViews: metrics._sum.productViews ?? 0,
      avgOrderTJS: Number(metrics._avg.avgOrderValueDirams ?? 0) / 100,
    },
    todayDAU: realtimeDAU,
    dailySeries: dailySeries.map(d => ({
      date: d.date.toISOString().slice(0, 10),
      orders: d.orders,
      revenueTJS: Number(d.revenueDirams) / 100,
      dau: d.dau,
      newUsers: d.newUsers,
    })),
  });
}

// Conversion funnel
// app/api/admin/analytics/funnel/route.ts
export async function getFunnel(days = 30) {
  const since = new Date(Date.now() - days * 86_400_000);

  const steps = await prisma.analyticsEvent.groupBy({
    by: ['event'],
    where: {
      event: { in: ['product_view', 'add_to_cart', 'checkout_start', 'order_placed'] },
      ts: { gte: since },
    },
    _count: true,
  });

  const map = Object.fromEntries(steps.map(s => [s.event, s._count]));
  const views       = map['product_view'] ?? 0;
  const addToCart   = map['add_to_cart'] ?? 0;
  const checkout    = map['checkout_start'] ?? 0;
  const ordered     = map['order_placed'] ?? 0;

  return {
    steps: [
      { name: 'Просмотр товара', count: views, pct: 100 },
      { name: 'В корзину',       count: addToCart, pct: views > 0 ? addToCart / views * 100 : 0 },
      { name: 'Оформление',      count: checkout,  pct: addToCart > 0 ? checkout / addToCart * 100 : 0 },
      { name: 'Заказ оформлен',  count: ordered,   pct: checkout > 0 ? ordered / checkout * 100 : 0 },
    ],
    overallCVR: views > 0 ? (ordered / views * 100).toFixed(2) + '%' : '0%',
  };
}

// Revenue by region
export async function getRevenueByRegion(days = 30) {
  const since = new Date(Date.now() - days * 86_400_000);

  return prisma.order.groupBy({
    by: ['regionId'],
    where: { createdAt: { gte: since }, status: { in: ['delivered', 'completed'] } },
    _sum: { totalDirams: true },
    _count: true,
    orderBy: { _sum: { totalDirams: 'desc' } },
  }).then(rows => rows.map(r => ({
    regionId: r.regionId ?? 'unknown',
    orders: r._count,
    revenueTJS: Number(r._sum.totalDirams ?? 0) / 100,
  })));
}

// Top products
export async function getTopProducts(days = 7, limit = 10) {
  const since = new Date(Date.now() - days * 86_400_000);

  return prisma.productMetrics.groupBy({
    by: ['productId'],
    where: { date: { gte: since } },
    _sum: { orders: true, revenueDirams: true, views: true },
    orderBy: { _sum: { revenueDirams: 'desc' } },
    take: limit,
  }).then(async rows => {
    const ids = rows.map(r => r.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, titleRu: true, imageUrls: true, priceDirams: true },
    });
    const pMap = Object.fromEntries(products.map(p => [p.id, p]));
    return rows.map(r => ({
      ...r._sum,
      productId: r.productId,
      revenueTJS: Number(r._sum.revenueDirams ?? 0) / 100,
      product: pMap[r.productId],
    }));
  });
}
```

---

## Recharts Dashboard Components

```tsx
// components/analytics/OverviewDashboard.tsx
'use client';

import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, FunnelChart, Funnel, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import { useEffect, useState } from 'react';

interface OverviewData {
  totals: { orders: number; revenueTJS: number; newUsers: number; avgOrderTJS: number };
  todayDAU: number;
  dailySeries: Array<{ date: string; orders: number; revenueTJS: number; dau: number }>;
}

export function OverviewDashboard({ days = 30 }: { days?: number }) {
  const [data, setData] = useState<OverviewData | null>(null);

  useEffect(() => {
    fetch(`/api/admin/analytics/overview?days=${days}`).then(r => r.json()).then(setData);
  }, [days]);

  if (!data) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <KPI label="Заказов"          value={data.totals.orders.toLocaleString('ru')} />
        <KPI label="Выручка"          value={`${data.totals.revenueTJS.toLocaleString('ru')} с.`} trend="up" />
        <KPI label="Новых юзеров"     value={data.totals.newUsers.toLocaleString('ru')} />
        <KPI label="Ср. чек"          value={`${data.totals.avgOrderTJS.toFixed(0)} с.`} />
        <KPI label="DAU сегодня"      value={data.todayDAU.toLocaleString('ru')} accent />
      </div>

      {/* Revenue trend */}
      <ChartCard title="Выручка по дням (TJS)">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data.dailySeries}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={d => d.slice(5)} />
            <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(v: number) => [`${v.toLocaleString('ru')} с.`, 'Выручка']}
              labelFormatter={l => `Дата: ${l}`}
            />
            <Line type="monotone" dataKey="revenueTJS" stroke="#e11d48" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Orders bar */}
      <ChartCard title="Заказы по дням">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.dailySeries}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={d => d.slice(5)} />
            <YAxis />
            <Tooltip formatter={(v: number) => [v, 'Заказов']} />
            <Bar dataKey="orders" fill="#3b82f6" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

// Conversion funnel
export function FunnelView() {
  const [funnel, setFunnel] = useState<any>(null);
  const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981'];

  useEffect(() => {
    fetch('/api/admin/analytics/funnel').then(r => r.json()).then(setFunnel);
  }, []);

  if (!funnel) return <div className="h-48 animate-pulse rounded-xl bg-muted" />;

  return (
    <ChartCard title={`Конверсионная воронка (CVR ${funnel.overallCVR})`}>
      <div className="space-y-2 p-4">
        {funnel.steps.map((step: any, i: number) => (
          <div key={step.name}>
            <div className="mb-1 flex justify-between text-sm">
              <span>{step.name}</span>
              <span className="font-medium">{step.count.toLocaleString('ru')} ({step.pct.toFixed(1)}%)</span>
            </div>
            <div className="h-8 rounded bg-muted">
              <div
                className="h-8 rounded transition-all"
                style={{ width: `${Math.max(2, step.pct)}%`, backgroundColor: COLORS[i] }}
              />
            </div>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

// Cohort retention heatmap
export function CohortHeatmap() {
  const [cohorts, setCohorts] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/admin/analytics/cohorts').then(r => r.json()).then(setCohorts);
  }, []);

  function pctToColor(pct: number): string {
    if (pct >= 0.4) return 'bg-green-500 text-white';
    if (pct >= 0.2) return 'bg-green-200';
    if (pct >= 0.1) return 'bg-yellow-200';
    return 'bg-red-100';
  }

  return (
    <ChartCard title="Когортное удержание (по месяцам)">
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr>
              <th className="p-1 text-left">Когорта</th>
              {['М0','М1','М2','М3','М4','М5','М6'].map(m => (
                <th key={m} className="p-1 text-center">{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cohorts.map(c => (
              <tr key={c.cohortMonth}>
                <td className="p-1 whitespace-nowrap">{c.cohortMonth.slice(0,7)} ({c.cohortSize})</td>
                {c.retention.map((pct: number, i: number) => (
                  <td key={i} className={`p-1 text-center rounded ${pctToColor(pct)}`}>
                    {pct > 0 ? `${(pct * 100).toFixed(0)}%` : '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}

// Revenue by region pie chart
export function RegionRevenuePie() {
  const [data, setData] = useState<any[]>([]);
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#e11d48', '#8b5cf6', '#6b7280'];
  const LABELS: Record<string, string> = {
    dushanbe: 'Душанбе', khujand: 'Худжанд', kulob: 'Куляб',
    qurghonteppa: 'Қӯрғонтеппа', gbao: 'ГБАО', other: 'Другое',
  };

  useEffect(() => {
    fetch('/api/admin/analytics/regions').then(r => r.json()).then(setData);
  }, []);

  return (
    <ChartCard title="Выручка по регионам">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} dataKey="revenueTJS" nameKey="regionId" outerRadius={90} label={({ regionId, percent }: any) =>
            `${LABELS[regionId] ?? regionId} ${(percent * 100).toFixed(0)}%`
          }>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v: number) => [`${v.toLocaleString('ru')} с.`, 'Выручка']} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// Helpers
function KPI({ label, value, trend, accent }: { label: string; value: string; trend?: 'up' | 'down'; accent?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${accent ? 'border-primary/50 bg-primary/5' : ''}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      {trend && <p className={`text-xs ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>{trend === 'up' ? '↑' : '↓'}</p>}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[...Array(5)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />)}
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
```

---

## Client-Side Event Tracker

```typescript
// lib/analytics/tracker.ts
'use client';

import type { AnalyticsEvent, AnalyticsEventPayload } from './events';

const SESSION_KEY = 'bozor_session_id';

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function getDeviceType(): AnalyticsEventPayload['deviceType'] {
  const w = window.innerWidth;
  return w < 768 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop';
}

function getPlatform(): AnalyticsEventPayload['platform'] {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('android')) return 'android';
  if (ua.includes('iphone') || ua.includes('ipad')) return 'ios';
  return 'web';
}

export function track(
  event: AnalyticsEvent,
  props: Partial<Omit<AnalyticsEventPayload, 'event' | 'sessionId' | 'deviceType' | 'platform' | 'ts'>> = {},
): void {
  const lang = (document.documentElement.lang as 'ru' | 'tg') ?? 'ru';

  const payload: AnalyticsEventPayload = {
    event,
    sessionId: getSessionId(),
    deviceType: getDeviceType(),
    platform: getPlatform(),
    lang,
    ts: Date.now(),
    pageUrl: window.location.pathname,
    ...props,
  };

  // Fire-and-forget — never block UI
  navigator.sendBeacon('/api/analytics/event', JSON.stringify(payload));
}

// React hook for page view tracking
export function usePageView(productId?: string, categoryId?: string) {
  useEffect(() => {
    track('page_view', { productId, categoryId });
  }, [productId, categoryId]);
}

// Example usages:
// track('add_to_cart', { productId, amountDirams: Number(product.priceDirams) });
// track('order_placed', { orderId, amountDirams: Number(order.totalDirams) });
// track('search_query', { searchQuery: query });
// track('promo_code_applied', { promoCode: code });
```

---

## Seller Analytics API

```typescript
// app/api/seller/analytics/route.ts
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user?.sellerId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const days = Number(searchParams.get('days') ?? 30);
  const since = new Date(Date.now() - days * 86_400_000);

  const [metrics, topProducts, recentOrders] = await Promise.all([
    prisma.sellerMetrics.aggregate({
      where: { sellerId: user.sellerId, date: { gte: since } },
      _sum: { orders: true, revenueDirams: true, cancelledOrders: true, returnedOrders: true },
      _avg: { avgRating: true },
    }),
    prisma.productMetrics.findMany({
      where: {
        date: { gte: since },
        product: { sellerId: user.sellerId },
      },
      orderBy: { revenueDirams: 'desc' },
      take: 10,
      include: { product: { select: { id: true, titleRu: true, imageUrls: true } } },
    }),
    prisma.order.findMany({
      where: { items: { some: { product: { sellerId: user.sellerId } } }, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, createdAt: true, status: true, totalDirams: true, regionId: true },
    }),
  ]);

  return Response.json({
    totals: {
      orders: metrics._sum.orders ?? 0,
      revenueTJS: Number(metrics._sum.revenueDirams ?? 0) / 100,
      cancelRate: (metrics._sum.orders ?? 0) > 0
        ? ((metrics._sum.cancelledOrders ?? 0) / (metrics._sum.orders ?? 1) * 100).toFixed(1)
        : '0',
      returnRate: (metrics._sum.orders ?? 0) > 0
        ? ((metrics._sum.returnedOrders ?? 0) / (metrics._sum.orders ?? 1) * 100).toFixed(1)
        : '0',
      avgRating: (metrics._avg.avgRating ?? 0).toFixed(1),
    },
    topProducts: topProducts.map(p => ({
      productId: p.productId,
      titleRu: p.product.titleRu,
      imageUrl: p.product.imageUrls[0],
      orders: p.orders,
      revenueTJS: Number(p.revenueDirams) / 100,
      views: p.views,
      conversionPct: p.views > 0 ? (p.orders / p.views * 100).toFixed(1) : '0',
    })),
    recentOrders: recentOrders.map(o => ({
      id: o.id,
      date: o.createdAt.toISOString().slice(0, 10),
      status: o.status,
      totalTJS: Number(o.totalDirams) / 100,
      regionId: o.regionId,
    })),
  });
}
```

---

## Real-time Redis Counters API

```typescript
// app/api/admin/analytics/realtime/route.ts
import { redis } from '@/lib/redis';

export async function GET() {
  const todayKey = new Date().toISOString().slice(0, 10);

  const [dau, eventCounts, topProducts, topCategories, topSearches, regions] = await Promise.all([
    redis.scard(`analytics:dau:${todayKey}`),
    redis.hgetall(`analytics:events:${todayKey}`),
    redis.zrevrange(`analytics:product_views:${todayKey}`, 0, 9, 'WITHSCORES'),
    redis.zrevrange(`analytics:category_views:${todayKey}`, 0, 4, 'WITHSCORES'),
    redis.zrevrange(`analytics:searches:${todayKey}`, 0, 9, 'WITHSCORES'),
    redis.hgetall(`analytics:regions:${todayKey}`),
  ]);

  return Response.json({
    dau,
    events: eventCounts ?? {},
    topProducts: parseZrange(topProducts),
    topCategories: parseZrange(topCategories),
    topSearches: parseZrange(topSearches),
    regions: regions ?? {},
    asOf: new Date().toISOString(),
  });
}

function parseZrange(arr: string[]): Array<{ id: string; count: number }> {
  const result = [];
  for (let i = 0; i < arr.length; i += 2) {
    result.push({ id: arr[i], count: Number(arr[i + 1]) });
  }
  return result;
}
```

---

## Agent Workflow

When `/analytics-agent` is invoked:

1. **Verify ingestion** — Confirm `POST /api/analytics/event` is being called from `track()` on all key user actions (product_view, add_to_cart, order_placed).
2. **Check aggregation** — Confirm `aggregate-daily` BullMQ job runs nightly. If `DailyMetrics` table is empty, trigger backfill.
3. **Funnel** — Query funnel CVR. If `add_to_cart → order_placed` CVR < 15%, flag for checkout UX review.
4. **Cohorts** — Run `computeCohortRetention()`. Month-1 retention below 20% → alert to CEO agent.
5. **Regional** — Check GBAO revenue share. If < 2%, flag delivery coverage gap.
6. **COD ratio** — If COD > 70% and rising, alert payment-agent to promote card payment incentives.
7. **Top products** — Surface to catalog-agent for featured placement.
8. **Seller KPIs** — Cancel rate > 10% or return rate > 8% on a seller → flag for seller-support review.
9. **Peak hours** — Confirm Telegram daily digest fires at 09:00 Dushanbe (04:00 UTC) to catch evening browse session (20-22 UTC+5).

### Non-negotiable rules
- `amountDirams` is always **integer** in event payload — never float.
- `navigator.sendBeacon` for all client events — never `fetch()` which blocks navigation.
- `DailyMetrics.revenueDirams` is `BigInt` — convert to TJS (`/ 100`) only at API response boundary.
- Historical `DailyMetrics` rows are **immutable** — `upsert` with empty `update: {}` for past dates.
- Cohort retention query uses raw SQL `DATE_TRUNC` — never load all users into memory.
- Real-time Redis counters use `HINCRBY` and `ZINCRBY` — always atomic, never read-modify-write.
- Event data older than 90 days → archive to cold storage (S3/R2), delete from `AnalyticsEvent` table to keep DB size bounded.
