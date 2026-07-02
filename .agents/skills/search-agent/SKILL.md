# Search Agent Skill

## Trigger
`/search-agent`

## Role
You are the Search Engineer for a Tajikistan e-commerce marketplace. You design and implement the full search stack: Meilisearch indexing, Russian/Tajik NLP, faceted filtering, autocomplete, typo-tolerance, synonyms, search-as-you-type, personalized ranking, and search analytics — all tuned for a bilingual (RU/TG) mobile-first audience.

---

## Tech Stack

```
Meilisearch 1.x          — primary search engine (self-hosted)
Next.js 14 App Router    — search results page + API routes
Prisma + PostgreSQL       — product catalog source of truth
BullMQ + Redis           — indexing job queue
TypeScript               — all search logic
meilisearch (npm)        — official JS client
instantsearch.js / React InstantSearch — optional UI widgets
```

---

## Index Architecture

```typescript
// lib/search/indexes.ts

export const INDEXES = {
  PRODUCTS:    'products',
  SELLERS:     'sellers',
  CATEGORIES:  'categories',
  QUERIES:     'search_queries',   // analytics log
} as const;

// Product document shape
export interface ProductDocument {
  id: string;
  titleRu: string;
  titleTg: string;
  descriptionRu: string;
  descriptionTg: string;
  brand: string | null;
  categoryId: string;
  categoryPathRu: string[];       // ['Электроника', 'Смартфоны', 'Apple']
  tags: string[];
  priceDirams: number;            // integer, 1 TJS = 100 dirams
  originalPriceDirams: number | null;
  discountPct: number | null;
  inStock: boolean;
  stockQty: number;
  rating: number;                 // 0.00–5.00 × 100 stored as int → divide for display
  reviewCount: number;
  orderCount30d: number;          // trending signal
  sellerId: string;
  sellerNameRu: string;
  regionIds: string[];            // available delivery regions
  imageUrl: string;
  attributes: Record<string, string>;  // { color, material, size, ... }
  createdAt: number;              // Unix timestamp
  updatedAt: number;
  _geo?: { lat: number; lng: number }; // seller warehouse location
}
```

---

## Meilisearch Client Setup

```typescript
// lib/search/client.ts
import { MeiliSearch } from 'meilisearch';

if (!process.env.MEILISEARCH_HOST || !process.env.MEILISEARCH_MASTER_KEY) {
  throw new Error('MEILISEARCH_HOST and MEILISEARCH_MASTER_KEY must be set');
}

export const meili = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST,
  apiKey: process.env.MEILISEARCH_MASTER_KEY,
});

// Read-only client for frontend API routes
export const meiliSearch = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST,
  apiKey: process.env.MEILISEARCH_SEARCH_KEY,   // restricted key, no write access
});
```

---

## Index Configuration

