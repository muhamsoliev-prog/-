---
name: seo-agent
description: |-
  Technical SEO for Tajikistan marketplace — Next.js metadata, structured data, sitemap, hreflang RU+TG, Core Web Vitals, and Yandex/Google optimisation.
---

# SEO Agent Skill

## Trigger
`/seo-agent`

## Role
You are the SEO Engineer for a Tajikistan e-commerce marketplace. You implement technical SEO (metadata, structured data, sitemap, robots, Core Web Vitals), content SEO (RU/TG keywords, hreflang), and marketplace-specific schema markup — all optimised for Yandex (dominant in TJ) and Google, on Next.js 14 App Router.

---

## TJ Search Engine Reality

```typescript
const TJ_SEO_CONTEXT = {
  primaryEngine: 'Yandex',       // ~65% market share in Tajikistan
  secondaryEngine: 'Google',     // ~30%
  languages: ['ru', 'tg'],
  hreflangLocales: ['ru-TJ', 'tg-TJ'],
  country: 'TJ',
  currency: 'TJS',
  mobileShare: 0.82,             // 82% mobile → Core Web Vitals critical
  avgConnectionSpeed: '4G',
  yandexBotUA: 'YandexBot',
  googleBotUA: 'Googlebot',
  targetCity: 'Dushanbe',
  timezone: 'Asia/Dushanbe',     // UTC+5
};
```

---

## Next.js Metadata — App Router

```typescript
// lib/seo/metadata.ts
import type { Metadata } from 'next';

const SITE_NAME = 'Бозор.тж';        // replace with actual brand
const SITE_URL  = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bozor.tj';
const LOGO_URL  = `${SITE_URL}/images/logo.png`;

// Base metadata — merged into every page
export const baseMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  generator: 'Next.js',
  referrer: 'origin-when-cross-origin',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large' },
  },
  openGraph: {
    type: 'website',
    locale: 'ru_TJ',
    alternateLocale: ['tg_TJ'],
    siteName: SITE_NAME,
    url: SITE_URL,
    images: [{ url: `${SITE_URL}/og-default.jpg`, width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@bozortj',
  },
  alternates: {
    canonical: SITE_URL,
    languages: {
      'ru-TJ': `${SITE_URL}/ru`,
      'tg-TJ': `${SITE_URL}/tg`,
      'x-default': SITE_URL,
    },
  },
  verification: {
    yandex: process.env.YANDEX_VERIFICATION_CODE,
    google: process.env.GOOGLE_VERIFICATION_CODE,
  },
};

// Product page metadata generator
export function buildProductMetadata(product: {
  id: string;
  titleRu: string;
  titleTg: string;
  descriptionRu: string;
  brand: string | null;
  priceDirams: number;
  originalPriceDirams: number | null;
  imageUrls: string[];
  categoryPathRu: string[];
  inStock: boolean;
  rating: number;
  reviewCount: number;
}): Metadata {
  const priceStr = formatPriceTJS(product.priceDirams);
  const canonicalUrl = `${SITE_URL}/product/${product.id}`;

  const title = product.brand
    ? `${product.titleRu} ${product.brand} — ${priceStr} | ${SITE_NAME}`
    : `${product.titleRu} — ${priceStr} | ${SITE_NAME}`;

  const description = truncate(
    product.descriptionRu || `${product.titleRu} по лучшей цене в Таджикистане. Доставка по Душанбе и всему Таджикистану.`,
    160,
  );

  return {
    title,
    description,
    keywords: buildProductKeywords(product),
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'ru-TJ': canonicalUrl,
        'tg-TJ': `${SITE_URL}/tg/product/${product.id}`,
        'x-default': canonicalUrl,
      },
    },
    openGraph: {
      type: 'og:product' as any,
      url: canonicalUrl,
      title: product.titleRu,
      description,
      images: product.imageUrls.slice(0, 4).map((url, i) => ({
        url,
        alt: `${product.titleRu} — фото ${i + 1}`,
        width: 800,
        height: 800,
      })),
      siteName: SITE_NAME,
      locale: 'ru_TJ',
    },
  };
}

// Category page metadata
export function buildCategoryMetadata(category: {
  id: string;
  nameRu: string;
  nameTg: string;
  descriptionRu?: string;
  productCount: number;
  breadcrumb: string[];
}): Metadata {
  const canonicalUrl = `${SITE_URL}/catalog/${category.id}`;
  const title = `${category.nameRu} — купить в Таджикистане | ${SITE_NAME}`;
  const description =
    category.descriptionRu ??
    `${category.nameRu} по лучшим ценам в Таджикистане. ${category.productCount.toLocaleString('ru')} товаров с доставкой в Душанбе, Худжанд, Куляб и ГБАО.`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'ru-TJ': canonicalUrl,
        'tg-TJ': `${SITE_URL}/tg/catalog/${category.id}`,
        'x-default': canonicalUrl,
      },
    },
    openGraph: {
      url: canonicalUrl,
      title: category.nameRu,
      description,
      siteName: SITE_NAME,
      locale: 'ru_TJ',
    },
  };
}

function buildProductKeywords(p: { titleRu: string; brand: string | null; categoryPathRu: string[] }): string {
  const parts = [p.titleRu];
  if (p.brand) parts.push(p.brand);
  parts.push(...p.categoryPathRu);
  parts.push('купить', 'Таджикистан', 'Душанбе', 'доставка');
  return parts.join(', ');
}

function formatPriceTJS(dirams: number): string {
  return `${(dirams / 100).toLocaleString('ru')} с.`;
}

function truncate(str: string, len: number): string {
  return str.length <= len ? str : str.slice(0, len - 3) + '...';
}
```

