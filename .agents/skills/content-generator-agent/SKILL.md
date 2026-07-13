---
name: content-generator-agent
description: |-
  Bilingual RU+TG content generation — product descriptions, category texts, SEO meta, email copy, push notifications, and Telegram channel posts for Tajikistan market.
---

# Content Generator Agent Skill

## Trigger
`/content-generator-agent`

## Role
You are the Content Generation Engineer for a Tajikistan marketplace. You generate product titles, descriptions, SEO tags, and category copy in Russian and Tajik using Claude Sonnet-5 — tuned for Yandex search, TJ buying patterns, and seller self-service. All generated content is stored, reviewed, and can be auto-published after human approval or A/B tested.

---

## Generation API

```typescript
// app/api/content/generate/route.ts
import Anthropic from '@anthropic-ai/sdk';
import { trackAIUsage } from '@/lib/ai-usage';
import { prisma } from '@/lib/prisma';

const anthropic = new Anthropic();

export interface ContentRequest {
  productId: string;
  categoryId: string;
  attributes: Record<string, string>;  // { brand, color, material, weight, ... }
  imageUrls: string[];
  targetPriceDirams: number;
  competitorTitles?: string[];
  sellerHints?: string;                // seller notes in any language
  lang: 'both' | 'ru' | 'tg';
}

export interface GeneratedContent {
  titleRu: string;
  titleTg: string;
  descriptionRu: string;
  descriptionTg: string;
  bulletPointsRu: string[];
  bulletPointsTg: string[];
  seoTagsRu: string[];
  searchKeywordsRu: string[];
  suggestedPriceDirams: number;
}

export async function POST(req: Request) {
  const body: ContentRequest = await req.json();

  const content = await generateProductContent(body);

  // Save draft for seller approval
  const draft = await prisma.contentDraft.create({
    data: {
      productId: body.productId,
      titleRu: content.titleRu,
      titleTg: content.titleTg,
      descriptionRu: content.descriptionRu,
      descriptionTg: content.descriptionTg,
      bulletPointsRu: content.bulletPointsRu,
      bulletPointsTg: content.bulletPointsTg,
      seoTagsRu: content.seoTagsRu,
      suggestedPriceDirams: BigInt(content.suggestedPriceDirams),
      status: 'pending_review',
    },
  });

  return Response.json({ draftId: draft.id, content });
}

async function generateProductContent(req: ContentRequest): Promise<GeneratedContent> {
  const price = `${req.targetPriceDirams / 100} с.`;
  const attrs = Object.entries(req.attributes)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');

  const prompt = `Создай контент для товара на маркетплейсе Таджикистана.

АТРИБУТЫ: ${attrs}
ЦЕНА: ${price}
${req.competitorTitles?.length ? `КОНКУРЕНТЫ: ${req.competitorTitles.slice(0, 3).join(' | ')}` : ''}
${req.sellerHints ? `ЗАМЕТКИ ПРОДАВЦА: ${req.sellerHints}` : ''}

ТРЕБОВАНИЯ:
- titleRu: 40-70 символов, ключевое слово в начале, без воды
- titleTg: перевод на таджикский, 40-70 символов
- descriptionRu: 200-400 слов, выгоды покупателя, ключевые слова для Яндекса
- descriptionTg: 150-300 слов на таджикском
- bulletPointsRu: 5 кратких преимуществ (каждый до 80 символов)
- bulletPointsTg: 5 преимуществ на таджикском
- seoTagsRu: 10 поисковых тегов через запятую
- searchKeywordsRu: 8 ключевых запросов покупателей
- suggestedPriceDirams: рекомендуемая цена в дирамах (integer)

Верни строго JSON без markdown-обёртки.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  await trackAIUsage('claude-sonnet-5', 'content_generator',
    response.usage.input_tokens, response.usage.output_tokens);

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  return jsonMatch ? JSON.parse(jsonMatch[0]) : {
    titleRu: '', titleTg: '', descriptionRu: '', descriptionTg: '',
    bulletPointsRu: [], bulletPointsTg: [], seoTagsRu: [], searchKeywordsRu: [],
    suggestedPriceDirams: req.targetPriceDirams,
  };
}
```

---

## Bulk Content Generation

```typescript
// lib/content/bulk-generator.ts
import { contentGeneratorQueue } from '@/lib/queues/content';

export async function bulkGenerateForSeller(sellerId: string): Promise<void> {
  const products = await prisma.product.findMany({
    where: {
      sellerId,
      deletedAt: null,
      OR: [
        { descriptionRu: null },
        { descriptionRu: { equals: '' } },
        { titleTg: null },
      ],
    },
    select: { id: true, categoryId: true, attributes: true, priceDirams: true, titleRu: true },
    take: 100,
  });

  for (const product of products) {
    await contentGeneratorQueue.add(
      'generate-product-content',
      { productId: product.id },
      { attempts: 2, backoff: { type: 'exponential', delay: 5_000 } },
    );
  }
}
```

---

## Content Quality Scorer

```typescript
// lib/content/scorer.ts

export interface ContentScore {
  total: number;       // 0-100
  titleScore: number;
  descScore: number;
  tagjScore: number;
  bilingualScore: number;
  issues: string[];
}

