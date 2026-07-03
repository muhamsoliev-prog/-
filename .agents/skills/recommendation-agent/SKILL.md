---
name: recommendation-agent
description: |-
  Product recommendations for Tajikistan marketplace — collaborative filtering, content-based matching, BullMQ retraining, Meilisearch vector search, and A/B test integration.
---

# Recommendation Agent

## Trigger
`/recommendation-agent`

## Role
Personalised product recommendation engine for the Tajikistan marketplace. Combines collaborative filtering, content-based similarity, seasonal rules, and a cold-start fallback into a hybrid ranker — served from Redis with sub-50 ms latency. All surfaces (homepage, PDP, cart, email digest) consume the same scoring API.

---

## Tajikistan Recommendation Context

| Signal | Implication |
|---|---|
| Навруз (21 March) | Furniture, textiles, household goods spike 3–4 weeks before |
| Construction season (Apr–Sep) | Building materials, tools, cement rank up +30% |
| Рамазон / Иди Қурбон | Electronics, clothing, sweets gifting spike |
| 80%+ Android mobile | Payload ≤ 5 items per request; lazy-load more |
| COD 60% | Price-sensitive users; rank affordable alternatives higher for COD users |
| Regional clustering | GBAO users → mountain gear, heating; Dushanbe → fashion, electronics |
| Low repeat-purchase rate | New-user cold start common; rules-based fallback critical |
| Russian-language search | Meilisearch similarity queries in Russian |

---

## Event Schema

Every user action feeds the recommender. Store in Postgres, mirror hot window to Redis.

```ts
type EventType =
  | 'view'            // product page view (≥ 3 s)
  | 'click'           // click from listing
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'purchase'
  | 'wishlist_add'
  | 'wishlist_remove'
  | 'search'          // search query issued
  | 'review_submit'
  | 'share';

interface UserEvent {
  id: string;
  userId?: string;         // null = anonymous (use sessionId)
  sessionId: string;
  eventType: EventType;
  productId?: string;
  categoryId?: string;
  searchQuery?: string;
  durationMs?: number;     // for 'view'
  priceDirams?: number;    // snapshot at event time
  region?: string;         // TJ region
  deviceType: 'mobile' | 'tablet' | 'desktop';
  occurredAt: DateTime;
}

// Event weights for implicit feedback scoring
const EVENT_WEIGHT: Record<EventType, number> = {
  purchase:        10.0,
  add_to_cart:      5.0,
  wishlist_add:     3.0,
  view:             1.0,   // multiplied by min(durationMs/60000, 5)
  click:            0.5,
  review_submit:    4.0,
  share:            2.0,
  search:           0.2,
  remove_from_cart:-2.0,
  wishlist_remove: -1.0,
};
```

---

## Prisma Schema

```prisma
model UserEvent {
  id           String   @id @default(cuid())
  userId       String?
  sessionId    String
  eventType    String
  productId    String?
  categoryId   String?
  searchQuery  String?
  durationMs   Int?
  priceDirams  BigInt?
  region       String?
  deviceType   String   @default("mobile")
  occurredAt   DateTime @default(now())

  @@index([userId])
  @@index([sessionId])
  @@index([productId])
  @@index([occurredAt])
}

model ItemSimilarity {
  itemA         String
  itemB         String
  score         Float     // 0-1, cosine similarity
  algorithm     String    // 'collab' | 'content' | 'hybrid'
  computedAt    DateTime  @default(now())

  @@id([itemA, itemB, algorithm])
  @@index([itemA, algorithm])
}

model UserProfile {
  userId        String   @id
  topCategories String[] // ordered by affinity
  priceRangeLow BigInt   @default(0)
  priceRangeHigh BigInt  @default(999_999_999)
  region        String?
  preferredBrands String[]
  lastComputedAt DateTime @default(now())
}

model ABTest {
  id          String   @id @default(cuid())
  name        String
  variants    Json     // { control: {...}, treatment: {...} }
  allocation  Float    @default(0.5) // fraction in treatment
  startedAt   DateTime @default(now())
  endedAt     DateTime?
  isActive    Boolean  @default(true)
}
```