---

## Structured Data (JSON-LD)

```typescript
// lib/seo/schema.ts

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bozor.tj';

// Product schema — inject in /product/[id]/page.tsx
export function productSchema(product: {
  id: string;
  titleRu: string;
  descriptionRu: string;
  brand: string | null;
  priceDirams: number;
  originalPriceDirams: number | null;
  imageUrls: string[];
  rating: number;
  reviewCount: number;
  inStock: boolean;
  sku: string;
}) {
  const price = (product.priceDirams / 100).toFixed(2);

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.titleRu,
    description: product.descriptionRu,
    sku: product.sku,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    image: product.imageUrls,
    url: `${SITE_URL}/product/${product.id}`,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'TJS',
      price,
      priceValidUntil: new Date(Date.now() + 7 * 86_400_000).toISOString().split('T')[0],
      availability: product.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: `${SITE_URL}/product/${product.id}`,
      seller: {
        '@type': 'Organization',
        name: 'Бозор.тж',
        url: SITE_URL,
      },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'TJ',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 14,
      },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: '0',
          currency: 'TJS',
        },
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: 'TJ',
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 1, unitCode: 'DAY' },
          transitTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 5, unitCode: 'DAY' },
        },
      },
    },
    ...(product.reviewCount > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: (product.rating / 100).toFixed(1),  // stored ×100
        reviewCount: product.reviewCount,
        bestRating: 5,
        worstRating: 1,
      },
    }),
  };
}

// BreadcrumbList schema
export function breadcrumbSchema(crumbs: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  };
}

// Organization schema — inject once in layout.tsx
export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Бозор.тж',
    url: SITE_URL,
    logo: `${SITE_URL}/images/logo.png`,
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+992-xxx-xx-xx',
      contactType: 'customer service',
      availableLanguage: ['Russian', 'Tajik'],
    },
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'TJ',
      addressLocality: 'Душанбе',
    },
    sameAs: [
      'https://t.me/bozortj',
      'https://www.instagram.com/bozortj',
    ],
  };
}

// WebSite schema with sitelinks searchbox
export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    url: SITE_URL,
    name: 'Бозор.тж',
    inLanguage: ['ru-TJ', 'tg-TJ'],
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

// ItemList schema for category pages
export function itemListSchema(products: Array<{
  id: string;
  titleRu: string;
  priceDirams: number;
  imageUrls: string[];
}>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: products.slice(0, 10).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/product/${p.id}`,
      name: p.titleRu,
    })),
  };
}
```

---

## JSON-LD Component

```tsx
// components/seo/JsonLd.tsx
interface Props {
  schema: Record<string, unknown> | Record<string, unknown>[];
}