export function scoreContent(content: {
  titleRu?: string; titleTg?: string;
  descriptionRu?: string; descriptionTg?: string;
  seoTagsRu?: string[];
}): ContentScore {
  const issues: string[] = [];
  let total = 100;

  // Title
  const trLen = content.titleRu?.length ?? 0;
  const titleScore = trLen >= 40 && trLen <= 70 ? 25 : trLen > 0 ? 15 : 0;
  if (trLen < 40) issues.push(`Заголовок RU короткий (${trLen} симв, нужно 40-70)`);
  if (trLen > 70) issues.push(`Заголовок RU длинный (${trLen} симв)`);

  // Description
  const drLen = content.descriptionRu?.length ?? 0;
  const descScore = drLen >= 200 ? 35 : drLen >= 100 ? 20 : 0;
  if (drLen < 200) issues.push(`Описание RU короткое (${drLen} симв, нужно 200+)`);

  // Tags
  const tagCount = content.seoTagsRu?.length ?? 0;
  const tagScore = tagCount >= 8 ? 20 : tagCount >= 5 ? 12 : 0;
  if (tagCount < 8) issues.push(`Мало SEO-тегов (${tagCount}, нужно 8+)`);

  // Bilingual
  const bilingualScore = (content.titleTg?.length ?? 0) > 0 && (content.descriptionTg?.length ?? 0) > 0 ? 20 : 5;
  if (!content.titleTg) issues.push('Отсутствует заголовок на таджикском');
  if (!content.descriptionTg) issues.push('Отсутствует описание на таджикском');

  total = titleScore + descScore + tagScore + bilingualScore;

  return { total, titleScore, descScore, tagjScore: tagScore, bilingualScore, issues };
}
```

---

## Prisma Model

```prisma
model ContentDraft {
  id                  String   @id @default(cuid())
  productId           String
  titleRu             String
  titleTg             String
  descriptionRu       String
  descriptionTg       String
  bulletPointsRu      String[]
  bulletPointsTg      String[]
  seoTagsRu           String[]
  suggestedPriceDirams BigInt
  qualityScore        Int      @default(0)
  status              String   @default("pending_review")  // pending_review | approved | rejected | published
  sellerApprovedAt    DateTime?
  publishedAt         DateTime?
  createdAt           DateTime @default(now())

  @@index([productId])
  @@index([status])
}
```

---

## Seller Content Review UI

```tsx
// components/seller/ContentReview.tsx
'use client';

import { useState } from 'react';

interface Draft {
  id: string; titleRu: string; titleTg: string;
  descriptionRu: string; descriptionTg: string;
  bulletPointsRu: string[]; seoTagsRu: string[];
  qualityScore: number;
}

export function ContentReview({ draft }: { draft: Draft }) {
  const [tab, setTab] = useState<'ru' | 'tg'>('ru');

  async function approve() {
    await fetch(`/api/seller/content/${draft.id}/approve`, { method: 'POST' });
  }
  async function reject() {
    await fetch(`/api/seller/content/${draft.id}/reject`, { method: 'POST' });
  }

  return (
    <div className="space-y-4 rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Проверка контента AI</h3>
        <span className={`text-sm font-bold ${draft.qualityScore >= 75 ? 'text-green-600' : 'text-yellow-600'}`}>
          Балл: {draft.qualityScore}/100
        </span>
      </div>

      {/* Language tabs */}
      <div className="flex gap-2">
        {(['ru', 'tg'] as const).map(l => (
          <button key={l} onClick={() => setTab(l)}
            className={`rounded px-3 py-1 text-sm ${tab === l ? 'bg-primary text-white' : 'bg-muted'}`}>
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Заголовок</p>
          <p className="font-medium">{tab === 'ru' ? draft.titleRu : draft.titleTg}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Описание</p>
          <p className="text-sm leading-relaxed">{tab === 'ru' ? draft.descriptionRu.slice(0, 300) : '...'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">SEO-теги</p>
          <div className="flex flex-wrap gap-1">
            {draft.seoTagsRu.map(t => (
              <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-xs">{t}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={approve} className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-medium text-white">
          ✓ Опубликовать
        </button>
        <button onClick={reject} className="flex-1 rounded-lg bg-muted py-2 text-sm font-medium">
          ✗ Отклонить
        </button>
      </div>
    </div>
  );
}
```

---

## Agent Workflow

1. **Trigger** — Called from seller dashboard "Улучшить описание" button or bulk-generate job.
2. **Attributes** — Always pass all known product attributes; richer input = better output.
3. **Competitor hints** — Fetch top-3 competitor titles from Meilisearch before generating.
4. **Review gate** — All drafts go to `pending_review`; seller approves before publish.
5. **Quality gate** — Auto-reject drafts with `qualityScore < 50`. Re-generate with `sellerHints`.
6. **Cost** — Sonnet-5 per product ~1000 in + 600 out tokens ≈ $0.012. Bulk 1000 products ≈ $12.
7. **Language** — Always generate both RU and TG; never skip Tajik even if seller requests `lang='ru'`.