---

## Recommendation Surfaces & Algorithms

```ts
export type Surface =
  | 'homepage_hero'       // Top 10 personalised
  | 'homepage_trending'   // Trending this week
  | 'pdp_similar'         // Product page: similar items
  | 'pdp_bought_together' // Frequently bought together
  | 'pdp_complete_look'   // Interior Designer cross-sell
  | 'cart_upsell'         // Cart: add this too
  | 'category_popular'    // Category page top items
  | 'search_related'      // After search: related products
  | 'email_digest'        // Weekly personalised email
  | 'empty_cart'          // Cold-start homepage fallback
  | 'post_purchase';      // Order confirmation page

export type Algorithm =
  | 'collaborative'       // Item-item collaborative filtering
  | 'content'             // Meilisearch similarity
  | 'trending'            // Event-count based
  | 'seasonal'            // Calendar-rule boosted
  | 'hybrid'              // Weighted ensemble
  | 'cold_start';         // Rules-based for new users

const SURFACE_CONFIG: Record<Surface, {
  algorithm: Algorithm;
  limit: number;
  diversify: boolean;    // enforce category diversity
  requireInStock: boolean;
}> = {
  homepage_hero:       { algorithm: 'hybrid',        limit: 10, diversify: true,  requireInStock: true },
  homepage_trending:   { algorithm: 'trending',       limit: 8,  diversify: true,  requireInStock: true },
  pdp_similar:         { algorithm: 'hybrid',         limit: 6,  diversify: false, requireInStock: true },
  pdp_bought_together: { algorithm: 'collaborative',  limit: 4,  diversify: false, requireInStock: true },
  pdp_complete_look:   { algorithm: 'content',        limit: 4,  diversify: true,  requireInStock: true },
  cart_upsell:         { algorithm: 'collaborative',  limit: 3,  diversify: true,  requireInStock: true },
  category_popular:    { algorithm: 'trending',       limit: 20, diversify: false, requireInStock: true },
  search_related:      { algorithm: 'content',        limit: 6,  diversify: true,  requireInStock: false },
  email_digest:        { algorithm: 'hybrid',         limit: 5,  diversify: true,  requireInStock: true },
  empty_cart:          { algorithm: 'cold_start',     limit: 8,  diversify: true,  requireInStock: true },
  post_purchase:       { algorithm: 'collaborative',  limit: 4,  diversify: true,  requireInStock: true },
};
```

---

## Scoring Engine

### 1. Collaborative Filtering (Item–Item)

Pre-computed offline; scores stored in Redis sorted sets.