export function JsonLd({ schema }: Props) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Usage in app/product/[id]/page.tsx:
// <JsonLd schema={productSchema(product)} />
// <JsonLd schema={breadcrumbSchema(crumbs)} />
```

---

## Sitemap

```typescript
// app/sitemap.ts
import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bozor.tj';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { deletedAt: null, stockQty: { gt: 0 } },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 50_000,   // Google sitemap limit per file
    }),
    prisma.category.findMany({
      select: { id: true, updatedAt: true },
    }),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/catalog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/sellers`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/delivery`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/contacts`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
  ];

  const categoryPages: MetadataRoute.Sitemap = categories.map(c => ({
    url: `${SITE_URL}/catalog/${c.id}`,
    lastModified: c.updatedAt,
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  const productPages: MetadataRoute.Sitemap = products.map(p => ({
    url: `${SITE_URL}/product/${p.id}`,
    lastModified: p.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticPages, ...categoryPages, ...productPages];
}
```

For sites with >50k products, split into sitemap index:

```typescript
// app/sitemap-index.xml/route.ts
export async function GET() {
  const count = await prisma.product.count({ where: { deletedAt: null } });
  const chunkSize = 10_000;
  const chunks = Math.ceil(count / chunkSize);

  const entries = Array.from({ length: chunks }, (_, i) => `
    <sitemap>
      <loc>${process.env.NEXT_PUBLIC_SITE_URL}/sitemap-products-${i}.xml</loc>
      <lastmod>${new Date().toISOString()}</lastmod>
    </sitemap>`).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml', 'Cache-Control': 's-maxage=3600' },
  });
}
```

---

## robots.txt

```typescript
// app/robots.ts
import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bozor.tj';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/checkout/',
          '/account/',
          '/cart',
          '/*?*sort=*',       // prevent duplicate facet URLs from being indexed
          '/*?*page=*',       // paginated duplicates
          '/*?*filter=*',
        ],
      },
      {
        userAgent: 'YandexBot',  // allow Yandex to crawl everything public
        allow: '/',
        disallow: ['/api/', '/admin/', '/checkout/', '/account/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,  // Yandex uses this to declare canonical host
  };
}
```

---

## Canonical URL Hook

```typescript
// lib/seo/canonical.ts

export function buildCanonical(path: string, query?: Record<string, string>): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bozor.tj';
  const url = new URL(path, base);

  // Only allowed query params in canonical URLs (to prevent duplicate content)
  const ALLOWED_PARAMS = new Set(['q', 'category', 'brand']);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (ALLOWED_PARAMS.has(k)) url.searchParams.set(k, v);
    }
  }

  return url.toString();
}
```

---

## Core Web Vitals — Next.js Checklist

```typescript
// next.config.ts additions
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2_592_000,   // 30 days
    deviceSizes: [360, 412, 768, 1080, 1280],  // TJ mobile-first breakpoints
    imageSizes: [16, 32, 64, 96, 128, 256],
  },

  // Compress responses
  compress: true,

  // Cache headers for static assets
  async headers() {
    return [
      {
        source: '/images/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/sitemap.xml',
        headers: [{ key: 'Cache-Control', value: 's-maxage=3600, stale-while-revalidate=86400' }],
      },
    ];
  },
};

export default nextConfig;
```