```typescript
// lib/search/configure.ts
import { meili, INDEXES } from './client';

export async function configureProductsIndex() {
  const index = meili.index(INDEXES.PRODUCTS);

  await Promise.all([
    index.updateSettings({
      // Searchable fields ordered by weight
      searchableAttributes: [
        'titleRu',
        'titleTg',
        'brand',
        'tags',
        'descriptionRu',
        'descriptionTg',
        'categoryPathRu',
        'attributes',
        'sellerNameRu',
      ],

      // Filterable for facets + filters
      filterableAttributes: [
        'categoryId',
        'inStock',
        'priceDirams',
        'rating',
        'discountPct',
        'regionIds',
        'sellerId',
        'brand',
        'attributes.color',
        'attributes.size',
        'attributes.material',
      ],

      // Sortable for explicit sort options
      sortableAttributes: [
        'priceDirams',
        'rating',
        'reviewCount',
        'orderCount30d',
        'createdAt',
        'discountPct',
      ],

      // Custom ranking: boost in-stock, popular, high-rated items
      rankingRules: [
        'words',
        'typo',
        'proximity',
        'attribute',
        'sort',
        'exactness',
        'orderCount30d:desc',  // trending
        'rating:desc',
        'inStock:desc',
      ],

      // Highlight returned in search results
      displayedAttributes: [
        'id', 'titleRu', 'titleTg', 'brand', 'priceDirams', 'originalPriceDirams',
        'discountPct', 'inStock', 'rating', 'reviewCount', 'imageUrl',
        'categoryId', 'categoryPathRu', 'sellerId', 'sellerNameRu', 'regionIds',
        'attributes', 'tags',
      ],

      typoTolerance: {
        enabled: true,
        minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 },
      },

      // Stop words for RU + TG
      stopWords: [
        'и', 'в', 'на', 'с', 'по', 'для', 'из', 'не', 'от', 'к', 'за', 'то',
        'что', 'как', 'это', 'при', 'до', 'или', 'но', 'же', 'бы', 'был',
        'ва', 'аз', 'бо', 'ба', 'дар', 'ки', 'мебошад', 'барои',   // TG stop words
      ],
    }),

    // Synonyms for TJ market
    index.updateSynonyms({
      // Russian synonyms
      'телефон': ['смартфон', 'мобильный', 'айфон'],
      'ноутбук': ['лэптоп', 'компьютер', 'ультрабук'],
      'холодильник': ['морозильник', 'фridge'],
      'диван': ['кровать', 'тахта', 'курпача'],    // TJ: тахта=sofa, курпача=floor mattress
      'платье': ['кўйлак', 'либос'],               // RU+TG
      'туфли': ['кафш', 'обувь', 'ботинки'],
      'рис': ['биринҷ', 'шали'],                   // TG grain terms
      'мука': ['орд', 'آرد'],
      // Tajik synonyms
      'телевизор': ['телевизион', 'ТВ'],
      'яхдон': ['холодильник', 'морозильник'],     // TG for fridge
    }),
  ]);

  console.log('[search] products index configured');
}
```

---

## Indexing Pipeline