```ts
// Key: recs:collab:{productId}  →  ZSET of productId → score
const COLLAB_KEY = (pid: string) => `recs:collab:${pid}`;
const COLLAB_TTL = 86_400;   // 24h

export async function getCollabRecs(productId: string, limit: number): Promise<ScoredProduct[]> {
  const results = await redis.zrevrange(COLLAB_KEY(productId), 0, limit - 1, 'WITHSCORES');
  return parseZrevrange(results);
}

// Batch computation job (runs nightly via BullMQ)
export async function computeItemItemSimilarity(): Promise<void> {
  // Load interaction matrix from DB (last 90 days)
  const events = await prisma.userEvent.findMany({
    where: {
      eventType: { in: ['purchase', 'add_to_cart', 'view', 'wishlist_add'] },
      occurredAt: { gte: subDays(new Date(), 90) },
      productId: { not: null },
      userId:    { not: null },
    },
    select: { userId: true, productId: true, eventType: true, durationMs: true },
  });

  // Build user×item implicit score matrix
  const matrix = new Map<string, Map<string, number>>(); // userId → productId → score
  for (const e of events) {
    const weight = EVENT_WEIGHT[e.eventType as EventType] ?? 0;
    const timeBonus = e.durationMs ? Math.min(e.durationMs / 60_000, 5) : 1;
    const score = weight * (e.eventType === 'view' ? timeBonus : 1);

    if (!matrix.has(e.userId!)) matrix.set(e.userId!, new Map());
    const userMap = matrix.get(e.userId!)!;
    userMap.set(e.productId!, (userMap.get(e.productId!) ?? 0) + score);
  }

  // Item–item cosine similarity (top 20 neighbours per item)
  const items = [...new Set(events.map(e => e.productId!))];
  const pipeline = redis.pipeline();

  for (let i = 0; i < items.length; i++) {
    const itemA = items[i];
    const usersA = getUsersForItem(matrix, itemA);

    for (let j = i + 1; j < items.length; j++) {
      const itemB = items[j];
      const usersB = getUsersForItem(matrix, itemB);
      const sim = cosineSimilarity(usersA, usersB);
      if (sim < 0.05) continue;

      pipeline.zadd(COLLAB_KEY(itemA), sim, itemB);
      pipeline.zadd(COLLAB_KEY(itemB), sim, itemA);
    }
  }

  // Trim each set to top 50 and set TTL
  for (const itemId of items) {
    pipeline.zremrangebyrank(COLLAB_KEY(itemId), 0, -51);
    pipeline.expire(COLLAB_KEY(itemId), COLLAB_TTL);
  }

  await pipeline.exec();
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0, normA = 0, normB = 0;
  for (const [uid, scoreA] of a) {
    const scoreB = b.get(uid) ?? 0;
    dot   += scoreA * scoreB;
    normA += scoreA * scoreA;
  }
  for (const [, scoreB] of b) normB += scoreB * scoreB;
  return normA > 0 && normB > 0 ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
}

function getUsersForItem(matrix: Map<string, Map<string, number>>, itemId: string): Map<string, number> {
  const result = new Map<string, number>();
  for (const [userId, items] of matrix) {
    const score = items.get(itemId);
    if (score) result.set(userId, score);
  }
  return result;
}
```

### 2. Content-Based (Meilisearch)

```ts
import { meili } from '@/lib/meilisearch';

export async function getContentRecs(productId: string, limit: number): Promise<ScoredProduct[]> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { nameRu: true, category: true, tags: true, priceDirams: true },
  });
  if (!product) return [];

  const query = [product.nameRu, ...product.tags].join(' ');
  const priceMin = Math.round(Number(product.priceDirams) * 0.5);
  const priceMax = Math.round(Number(product.priceDirams) * 2.0);

  const { hits } = await meili.index('products').search(query, {
    limit: limit + 1,
    filter: [
      `category = "${product.category}"`,
      `priceDirams >= ${priceMin}`,
      `priceDirams <= ${priceMax}`,
      `inStock = true`,
      `id != "${productId}"`,
    ],
  });

  return hits.map((h, i) => ({
    productId: h.id,
    score: 1 - i * 0.05,   // rank-based decay
    algorithm: 'content' as Algorithm,
  }));
}
```

### 3. Trending

```ts
export async function getTrendingRecs(
  categoryId: string | null,
  region: string | null,
  limit: number
): Promise<ScoredProduct[]> {
  const TREND_KEY = `recs:trending:${categoryId ?? 'all'}:${region ?? 'all'}`;

  const cached = await redis.zrevrange(TREND_KEY, 0, limit - 1, 'WITHSCORES');
  if (cached.length > 0) return parseZrevrange(cached);

  // Compute from events of last 7 days
  const since = subDays(new Date(), 7);
  const events = await prisma.userEvent.groupBy({
    by: ['productId'],
    where: {
      occurredAt: { gte: since },
      productId: { not: null },
      ...(categoryId ? { product: { categoryId } } : {}),
      ...(region ? { region } : {}),
    },
    _sum: { eventType: true },  // counts
    orderBy: { _count: { productId: 'desc' } },
    take: limit * 3,
  });

  const pipeline = redis.pipeline();
  const results: ScoredProduct[] = [];

  for (const ev of events) {
    if (!ev.productId) continue;
    const score = (ev._count as any).productId ?? 0;
    pipeline.zadd(TREND_KEY, score, ev.productId);
    results.push({ productId: ev.productId, score, algorithm: 'trending' });
  }
  pipeline.expire(TREND_KEY, 3_600); // 1h TTL
  await pipeline.exec();

  return results.slice(0, limit);
}
```