**LCP (Largest Contentful Paint) — target <2.5s on 4G:**
```tsx
// Always add priority + fetchPriority on hero product image
<Image
  src={product.imageUrls[0]}
  alt={product.titleRu}
  width={600}
  height={600}
  priority          // preload
  fetchPriority="high"
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

**CLS (Cumulative Layout Shift) — target <0.1:**
```tsx
// Always specify width+height on every <Image> — never omit
// Use aspect-ratio CSS on skeleton loaders to hold space
<div className="aspect-square w-full animate-pulse rounded-xl bg-muted" />
```

---

## Hreflang Implementation

```tsx
// app/layout.tsx — root layout
import { baseMetadata } from '@/lib/seo/metadata';

export const metadata = baseMetadata;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        {/* Yandex prefers explicit hreflang in <head> over Next.js alternates for some versions */}
        <link rel="alternate" hrefLang="ru-TJ" href={`${process.env.NEXT_PUBLIC_SITE_URL}/ru`} />
        <link rel="alternate" hrefLang="tg-TJ" href={`${process.env.NEXT_PUBLIC_SITE_URL}/tg`} />
        <link rel="alternate" hrefLang="x-default" href={process.env.NEXT_PUBLIC_SITE_URL} />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

---

## Open Graph Image Generation

```tsx
// app/product/[id]/opengraph-image.tsx
import { ImageResponse } from 'next/og';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OGImage({ params }: { params: { id: string } }) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    select: { titleRu: true, priceDirams: true, imageUrls: true, brand: true },
  });

  if (!product) return new ImageResponse(<div>404</div>, size);

  const price = `${(product.priceDirams / 100).toLocaleString('ru')} с.`;

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          background: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Product image left */}
        <img
          src={product.imageUrls[0]}
          style={{ width: 630, height: 630, objectFit: 'cover' }}
        />
        {/* Details right */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: 48, flex: 1, justifyContent: 'space-between' }}>
          <div>
            {product.brand && (
              <p style={{ fontSize: 24, color: '#6b7280', margin: 0 }}>{product.brand}</p>
            )}
            <p style={{ fontSize: 32, fontWeight: 700, margin: '12px 0', lineHeight: 1.3 }}>
              {product.titleRu}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 48, fontWeight: 800, color: '#e11d48', margin: 0 }}>{price}</p>
            <p style={{ fontSize: 20, color: '#6b7280', marginTop: 8 }}>Бозор.тж</p>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
```

---

## Yandex-Specific Optimisations

```typescript
// lib/seo/yandex.ts

// Yandex Turbo Pages — lightweight AMP-like format for mobile
// Generate at /product/[id]/turbo route
export function buildYandexTurboFeed(products: Array<{
  id: string;
  titleRu: string;
  descriptionRu: string;
  priceDirams: number;
  imageUrls: string[];
  updatedAt: Date;
}>) {
  const items = products.map(p => `
    <item turbo="true">
      <title>${escapeXml(p.titleRu)}</title>
      <link>${process.env.NEXT_PUBLIC_SITE_URL}/product/${p.id}</link>
      <pubDate>${p.updatedAt.toUTCString()}</pubDate>
      <turbo:content>
        <![CDATA[
          <figure><img src="${p.imageUrls[0]}" /></figure>
          <p>${escapeXml(p.descriptionRu?.slice(0, 500) ?? '')}</p>
          <p><strong>Цена: ${(p.priceDirams / 100).toLocaleString('ru')} с.</strong></p>
        ]]>
      </turbo:content>
    </item>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:turbo="http://turbo.yandex.ru">
  <channel>
    <title>Бозор.тж</title>
    <link>${process.env.NEXT_PUBLIC_SITE_URL}</link>
    <language>ru</language>
    ${items}
  </channel>
</rss>`;
}

function escapeXml(str: string): string {
  return str.replace(/[<>&'"]/g, c => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  }[c] ?? c));
}
```

---

## SEO Audit Tool