```typescript
// lib/search/indexer.ts
import { prisma } from '@/lib/prisma';
import { meili, INDEXES } from './client';
import type { ProductDocument } from './indexes';

const BATCH_SIZE = 500;

// Full re-index (runs nightly via BullMQ)
export async function fullReindex() {
  const index = meili.index(INDEXES.PRODUCTS);
  let cursor: string | undefined;
  let total = 0;

  do {
    const products = await prisma.product.findMany({
      take: BATCH_SIZE,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      where: { deletedAt: null },
      include: {
        category: { include: { parent: { include: { parent: true } } } },
        seller: { select: { id: true, nameRu: true } },
        _count: { select: { reviews: true } },
      },
      orderBy: { id: 'asc' },
    });

    if (products.length === 0) break;

    const docs: ProductDocument[] = products.map(p => ({
      id: p.id,
      titleRu: p.titleRu,
      titleTg: p.titleTg ?? p.titleRu,
      descriptionRu: p.descriptionRu ?? '',
      descriptionTg: p.descriptionTg ?? '',
      brand: p.brand,
      categoryId: p.categoryId,
      categoryPathRu: buildCategoryPath(p.category),
      tags: p.tags,
      priceDirams: Number(p.priceDirams),
      originalPriceDirams: p.originalPriceDirams ? Number(p.originalPriceDirams) : null,
      discountPct: p.discountPct,
      inStock: p.stockQty > 0,
      stockQty: p.stockQty,
      rating: p.rating,
      reviewCount: p._count.reviews,
      orderCount30d: p.orderCount30d,
      sellerId: p.seller.id,
      sellerNameRu: p.seller.nameRu,
      regionIds: p.availableRegionIds,
      imageUrl: p.imageUrls[0] ?? '',
      attributes: (p.attributes as Record<string, string>) ?? {},
      createdAt: Math.floor(p.createdAt.getTime() / 1000),
      updatedAt: Math.floor(p.updatedAt.getTime() / 1000),
    }));

    await index.addDocuments(docs, { primaryKey: 'id' });
    total += docs.length;
    cursor = products.at(-1)?.id;
  } while (true);

  console.log(`[search] full reindex complete: ${total} products`);
}

// Incremental update — call after product create/update/delete
export async function upsertProductInIndex(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      category: { include: { parent: { include: { parent: true } } } },
      seller: { select: { id: true, nameRu: true } },
      _count: { select: { reviews: true } },
    },
  });

  if (!product || product.deletedAt) {
    await meili.index(INDEXES.PRODUCTS).deleteDocument(productId);
    return;
  }

  const doc: ProductDocument = {
    id: product.id,
    titleRu: product.titleRu,
    titleTg: product.titleTg ?? product.titleRu,
    descriptionRu: product.descriptionRu ?? '',
    descriptionTg: product.descriptionTg ?? '',
    brand: product.brand,
    categoryId: product.categoryId,
    categoryPathRu: buildCategoryPath(product.category),
    tags: product.tags,
    priceDirams: Number(product.priceDirams),
    originalPriceDirams: product.originalPriceDirams ? Number(product.originalPriceDirams) : null,
    discountPct: product.discountPct,
    inStock: product.stockQty > 0,
    stockQty: product.stockQty,
    rating: product.rating,
    reviewCount: product._count.reviews,
    orderCount30d: product.orderCount30d,
    sellerId: product.seller.id,
    sellerNameRu: product.seller.nameRu,
    regionIds: product.availableRegionIds,
    imageUrl: product.imageUrls[0] ?? '',
    attributes: (product.attributes as Record<string, string>) ?? {},
    createdAt: Math.floor(product.createdAt.getTime() / 1000),
    updatedAt: Math.floor(product.updatedAt.getTime() / 1000),
  };

  await meili.index(INDEXES.PRODUCTS).addDocuments([doc], { primaryKey: 'id' });
}

function buildCategoryPath(cat: any): string[] {
  const path: string[] = [];
  if (cat?.parent?.parent?.nameRu) path.push(cat.parent.parent.nameRu);
  if (cat?.parent?.nameRu) path.push(cat.parent.nameRu);
  if (cat?.nameRu) path.push(cat.nameRu);
  return path;
}
```

---

## Search API Route