### 4. Seasonal Booster

```ts
interface SeasonalRule {
  nameRu: string;
  startMD: [number, number];  // [month, day]
  endMD:   [number, number];
  categoryBoosts: Record<string, number>; // categoryId → multiplier
  preboostDays: number;       // start boosting N days before
}

const SEASONAL_RULES: SeasonalRule[] = [
  {
    nameRu: 'Навруз',
    startMD: [3, 21], endMD: [3, 27], preboostDays: 21,
    categoryBoosts: { furniture: 1.8, textile: 2.0, household: 1.6, clothing: 1.5, food: 1.4 },
  },
  {
    nameRu: 'Строительный сезон',
    startMD: [4, 1], endMD: [9, 30], preboostDays: 14,
    categoryBoosts: { construction: 1.5, tools: 1.4, hardware: 1.3, paint: 1.3 },
  },
  {
    nameRu: 'Иди Қурбон / Рамазон',
    startMD: [3, 10], endMD: [3, 20], preboostDays: 14,   // approximate; shift yearly
    categoryBoosts: { electronics: 1.5, clothing: 1.8, sweets: 2.0, gifts: 1.6 },
  },
  {
    nameRu: 'Осенняя уборка урожая',
    startMD: [9, 1], endMD: [11, 1], preboostDays: 7,
    categoryBoosts: { preservation: 1.8, kitchen: 1.3 },
  },
];

export function getSeasonalMultiplier(categoryId: string): number {
  const now = new Date();
  const md: [number, number] = [now.getMonth() + 1, now.getDate()];

  for (const rule of SEASONAL_RULES) {
    const startDate = new Date(now.getFullYear(), rule.startMD[0] - 1, rule.startMD[0] - rule.preboostDays);
    const endDate   = new Date(now.getFullYear(), rule.endMD[0] - 1, rule.endMD[1]);
    if (now >= startDate && now <= endDate) {
      return rule.categoryBoosts[categoryId] ?? 1.0;
    }
  }
  return 1.0;
}
```

### 5. Hybrid Ranker