```typescript
// lib/seo/audit.ts — run periodically or on-demand

interface SEOAuditResult {
  productId: string;
  issues: SEOIssue[];
  score: number;   // 0-100
}

interface SEOIssue {
  severity: 'error' | 'warning' | 'info';
  field: string;
  message: string;
}

export function auditProduct(product: {
  id: string;
  titleRu: string;
  titleTg: string | null;
  descriptionRu: string | null;
  descriptionTg: string | null;
  brand: string | null;
  imageUrls: string[];
  tags: string[];
  priceDirams: number;
  reviewCount: number;
}): SEOAuditResult {
  const issues: SEOIssue[] = [];
  let score = 100;

  // Title checks
  if (!product.titleRu) {
    issues.push({ severity: 'error', field: 'titleRu', message: 'Заголовок на русском отсутствует' });
    score -= 20;
  } else if (product.titleRu.length < 20) {
    issues.push({ severity: 'warning', field: 'titleRu', message: `Заголовок слишком короткий (${product.titleRu.length} симв., нужно ≥20)` });
    score -= 10;
  } else if (product.titleRu.length > 80) {
    issues.push({ severity: 'warning', field: 'titleRu', message: `Заголовок слишком длинный (${product.titleRu.length} симв., оптимально ≤80)` });
    score -= 5;
  }

  if (!product.titleTg) {
    issues.push({ severity: 'warning', field: 'titleTg', message: 'Заголовок на таджикском отсутствует (влияет на tg-TJ hreflang)' });
    score -= 8;
  }

  // Description checks
  if (!product.descriptionRu || product.descriptionRu.length < 100) {
    issues.push({ severity: 'error', field: 'descriptionRu', message: 'Описание отсутствует или слишком короткое (нужно ≥100 символов)' });
    score -= 15;
  }

  if (!product.descriptionTg) {
    issues.push({ severity: 'info', field: 'descriptionTg', message: 'Описание на таджикском отсутствует' });
    score -= 3;
  }

  // Image checks
  if (product.imageUrls.length === 0) {
    issues.push({ severity: 'error', field: 'imageUrls', message: 'Нет изображений — товар не будет показан в Яндекс Картинках' });
    score -= 20;
  } else if (product.imageUrls.length < 3) {
    issues.push({ severity: 'warning', field: 'imageUrls', message: `Мало изображений (${product.imageUrls.length}), рекомендуется ≥3` });
    score -= 5;
  }

  // Tags / keywords
  if (product.tags.length < 3) {
    issues.push({ severity: 'warning', field: 'tags', message: 'Мало тегов — добавьте ≥5 для поиска' });
    score -= 5;
  }

  // Brand
  if (!product.brand) {
    issues.push({ severity: 'info', field: 'brand', message: 'Бренд не указан — влияет на ранжирование по брендовым запросам' });
    score -= 3;
  }

  // Review count (social proof for CTR)
  if (product.reviewCount === 0) {
    issues.push({ severity: 'info', field: 'reviewCount', message: 'Нет отзывов — aggregateRating не будет в сниппете' });
    score -= 3;
  }

  return { productId: product.id, issues, score: Math.max(0, score) };
}

// Bulk audit via API
// GET /api/admin/seo/audit?threshold=70  → returns products with score < threshold
```

---

## SEO Admin Dashboard Component

```tsx
// components/seo/SEODashboard.tsx
'use client';

import { useEffect, useState } from 'react';

interface AuditSummary {
  totalProducts: number;
  avgScore: number;
  issuesByType: { field: string; count: number; severity: string }[];
  lowScoreProducts: { id: string; titleRu: string; score: number }[];
}

export function SEODashboard() {
  const [data, setData] = useState<AuditSummary | null>(null);

  useEffect(() => {
    fetch('/api/admin/seo/summary').then(r => r.json()).then(setData);
  }, []);

  if (!data) return <div className="animate-pulse h-40 bg-muted rounded-xl" />;

  const scoreColor = (s: number) =>
    s >= 80 ? 'text-green-600' : s >= 60 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-lg font-semibold">SEO Аудит</h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KPI label="Товаров всего" value={data.totalProducts.toLocaleString('ru')} />
        <KPI
          label="Средний SEO-балл"
          value={`${data.avgScore.toFixed(0)}/100`}
          className={scoreColor(data.avgScore)}
        />
        <KPI label="Проблем" value={data.issuesByType.reduce((s, i) => s + i.count, 0).toString()} />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium">Товары с низким баллом</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-2">Товар</th>
              <th className="pb-2 text-right">Балл</th>
            </tr>
          </thead>
          <tbody>
            {data.lowScoreProducts.map(p => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="py-2 truncate max-w-[200px]">{p.titleRu}</td>
                <td className={`py-2 text-right font-bold ${scoreColor(p.score)}`}>{p.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KPI({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold ${className}`}>{value}</p>
    </div>
  );
}
```

---

## Keyword Strategy — TJ Market

```typescript
// High-value Russian search queries for TJ marketplace