```typescript
// app/api/search/route.ts
import { NextRequest } from 'next/server';
import { meiliSearch, INDEXES } from '@/lib/search/client';
import { logSearchQuery } from '@/lib/search/analytics';
import { getPersonalizedBoost } from '@/lib/search/personalization';
import type { ProductDocument } from '@/lib/search/indexes';

export const runtime = 'nodejs';

export interface SearchParams {
  q: string;
  page?: number;               // 1-based
  hitsPerPage?: number;        // default 24, max 48
  categoryId?: string;
  minPrice?: number;           // in dirams
  maxPrice?: number;
  inStock?: boolean;
  brands?: string[];
  regionId?: string;
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'trending';
  color?: string;
  size?: string;
  lang?: 'ru' | 'tg';
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const userId = req.headers.get('x-user-id') ?? null;

  const params: SearchParams = {
    q: sp.get('q') ?? '',
    page: Number(sp.get('page') ?? 1),
    hitsPerPage: Math.min(Number(sp.get('limit') ?? 24), 48),
    categoryId: sp.get('category') ?? undefined,
    minPrice: sp.has('minPrice') ? Number(sp.get('minPrice')) : undefined,
    maxPrice: sp.has('maxPrice') ? Number(sp.get('maxPrice')) : undefined,
    inStock: sp.get('inStock') === 'true' ? true : undefined,
    brands: sp.getAll('brand'),
    regionId: sp.get('region') ?? undefined,
    sortBy: (sp.get('sort') as SearchParams['sortBy']) ?? 'relevance',
    color: sp.get('color') ?? undefined,
    size: sp.get('size') ?? undefined,
    lang: (sp.get('lang') as 'ru' | 'tg') ?? 'ru',
  };

  const filter = buildFilter(params);
  const sort = buildSort(params.sortBy);

  const [results, boost] = await Promise.all([
    meiliSearch.index(INDEXES.PRODUCTS).search<ProductDocument>(params.q, {
      page: params.page,
      hitsPerPage: params.hitsPerPage,
      filter,
      sort,
      facets: ['categoryId', 'brand', 'attributes.color', 'attributes.size', 'inStock'],
      attributesToHighlight: ['titleRu', 'titleTg', 'brand'],
      highlightPreTag: '<mark>',
      highlightPostTag: '</mark>',
      attributesToCrop: ['descriptionRu', 'descriptionTg'],
      cropLength: 80,
    }),
    userId ? getPersonalizedBoost(userId, params.q) : Promise.resolve(null),
  ]);

  // Fire-and-forget analytics
  logSearchQuery({
    query: params.q,
    userId,
    resultsCount: results.totalHits ?? 0,
    page: params.page ?? 1,
    filters: filter,
  }).catch(() => {});

  return Response.json({
    hits: results.hits,
    totalHits: results.totalHits,
    totalPages: results.totalPages,
    page: results.page,
    facetDistribution: results.facetDistribution,
    processingTimeMs: results.processingTimeMs,
    query: results.query,
  });
}

function buildFilter(p: SearchParams): string[] {
  const f: string[] = [];
  if (p.categoryId) f.push(`categoryId = "${p.categoryId}"`);
  if (p.inStock === true) f.push('inStock = true');
  if (p.minPrice !== undefined) f.push(`priceDirams >= ${p.minPrice}`);
  if (p.maxPrice !== undefined) f.push(`priceDirams <= ${p.maxPrice}`);
  if (p.brands?.length) f.push(`brand IN [${p.brands.map(b => `"${b}"`).join(',')}]`);
  if (p.regionId) f.push(`regionIds = "${p.regionId}"`);
  if (p.color) f.push(`attributes.color = "${p.color}"`);
  if (p.size) f.push(`attributes.size = "${p.size}"`);
  return f;
}

function buildSort(sortBy: SearchParams['sortBy']): string[] {
  switch (sortBy) {
    case 'price_asc':  return ['priceDirams:asc'];
    case 'price_desc': return ['priceDirams:desc'];
    case 'rating':     return ['rating:desc', 'reviewCount:desc'];
    case 'newest':     return ['createdAt:desc'];
    case 'trending':   return ['orderCount30d:desc'];
    default:           return [];   // relevance — let Meilisearch ranking rules decide
  }
}
```

---

## Autocomplete / Search-as-You-Type

```typescript
// app/api/search/suggest/route.ts
import { NextRequest } from 'next/server';
import { meiliSearch, INDEXES } from '@/lib/search/client';
import type { ProductDocument } from '@/lib/search/indexes';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  const lang = (req.nextUrl.searchParams.get('lang') ?? 'ru') as 'ru' | 'tg';

  if (q.length < 2) return Response.json({ suggestions: [] });

  const results = await meiliSearch.index(INDEXES.PRODUCTS).search<ProductDocument>(q, {
    limit: 8,
    attributesToRetrieve: ['id', 'titleRu', 'titleTg', 'brand', 'imageUrl', 'priceDirams', 'categoryPathRu'],
    attributesToHighlight: [lang === 'tg' ? 'titleTg' : 'titleRu'],
    highlightPreTag: '<b>',
    highlightPostTag: '</b>',
    showRankingScore: false,
  });

  // Also fetch top category matches
  const categoryResults = await meiliSearch.index(INDEXES.CATEGORIES).search(q, {
    limit: 3,
    attributesToRetrieve: ['id', 'nameRu', 'nameTg', 'icon'],
  });

  return Response.json({
    products: results.hits.map(h => ({
      id: h.id,
      title: lang === 'tg' ? h.titleTg : h.titleRu,
      titleHighlighted: h._formatted?.[lang === 'tg' ? 'titleTg' : 'titleRu'],
      brand: h.brand,
      imageUrl: h.imageUrl,
      priceDirams: h.priceDirams,
      categoryPath: h.categoryPathRu,
    })),
    categories: categoryResults.hits,
    query: q,
  });
}
```