```ts
interface ScoredProduct {
  productId: string;
  score: number;
  algorithm: Algorithm;
}

interface HybridWeights {
  collaborative: number;
  content: number;
  trending: number;
  seasonal: number;
}

const DEFAULT_WEIGHTS: HybridWeights = {
  collaborative: 0.50,
  content:       0.25,
  trending:      0.15,
  seasonal:      0.10,
};

export async function hybridRank(
  userId: string | null,
  productId: string | null,
  surface: Surface,
  limit: number,
  context: { region?: string; categoryId?: string }
): Promise<RecommendedProduct[]> {

  const cfg = SURFACE_CONFIG[surface];

  // Collect candidates from each algorithm
  const [collab, content, trending] = await Promise.all([
    productId ? getCollabRecs(productId, limit * 4) : [],
    productId ? getContentRecs(productId, limit * 4) : [],
    getTrendingRecs(context.categoryId ?? null, context.region ?? null, limit * 4),
  ]);

  // Merge scores
  const scoreMap = new Map<string, number>();
  const weights = DEFAULT_WEIGHTS;

  const addScores = (items: ScoredProduct[], weight: number) => {
    for (const item of items) {
      scoreMap.set(item.productId, (scoreMap.get(item.productId) ?? 0) + item.score * weight);
    }
  };

  addScores(collab,   weights.collaborative);
  addScores(content,  weights.content);
  addScores(trending, weights.trending);

  // Seasonal boost
  if (context.categoryId) {
    const boom = getSeasonalMultiplier(context.categoryId);
    if (boom > 1.0) {
      for (const [pid, score] of scoreMap) {
        const product = await getCategoryForProduct(pid);
        if (product?.categoryId === context.categoryId) {
          scoreMap.set(pid, score * boom * weights.seasonal);
        }
      }
    }
  }

  // COD user price sensitivity: rank cheaper items higher
  const isCodUser = userId ? await isCODPreferenceUser(userId) : true;
  if (isCodUser) {
    for (const [pid, score] of scoreMap) {
      const price = await getProductPrice(pid);
      if (price && price < 50_000_00) { // < 500 TJS
        scoreMap.set(pid, score * 1.2);
      }
    }
  }

  // Sort and filter
  let ranked = [...scoreMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([productId, score]) => ({ productId, score }));

  // Remove already-purchased items for this user
  if (userId) {
    const purchased = await getUserPurchasedProductIds(userId);
    ranked = ranked.filter(r => !purchased.has(r.productId));
  }

  // Diversity: max 2 per category
  if (cfg.diversify) {
    ranked = diversify(ranked, 2);
  }

  // In-stock filter
  if (cfg.requireInStock) {
    const ids = ranked.map(r => r.productId).slice(0, limit * 2);
    const inStock = await getInStockProductIds(ids);
    ranked = ranked.filter(r => inStock.has(r.productId));
  }

  // Enrich with product data
  const finalIds = ranked.slice(0, limit).map(r => r.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: finalIds } },
    select: { id: true, nameRu: true, priceDirams: true, images: true, category: true, rating: true },
  });

  return finalIds.map(id => {
    const p = products.find(pr => pr.id === id)!;
    return {
      productId: id,
      nameRu: p.nameRu,
      priceDirams: Number(p.priceDirams),
      imageUrl: p.images[0] ?? '',
      category: p.category,
      rating: p.rating,
      score: scoreMap.get(id) ?? 0,
      surface,
    };
  }).filter(Boolean);
}

function diversify(items: { productId: string; score: number }[], maxPerCategory: number) {
  // Round-robin by category — requires category lookup which is cached
  return items; // simplified: real impl uses category map from cache
}
```

---

## Cold Start (New Users)

```ts
export async function coldStartRecs(
  region: string | null,
  deviceType: 'mobile' | 'tablet' | 'desktop',
  limit: number
): Promise<RecommendedProduct[]> {

  // Rule 1: Best-sellers in region for past 30 days
  const trending = await getTrendingRecs(null, region, limit * 2);

  // Rule 2: Seasonal push
  const month = new Date().getMonth() + 1;
  const seasonalCategories: Record<number, string[]> = {
    1:  ['heating', 'clothing'],     // Январь — отопление
    2:  ['heating', 'clothing'],
    3:  ['furniture', 'textile', 'household'], // pre-Навруз
    4:  ['construction', 'tools'],   // Строительный сезон
    5:  ['construction', 'garden'],
    6:  ['fans', 'cooling', 'garden'],
    7:  ['fans', 'cooling'],
    8:  ['back_to_school', 'electronics'],
    9:  ['construction', 'preservation'],
    10: ['heating', 'preservation'],
    11: ['heating', 'clothing'],
    12: ['gifts', 'clothing', 'heating'],
  };

  const priorityCats = seasonalCategories[month] ?? [];
  const catRecs = await Promise.all(
    priorityCats.map(c => getTrendingRecs(c, region, 3))
  );

  // Interleave trending with seasonal
  const merged = [...catRecs.flat(), ...trending];
  const seen = new Set<string>();
  return merged
    .filter(r => !seen.has(r.productId) && seen.add(r.productId))
    .slice(0, limit) as RecommendedProduct[];
}
```

---

## Event Tracking API