const TJ_KEYWORD_CLUSTERS = {
  intent_buy: [
    'купить {товар} в душанбе',
    'купить {товар} в таджикистане',
    '{товар} цена таджикистан',
    '{товар} с доставкой душанбе',
    '{товар} дешево душанбе',
  ],
  intent_compare: [
    '{товар} отзывы таджикистан',
    'лучший {товар} таджикистан',
  ],
  local: [
    'интернет магазин таджикистан',
    'онлайн шопинг душанбе',
    'маркетплейс таджикистан',
    'маркетплейс душанбе',
  ],
  tajik_language: [
    'харид кардан {мол} дар душанбе',   // "buy {product} in Dushanbe" in Tajik
    '{мол} нархи таҷикистон',            // "{product} price tajikistan"
  ],
};

// Meta description templates (fill in per category)
const META_DESC_TEMPLATES = {
  category: (name: string, count: number) =>
    `${name} — ${count.toLocaleString('ru')} товаров с доставкой в Душанбе, Худжанд, Куляб и ГБАО. Лучшие цены в Таджикистане.`,
  product: (title: string, price: string, brand?: string) =>
    `${brand ? brand + ' ' : ''}${title} — ${price}. Быстрая доставка по Таджикистану. Оплата при получении.`,
  brand: (brand: string, count: number) =>
    `${brand} — ${count} товаров в Таджикистане. Официальные цены, доставка в Душанбе за 1-2 дня.`,
};
```

---

## Environment Variables Required

```env
NEXT_PUBLIC_SITE_URL=https://bozor.tj
YANDEX_VERIFICATION_CODE=xxxxxxxxxxxxxxxx   # from Yandex Webmaster
GOOGLE_VERIFICATION_CODE=xxxxxxxxxxxxxxxx   # from Google Search Console
```

---

## Agent Workflow

When `/seo-agent` is invoked:

1. **Audit** — Run `auditProduct()` against recent/flagged products. Surface top issues by severity.
2. **Metadata** — Generate or update `buildProductMetadata()` / `buildCategoryMetadata()` for the target page.
3. **Schema** — Inject `productSchema()` + `breadcrumbSchema()` as `<JsonLd>` in the correct page file.
4. **Sitemap** — Check `app/sitemap.ts` exists and covers products + categories. Verify `robots.ts` disallows `/api/` and checkout paths.
5. **Images** — Confirm hero image has `priority` + `fetchPriority="high"` for LCP.
6. **Keywords** — For new categories, propose title/description using `META_DESC_TEMPLATES`.
7. **Yandex Turbo** — For high-traffic product pages, generate Turbo feed at `/turbo.xml`.
8. **Hreflang** — Confirm every page has `ru-TJ`, `tg-TJ`, and `x-default` alternates.

### Non-negotiable rules
- Every `<Image>` must have `alt` in Russian (or Tajik when `lang=tg`).
- Canonical URLs must never include pagination (`?page=`) or sort (`?sort=`) params.
- Price in schema uses TJS currency code, value as decimal string — never as integer dirams.
- `host` directive in robots.txt must match `NEXT_PUBLIC_SITE_URL` exactly (Yandex requires it).
- Sitemap `lastModified` must reflect actual DB `updatedAt` — never `new Date()` on product entries.
- Product score <70 → flag for seller to fix before listing goes live.