---

## Search Analytics

```typescript
// lib/search/analytics.ts
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

interface QueryLog {
  query: string;
  userId: string | null;
  resultsCount: number;
  page: number;
  filters: string[];
}

export async function logSearchQuery(log: QueryLog) {
  const normalized = log.query.trim().toLowerCase();
  if (!normalized) return;

  // Track zero-result queries in Redis sorted set
  if (log.resultsCount === 0) {
    await redis.zincrby('search:zero_results', 1, normalized);
  }

  // Track popular queries
  await redis.zincrby('search:popular:day', 1, normalized);

  // Persist to DB for long-term analysis (batch insert every 100)
  await prisma.searchQueryLog.create({
    data: {
      query: normalized,
      userId: log.userId,
      resultsCount: log.resultsCount,
      page: log.page,
      hasFilters: log.filters.length > 0,
    },
  });
}

// GET /api/admin/search/analytics
export async function getSearchAnalytics() {
  const [popular, zeroResults] = await Promise.all([
    redis.zrevrange('search:popular:day', 0, 19, 'WITHSCORES'),
    redis.zrevrange('search:zero_results', 0, 19, 'WITHSCORES'),
  ]);

  const topQueries = parseZrangeWithScores(popular);
  const zeroResultQueries = parseZrangeWithScores(zeroResults);

  return { topQueries, zeroResultQueries };
}

function parseZrangeWithScores(arr: string[]): Array<{ query: string; count: number }> {
  const result = [];
  for (let i = 0; i < arr.length; i += 2) {
    result.push({ query: arr[i], count: Number(arr[i + 1]) });
  }
  return result;
}
```

```prisma
// prisma/schema.prisma addition
model SearchQueryLog {
  id           String   @id @default(cuid())
  query        String
  userId       String?
  resultsCount Int
  page         Int      @default(1)
  hasFilters   Boolean  @default(false)
  createdAt    DateTime @default(now())

  @@index([query])
  @@index([createdAt])
  @@index([resultsCount])
}
```

---

## Personalized Search Boost

```typescript
// lib/search/personalization.ts
import { redis } from '@/lib/redis';
import { meiliSearch, INDEXES } from './client';

// Returns category IDs the user has affinity for (from their event log)
export async function getPersonalizedBoost(
  userId: string,
  _query: string,
): Promise<string[] | null> {
  const key = `user:${userId}:cat_affinity`;
  const raw = await redis.zrevrange(key, 0, 4, 'WITHSCORES');
  if (!raw.length) return null;

  const categoryIds: string[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    categoryIds.push(raw[i]);
  }
  return categoryIds;
}

// Build personalized filter boost — prepend user's preferred categories
// NOTE: Meilisearch doesn't have native re-ranking; we do two queries and merge
export async function personalizedSearch(
  userId: string,
  query: string,
  limit: number,
): Promise<any[]> {
  const affinityCategories = await getPersonalizedBoost(userId, query);
  if (!affinityCategories?.length) return [];

  const boostedFilter = `categoryId IN [${affinityCategories.map(c => `"${c}"`).join(',')}]`;

  const boosted = await meiliSearch.index(INDEXES.PRODUCTS).search(query, {
    limit: Math.min(6, limit),
    filter: [boostedFilter, 'inStock = true'],
    sort: ['rating:desc'],
  });

  return boosted.hits;
}
```

---

## BullMQ Jobs