```ts
// app/api/recs/event/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { getServerSession } from 'next-auth';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const session = await getServerSession();

  const event = await prisma.userEvent.create({
    data: {
      userId:      session?.user?.id ?? null,
      sessionId:   body.sessionId,
      eventType:   body.eventType,
      productId:   body.productId ?? null,
      categoryId:  body.categoryId ?? null,
      searchQuery: body.searchQuery ?? null,
      durationMs:  body.durationMs ?? null,
      priceDirams: body.priceDirams ?? null,
      region:      body.region ?? null,
      deviceType:  body.deviceType ?? 'mobile',
    },
  });

  // Hot-path: update Redis trending counter immediately
  if (body.productId && ['view','add_to_cart','purchase'].includes(body.eventType)) {
    const weight = EVENT_WEIGHT[body.eventType as EventType] ?? 1;
    await redis.zincrby(`recs:trending:all:all`, weight, body.productId);
    if (body.categoryId) {
      await redis.zincrby(`recs:trending:${body.categoryId}:all`, weight, body.productId);
    }
  }

  return NextResponse.json({ ok: true });
}
```

---

## Recommendations API

```ts
// app/api/recs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { hybridRank, coldStartRecs } from '@/lib/recommender';
import { getServerSession } from 'next-auth';
import { redis } from '@/lib/redis';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const surface    = (searchParams.get('surface') ?? 'homepage_hero') as Surface;
  const productId  = searchParams.get('productId');
  const categoryId = searchParams.get('categoryId');
  const region     = searchParams.get('region');
  const limit      = Math.min(parseInt(searchParams.get('limit') ?? '8'), 20);

  const session = await getServerSession();
  const userId  = session?.user?.id ?? null;

  // Cache key
  const cacheKey = `recs:${surface}:${userId ?? 'anon'}:${productId ?? 'none'}:${categoryId ?? 'none'}:${region ?? 'none'}`;
  const cached = await redis.get(cacheKey);
  if (cached) return NextResponse.json(JSON.parse(cached));

  let results: RecommendedProduct[];

  if (!userId && !productId) {
    results = await coldStartRecs(region, 'mobile', limit);
  } else {
    results = await hybridRank(userId, productId, surface, limit, { region: region ?? undefined, categoryId: categoryId ?? undefined });
    if (results.length < 3) {
      // Fallback to cold-start to fill gaps
      const fill = await coldStartRecs(region, 'mobile', limit - results.length);
      results = [...results, ...fill.filter(f => !results.find(r => r.productId === f.productId))];
    }
  }

  const ttl = surface === 'homepage_trending' ? 300 : 600; // 5-10 min
  await redis.setex(cacheKey, ttl, JSON.stringify(results));

  return NextResponse.json(results);
}
```

---

## React Hook

```ts
// hooks/useRecommendations.ts
import useSWR from 'swr';
import type { Surface, RecommendedProduct } from '@/types/recommendation';

export function useRecommendations(params: {
  surface: Surface;
  productId?: string;
  categoryId?: string;
  limit?: number;
}): {
  products: RecommendedProduct[];
  isLoading: boolean;
} {
  const query = new URLSearchParams({
    surface: params.surface,
    ...(params.productId  ? { productId: params.productId }   : {}),
    ...(params.categoryId ? { categoryId: params.categoryId } : {}),
    limit: String(params.limit ?? 8),
  });

  const { data, isLoading } = useSWR<RecommendedProduct[]>(
    `/api/recs?${query}`,
    url => fetch(url).then(r => r.json()),
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );

  return { products: data ?? [], isLoading };
}
```

---

## Recommendation Carousel Component