```typescript
// workers/search-indexer.worker.ts
import { Worker, Queue } from 'bullmq';
import { redis } from '@/lib/redis';
import { fullReindex, upsertProductInIndex } from '@/lib/search/indexer';
import { configureProductsIndex } from '@/lib/search/configure';

export const searchIndexQueue = new Queue('search-index', { connection: redis });

// Schedule nightly full reindex at 02:00 UTC+5 (21:00 UTC)
export async function scheduleNightlyReindex() {
  await searchIndexQueue.add(
    'full-reindex',
    {},
    { repeat: { cron: '0 21 * * *' }, jobId: 'full-reindex-nightly' },
  );
}

new Worker(
  'search-index',
  async (job) => {
    if (job.name === 'full-reindex') {
      await configureProductsIndex();
      await fullReindex();
    }

    if (job.name === 'upsert-product') {
      await upsertProductInIndex(job.data.productId);
    }

    if (job.name === 'delete-product') {
      const { MeiliSearch } = await import('meilisearch');
      const meili = new MeiliSearch({
        host: process.env.MEILISEARCH_HOST!,
        apiKey: process.env.MEILISEARCH_MASTER_KEY!,
      });
      await meili.index('products').deleteDocument(job.data.productId);
    }
  },
  { connection: redis, concurrency: 2 },
);

// Call this after any product save in your API routes:
// await searchIndexQueue.add('upsert-product', { productId }, { delay: 500 });
```

---

## Search UI Component

```tsx
// components/search/SearchBar.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

interface Suggestion {
  id: string;
  title: string;
  titleHighlighted: string;
  brand: string | null;
  imageUrl: string;
  priceDirams: number;
  categoryPath: string[];
}

export function SearchBar({ lang = 'ru' }: { lang?: 'ru' | 'tg' }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 200);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setSuggestions([]);
      setCategories([]);
      setOpen(false);
      return;
    }

    fetch(`/api/search/suggest?q=${encodeURIComponent(debouncedQuery)}&lang=${lang}`)
      .then(r => r.json())
      .then(data => {
        setSuggestions(data.products ?? []);
        setCategories(data.categories ?? []);
        setOpen(true);
      });
  }, [debouncedQuery, lang]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  function formatPrice(dirams: number) {
    return `${(dirams / 100).toLocaleString('ru-RJ')} с.`;
  }

  return (
    <div className="relative w-full max-w-2xl">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={lang === 'tg' ? 'Ҷустуҷӯ...' : 'Поиск товаров...'}
          className="h-11 w-full rounded-lg border bg-background px-4 text-base outline-none focus:ring-2 focus:ring-primary"
          autoComplete="off"
        />
        <button
          type="submit"
          className="h-11 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground"
        >
          {lang === 'tg' ? 'Ёбед' : 'Найти'}
        </button>
      </form>

      {open && (suggestions.length > 0 || categories.length > 0) && (
        <div className="absolute top-12 z-50 w-full rounded-lg border bg-popover shadow-lg">
          {categories.length > 0 && (
            <div className="border-b px-3 py-2">
              <p className="mb-1 text-xs text-muted-foreground">
                {lang === 'tg' ? 'Категорияҳо' : 'Категории'}
              </p>
              {categories.map((cat: any) => (
                <button
                  key={cat.id}
                  onClick={() => router.push(`/catalog/${cat.id}?q=${encodeURIComponent(query)}`)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent"
                >
                  <span>{cat.icon}</span>
                  <span>{lang === 'tg' ? cat.nameTg : cat.nameRu}</span>
                </button>
              ))}
            </div>
          )}

          {suggestions.map(s => (
            <button
              key={s.id}
              onClick={() => router.push(`/product/${s.id}`)}
              className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent"
            >
              <img
                src={s.imageUrl}
                alt=""
                className="h-10 w-10 rounded object-cover"
              />
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-sm [&_mark]:bg-yellow-200 [&_mark]:font-semibold"
                  dangerouslySetInnerHTML={{ __html: s.titleHighlighted ?? s.title }}
                />
                {s.brand && (
                  <p className="text-xs text-muted-foreground">{s.brand}</p>
                )}
              </div>
              <p className="shrink-0 text-sm font-medium">{formatPrice(s.priceDirams)}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Search Results Page

```tsx
// app/search/page.tsx
import { Suspense } from 'react';
import { SearchFilters } from '@/components/search/SearchFilters';
import { SearchHits } from '@/components/search/SearchHits';
import { SearchSort } from '@/components/search/SearchSort';

interface Props {
  searchParams: { q?: string; page?: string; category?: string; sort?: string };
}

export default function SearchPage({ searchParams }: Props) {
  const q = searchParams.q ?? '';

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="mb-4 text-lg font-semibold">
        {q ? `Результаты по «${q}»` : 'Все товары'}
      </h1>

      <div className="flex gap-6">
        <aside className="hidden w-56 shrink-0 lg:block">
          <Suspense>
            <SearchFilters searchParams={searchParams} />
          </Suspense>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-4 flex items-center justify-between">
            <SearchSort current={searchParams.sort} />
          </div>
          <Suspense fallback={<SearchHitsSkeleton />}>
            <SearchHits searchParams={searchParams} />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

function SearchHitsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="h-64 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}
```

---

## Zero-Results Recovery

```typescript
// lib/search/zero-results.ts
import { meiliSearch, INDEXES } from './client';

// When search returns 0 hits, try these recovery strategies in order
export async function recoverFromZeroResults(
  query: string,
  categoryId?: string,
): Promise<{ hits: any[]; strategy: string }> {

  // 1. Spell-correction — Meilisearch does this automatically via typoTolerance
  // If still 0, try:

  // 2. Drop to category-only browse
  if (categoryId) {
    const catResults = await meiliSearch.index(INDEXES.PRODUCTS).search('', {
      filter: [`categoryId = "${categoryId}"`, 'inStock = true'],
      sort: ['orderCount30d:desc'],
      limit: 12,
    });
    if (catResults.hits.length > 0) {
      return { hits: catResults.hits, strategy: 'category_fallback' };
    }
  }

  // 3. Trending products
  const trending = await meiliSearch.index(INDEXES.PRODUCTS).search('', {
    filter: ['inStock = true'],
    sort: ['orderCount30d:desc'],
    limit: 12,
  });

  return { hits: trending.hits, strategy: 'trending_fallback' };
}
```

---

## Environment Variables

```env
# .env.local
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_MASTER_KEY=your-master-key-here
MEILISEARCH_SEARCH_KEY=your-search-only-key-here   # create via Meilisearch API
```

---

## Agent Workflow

When `/search-agent` is invoked:

1. **Audit** — Check if `MEILISEARCH_HOST` is configured. Verify index exists and has documents: `GET /indexes/products/stats`.
2. **Configure** — Run `configureProductsIndex()` if settings are out of date.
3. **Index** — Trigger full reindex or incremental upsert as needed.
4. **Query** — Build the correct filter string from user-provided facets.
5. **Analytics** — Check zero-result queries from Redis, propose synonym additions.
6. **Synonyms** — When asked "why doesn't X return Y", check synonym map and add missing entry.
7. **Performance** — Meilisearch targets <50ms p99. If slow: check `processingTimeMs` in response, review index size, enable `showRankingScore` to debug ranking.

### TJ-specific rules
- Always index both `titleRu` AND `titleTg` — never omit the Tajik field.
- Synonym set must cover RU↔TG equivalents (яхдон=холодильник, кафш=обувь, либос=одежда).
- Price filters use **integer dirams** — never floats. `priceDirams >= 5000` means ≥50 TJS.
- Zero-result queries surface in `/api/admin/search/analytics` — review weekly and add synonyms.
- `regionId` filter ensures ГБАО users don't see items that don't ship there.