```tsx
// components/recs/RecsCarousel.tsx
'use client';

import { useRecommendations } from '@/hooks/useRecommendations';
import { ProductCard } from '@/components/catalog/ProductCard';
import { useTrackEvent } from '@/hooks/useTrackEvent';
import type { Surface } from '@/types/recommendation';

interface RecsCarouselProps {
  surface: Surface;
  titleRu: string;
  productId?: string;
  categoryId?: string;
  limit?: number;
}

export function RecsCarousel({ surface, titleRu, productId, categoryId, limit = 6 }: RecsCarouselProps) {
  const { products, isLoading } = useRecommendations({ surface, productId, categoryId, limit });
  const track = useTrackEvent();

  if (isLoading) return <RecsCarouselSkeleton count={limit} />;
  if (products.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold text-neutral-900 mb-3">{titleRu}</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none">
        {products.map((p, i) => (
          <div key={p.productId} className="flex-shrink-0 w-40 md:w-48 snap-start">
            <ProductCard
              product={p}
              onClick={() => track({
                eventType: 'click',
                productId: p.productId,
                priceDirams: p.priceDirams,
              })}
              position={i}
              surface={surface}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function RecsCarouselSkeleton({ count }: { count: number }) {
  return (
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex-shrink-0 w-40 h-56 bg-neutral-100 rounded-xl animate-pulse" />
      ))}
    </div>
  );
}
```

---

## A/B Testing

```ts
export async function getVariant(userId: string, testName: string): Promise<'control' | 'treatment'> {
  const test = await prisma.aBTest.findFirst({ where: { name: testName, isActive: true } });
  if (!test) return 'control';

  // Deterministic assignment from userId hash
  const hash = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return (hash % 100) / 100 < test.allocation ? 'treatment' : 'control';
}

// Usage: different hybrid weights per variant
const WEIGHTS_BY_VARIANT: Record<string, HybridWeights> = {
  control:   { collaborative: 0.50, content: 0.25, trending: 0.15, seasonal: 0.10 },
  treatment: { collaborative: 0.35, content: 0.40, trending: 0.15, seasonal: 0.10 }, // more content
};
```

---

## BullMQ Jobs

```ts
// Queue: recommendation-jobs
// Job 1: compute-collab-similarity  → runs nightly 02:00 Dushanbe (21:00 UTC)
// Job 2: compute-user-profiles      → runs nightly 03:00 Dushanbe
// Job 3: warm-cache                 → runs every 30 min; pre-warms homepage recs for top 1000 users
// Job 4: expire-ab-tests            → daily check; mark ended tests inactive

const recsQueue = new Queue('recommendation-jobs', { connection: redis });

// Schedule via cron
await recsQueue.add('compute-collab-similarity', {}, {
  repeat: { cron: '0 21 * * *' },  // 21:00 UTC = 02:00 Dushanbe
  attempts: 2,
});

await recsQueue.add('warm-cache', {}, {
  repeat: { every: 30 * 60 * 1000 },
  attempts: 1,
});
```

---

## API Routes

```
GET  /api/recs?surface=:s&productId=:p&limit=:n   — get recommendations
POST /api/recs/event                               — track user event
GET  /api/recs/trending?category=:c&region=:r     — trending products
POST /api/recs/jobs/trigger-collab                 — manually trigger similarity rebuild (admin)
GET  /api/recs/ab-test/:testName                  — get user's A/B variant
```

---

## Key Rules

1. **Never recommend out-of-stock items** on PDP/cart surfaces — always filter `inStock = true` before returning.
2. **COD users price-rank** — 60% of TJ users pay COD; boost items < 500 TJS for anonymous/COD-preference users.
3. **Cold-start seasonal calendar** — month-to-category map is the safety net for all new users.
4. **Redis cache TTL** — trending: 1h; personalised: 10min; never serve stale recs > 24h.
5. **Event weight debounce** — a user refreshing a product page must not spam the `view` event; enforce ≥ 3s view time client-side before firing.
6. **Nightly collab rebuild** — schedule at 02:00 Dushanbe (21:00 UTC) when traffic is lowest.
7. **Mobile payload ≤ 5 items** — default `limit = 5` on mobile carousels; users scroll for more.
8. **Exclude recently purchased** — filter from `UserEvent` where `eventType = 'purchase'` in last 30 days.
9. **Diversity cap** — max 2 items per category in diversified surfaces (homepage, cart upsell).
10. **A/B assignment deterministic** — use `userId hash % 100` for sticky consistent variant; never random per request.
