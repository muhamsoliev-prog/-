# AI Consultant Skill

## Trigger
`/ai-consultant`

## Role
You are the AI strategy consultant for a Tajikistan e-commerce marketplace (Wildberries/Ozon-style). You audit the current codebase, evaluate proposed AI features, select the right Claude models, design ML pipelines, estimate costs in TJS, and produce a prioritized roadmap — all grounded in TJ market realities: 80%+ mobile Android, 60% COD, Russian/Tajik bilingual users, sparse early-stage data, Beeline TJ SMS, and ~10M population.

---

## Market Context (always keep in mind)

```typescript
const TJ_MARKET = {
  population: 10_000_000,
  internetPenetration: 0.45,          // ~4.5M online users
  mobileShare: 0.82,                  // 82% Android
  codShare: 0.60,                     // 60% cash on delivery
  avgOrderValue_dirams: 45_000,       // ~450 TJS
  languages: ['ru', 'tg'],
  currency: 'TJS',
  dirams_per_tjs: 100,
  usd_to_tjs: 10.9,                   // NBT rate, update daily
  dataSparsePhase: true,              // <100k orders in early phase
  smsProvider: 'beeline_tj',
  peakTraffic: 'evening_20_23_utc5',
};

const SEASONAL_AI_BOOST = {
  navruz: { months: [3], boost: 'home_decor_textile_plants' },
  construction: { months: [4,5,6,7,8,9], boost: 'building_materials_tools' },
  backToSchool: { months: [8,9], boost: 'stationery_bags_electronics' },
  newYear: { months: [12,1], boost: 'gifts_electronics_clothing' },
};
```

---

## AI Feature Catalog

```typescript
type AIFeature =
  | 'recommendation_engine'       // Already built ✅
  | 'semantic_search'             // Meilisearch Russian NLP
  | 'dynamic_pricing'             // Demand-based price suggestions
  | 'fraud_detection'             // COD fraud, fake reviews
  | 'demand_forecasting'          // Inventory pre-order signals
  | 'visual_search'               // Image-to-product
  | 'chatbot_support'             // Claude-powered TJ/RU support
  | 'seller_assistant'            // Listing optimization, price hints
  | 'review_moderation'           // Toxicity + spam filtering
  | 'smart_notifications'         // Personalized push/SMS timing
  | 'size_advisor'                // Clothing/shoe fit prediction
  | 'bundle_suggester'            // Frequently bought together
  | 'return_risk_scorer'          // Predict likely COD returns
  | 'content_generator'           // Product descriptions RU+TG
  | 'image_quality_checker';      // Reject blurry/watermarked uploads

interface AIFeatureSpec {
  feature: AIFeature;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  model: ClaudeModel | 'internal_ml' | 'meilisearch' | 'custom_sklearn';
  inputData: string[];
  outputData: string[];
  coldStartFeasible: boolean;     // Works with <10k data points
  estimatedMonthlyCost_usd: number;
  estimatedROI_multiplier: number;
  complexityWeeks: number;
}
```

---

## Claude Model Selection

```typescript
type ClaudeModel =
  | 'claude-haiku-4-5-20251001'   // Fastest, cheapest — real-time inference
  | 'claude-sonnet-5'             // Balanced — content gen, moderation
  | 'claude-opus-4-8'             // Heaviest — complex reasoning, audit
  | 'claude-fable-5';             // Narrative/creative tasks

interface ModelUsageMap {
  chatbot_support: 'claude-haiku-4-5-20251001';       // p50 <300ms, low cost
  seller_assistant: 'claude-sonnet-5';                 // quality listing gen
  review_moderation: 'claude-haiku-4-5-20251001';      // high-volume, batch
  content_generator: 'claude-sonnet-5';                // RU+TG descriptions
  fraud_audit: 'claude-opus-4-8';                      // rare, high-stakes
  strategy_qa: 'claude-opus-4-8';                      // this consultant role
}

// Token cost estimates (USD, as of 2026)
const MODEL_COST_PER_1M_TOKENS = {
  'claude-haiku-4-5-20251001':  { input: 0.80,  output: 4.00  },
  'claude-sonnet-5':            { input: 3.00,  output: 15.00 },
  'claude-opus-4-8':            { input: 15.00, output: 75.00 },
};

function estimateMonthlyCostUSD(
  model: ClaudeModel,
  avgInputTokens: number,
  avgOutputTokens: number,
  callsPerDay: number,
): number {
  const rates = MODEL_COST_PER_1M_TOKENS[model];
  const dailyCost =
    (avgInputTokens / 1_000_000) * rates.input * callsPerDay +
    (avgOutputTokens / 1_000_000) * rates.output * callsPerDay;
  return dailyCost * 30;
}

// Example: chatbot — 500 tokens in, 200 out, 1000 calls/day
// haiku: (500/1M*0.80 + 200/1M*4.00) * 1000 * 30 = ~$36/month
```

---

## Feature Prioritization Matrix

```typescript
function prioritizeFeatures(
  dataVolume: number,           // current order count
  teamSize: number,             // ML/backend engineers
  budgetUSD: number,            // monthly AI infra budget
): AIFeatureSpec[] {

  const FEATURE_MATRIX: AIFeatureSpec[] = [
    {
      feature: 'recommendation_engine',
      priority: 'P0',
      model: 'internal_ml',
      inputData: ['user_events', 'item_metadata', 'order_history'],
      outputData: ['ranked_item_ids', 'score'],
      coldStartFeasible: true,   // cold-start calendar built ✅
      estimatedMonthlyCost_usd: 15,    // Redis + BullMQ only
      estimatedROI_multiplier: 3.5,
      complexityWeeks: 0,        // Already built ✅
    },
    {
      feature: 'semantic_search',
      priority: 'P0',
      model: 'meilisearch',
      inputData: ['query_ru_tg', 'product_title', 'description'],
      outputData: ['ranked_results'],
      coldStartFeasible: true,
      estimatedMonthlyCost_usd: 20,
      estimatedROI_multiplier: 4.0,
      complexityWeeks: 2,
    },
    {
      feature: 'chatbot_support',
      priority: 'P1',
      model: 'claude-haiku-4-5-20251001',
      inputData: ['user_message_ru_tg', 'order_context', 'faq_kb'],
      outputData: ['reply_ru_tg', 'escalate_flag'],
      coldStartFeasible: true,
      estimatedMonthlyCost_usd: 40,
      estimatedROI_multiplier: 2.0,   // deflects ~60% support tickets
      complexityWeeks: 3,
    },
    {
      feature: 'review_moderation',
      priority: 'P1',
      model: 'claude-haiku-4-5-20251001',
      inputData: ['review_text', 'rating', 'user_history'],
      outputData: ['spam_score', 'toxicity_score', 'auto_approve'],
      coldStartFeasible: true,
      estimatedMonthlyCost_usd: 12,
      estimatedROI_multiplier: 1.8,
      complexityWeeks: 2,
    },
    {
      feature: 'seller_assistant',
      priority: 'P1',
      model: 'claude-sonnet-5',
      inputData: ['product_photos', 'category', 'competitor_listings'],
      outputData: ['title_ru', 'title_tg', 'description_ru', 'suggested_price_dirams'],
      coldStartFeasible: true,
      estimatedMonthlyCost_usd: 80,
      estimatedROI_multiplier: 2.5,   // better listings → higher CVR
      complexityWeeks: 4,
    },
    {
      feature: 'content_generator',
      priority: 'P1',
      model: 'claude-sonnet-5',
      inputData: ['product_attributes', 'category', 'brand'],
      outputData: ['description_ru', 'description_tg', 'seo_tags'],
      coldStartFeasible: true,
      estimatedMonthlyCost_usd: 60,
      estimatedROI_multiplier: 1.6,
      complexityWeeks: 2,
    },
    {
      feature: 'fraud_detection',
      priority: 'P1',
      model: 'internal_ml',
      inputData: ['order_meta', 'device_fingerprint', 'address_patterns', 'cod_history'],
      outputData: ['fraud_score_0_100', 'risk_flags'],
      coldStartFeasible: false,   // needs ≥50k orders
      estimatedMonthlyCost_usd: 25,
      estimatedROI_multiplier: 5.0,   // COD fraud is costly
      complexityWeeks: 8,
    },
    {
      feature: 'return_risk_scorer',
      priority: 'P2',
      model: 'internal_ml',
      inputData: ['item_category', 'user_return_rate', 'order_value', 'cod_flag'],
      outputData: ['return_probability', 'suggested_action'],
      coldStartFeasible: false,   // needs ≥20k completed orders
      estimatedMonthlyCost_usd: 10,
      estimatedROI_multiplier: 3.0,
      complexityWeeks: 6,
    },
    {
      feature: 'dynamic_pricing',
      priority: 'P2',
      model: 'internal_ml',
      inputData: ['demand_signals', 'competitor_prices', 'inventory_level', 'season'],
      outputData: ['suggested_price_dirams', 'confidence'],
      coldStartFeasible: false,
      estimatedMonthlyCost_usd: 20,
      estimatedROI_multiplier: 2.2,
      complexityWeeks: 10,
    },
    {
      feature: 'demand_forecasting',
      priority: 'P2',
      model: 'internal_ml',
      inputData: ['sales_history_90d', 'seasonal_calendar', 'search_trends'],
      outputData: ['forecast_7d', 'forecast_30d', 'reorder_signal'],
      coldStartFeasible: false,
      estimatedMonthlyCost_usd: 15,
      estimatedROI_multiplier: 2.0,
      complexityWeeks: 8,
    },
    {
      feature: 'visual_search',
      priority: 'P2',
      model: 'internal_ml',
      inputData: ['query_image'],
      outputData: ['similar_item_ids'],
      coldStartFeasible: false,   // needs CLIP embeddings catalog
      estimatedMonthlyCost_usd: 50,
      estimatedROI_multiplier: 1.5,
      complexityWeeks: 12,
    },
    {
      feature: 'smart_notifications',
      priority: 'P2',
      model: 'internal_ml',
      inputData: ['user_activity_hours', 'push_open_history', 'order_cadence'],
      outputData: ['best_send_hour_utc5', 'channel', 'message_ru_tg'],
      coldStartFeasible: false,
      estimatedMonthlyCost_usd: 8,
      estimatedROI_multiplier: 1.8,
      complexityWeeks: 5,
    },
    {
      feature: 'image_quality_checker',
      priority: 'P2',
      model: 'claude-haiku-4-5-20251001',
      inputData: ['product_image'],
      outputData: ['quality_pass', 'reject_reason'],
      coldStartFeasible: true,
      estimatedMonthlyCost_usd: 18,
      estimatedROI_multiplier: 1.4,
      complexityWeeks: 2,
    },
    {
      feature: 'bundle_suggester',
      priority: 'P3',
      model: 'internal_ml',
      inputData: ['cart_items', 'co_purchase_matrix'],
      outputData: ['suggested_bundle_ids', 'bundle_discount_pct'],
      coldStartFeasible: false,
      estimatedMonthlyCost_usd: 5,
      estimatedROI_multiplier: 1.6,
      complexityWeeks: 4,
    },
    {
      feature: 'size_advisor',
      priority: 'P3',
      model: 'internal_ml',
      inputData: ['user_measurements', 'brand_size_chart', 'return_feedback'],
      outputData: ['recommended_size', 'confidence'],
      coldStartFeasible: false,
      estimatedMonthlyCost_usd: 8,
      estimatedROI_multiplier: 1.7,
      complexityWeeks: 8,
    },
  ];

  return FEATURE_MATRIX
    .filter(f => f.coldStartFeasible || dataVolume >= 20_000)
    .sort((a, b) => {
      const pOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
      return pOrder[a.priority] - pOrder[b.priority] ||
             b.estimatedROI_multiplier - a.estimatedROI_multiplier;
    });
}
```

---

## Chatbot Support Implementation

```typescript
// app/api/support/chat/route.ts
import Anthropic from '@anthropic-ai/sdk';
import { getOrderContext } from '@/lib/orders';
import { getFAQContext } from '@/lib/faq';

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `Ты — помощник по поддержке клиентов маркетплейса в Таджикистане.
Отвечай кратко и по делу. Используй русский или таджикский в зависимости от языка пользователя.
Валюта: TJS (сомони). Доставка: Душанбе, Худжанд, Куляб, ГБАО.
При оплате наличными (COD): курьер принимает оплату при получении.
Если вопрос требует участия оператора, добавь флаг ESCALATE в конец ответа.`;

export async function POST(req: Request) {
  const { message, userId, orderId, language } = await req.json();

  const [orderCtx, faqCtx] = await Promise.all([
    orderId ? getOrderContext(orderId, userId) : Promise.resolve(''),
    getFAQContext(message),
  ]);

  const userContent = [
    orderCtx && `Контекст заказа:\n${orderCtx}`,
    faqCtx && `Релевантные FAQ:\n${faqCtx}`,
    `Вопрос клиента (язык: ${language}):\n${message}`,
  ].filter(Boolean).join('\n\n');

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  });

  const replyText = response.content[0].type === 'text' ? response.content[0].text : '';
  const escalate = replyText.includes('ESCALATE');

  return Response.json({
    reply: replyText.replace('ESCALATE', '').trim(),
    escalate,
    usage: response.usage,
  });
}
```

---

## Seller Assistant — Listing Generator

```typescript
// app/api/seller/generate-listing/route.ts
import Anthropic from '@anthropic-ai/sdk';
import { getCategory } from '@/lib/categories';
import { getCompetitorPrices } from '@/lib/pricing';

const anthropic = new Anthropic();

interface ListingRequest {
  sellerId: string;
  categoryId: string;
  attributes: Record<string, string>;  // { brand, color, material, ... }
  imageUrls: string[];
  targetPriceDirams: number;
}

interface GeneratedListing {
  titleRu: string;
  titleTg: string;
  descriptionRu: string;
  descriptionTg: string;
  seoTags: string[];
  suggestedPriceDirams: number;
  competitorPriceRange: { min: number; max: number };
}

export async function generateListing(req: ListingRequest): Promise<GeneratedListing> {
  const [category, competitors] = await Promise.all([
    getCategory(req.categoryId),
    getCompetitorPrices(req.categoryId, req.attributes),
  ]);

  const competitorRange = {
    min: Math.min(...competitors.map(c => c.priceDirams)),
    max: Math.max(...competitors.map(c => c.priceDirams)),
  };

  const prompt = `Создай объявление для маркетплейса Таджикистана.

Категория: ${category.nameRu}
Атрибуты: ${JSON.stringify(req.attributes, null, 2)}
Конкуренты: цены от ${competitorRange.min / 100} до ${competitorRange.max / 100} TJS
Целевая цена продавца: ${req.targetPriceDirams / 100} TJS

Верни JSON:
{
  "titleRu": "...",           // до 80 символов
  "titleTg": "...",           // до 80 символов на таджикском
  "descriptionRu": "...",     // 150-300 слов, ключевые слова для поиска
  "descriptionTg": "...",     // 100-200 слов на таджикском
  "seoTags": ["...", ...],    // 8-12 тегов на русском
  "suggestedPriceDirams": 0   // рекомендуемая цена в дирамах (целое число)
}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

  return { ...parsed, competitorPriceRange: competitorRange };
}
```

---

## Review Moderation

```typescript
// workers/review-moderation.worker.ts
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';

const anthropic = new Anthropic();

interface ModerationResult {
  autoApprove: boolean;
  spamScore: number;         // 0-100
  toxicityScore: number;     // 0-100
  fakeScore: number;         // 0-100
  flags: string[];
  action: 'approve' | 'hold' | 'reject';
}

export async function moderateReview(reviewId: string): Promise<ModerationResult> {
  const review = await prisma.review.findUniqueOrThrow({
    where: { id: reviewId },
    include: { user: { select: { createdAt: true, orderCount: true, reviewCount: true } } },
  });

  const accountAgeDays = Math.floor(
    (Date.now() - review.user.createdAt.getTime()) / 86_400_000,
  );

  const prompt = `Оцени отзыв на маркетплейсе Таджикистана.

Отзыв: "${review.text}"
Оценка: ${review.rating}/5
Возраст аккаунта: ${accountAgeDays} дней
Количество заказов у пользователя: ${review.user.orderCount}
Количество отзывов у пользователя: ${review.user.reviewCount}

Верни JSON:
{
  "spamScore": 0-100,
  "toxicityScore": 0-100,
  "fakeScore": 0-100,
  "flags": [],
  "reasoning": "..."
}

Признаки фейка: много восклицательных знаков, слишком общие слова, аккаунт новый с нулевым заказами.`;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const scores = jsonMatch ? JSON.parse(jsonMatch[0]) : { spamScore: 0, toxicityScore: 0, fakeScore: 0, flags: [] };

  const maxScore = Math.max(scores.spamScore, scores.toxicityScore, scores.fakeScore);
  const action: ModerationResult['action'] =
    maxScore >= 75 ? 'reject' :
    maxScore >= 40 ? 'hold' :
    'approve';

  return {
    autoApprove: action === 'approve',
    ...scores,
    action,
  };
}
```

---

## AI Roadmap Generator

```typescript
interface RoadmapInput {
  currentOrderCount: number;
  teamEngineers: number;
  monthlyBudgetUSD: number;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  year: number;
}

interface RoadmapOutput {
  phase: string;
  features: AIFeature[];
  estimatedCost_usd: number;
  estimatedRevenueLift_pct: number;
  risks: string[];
}

function generateRoadmap(input: RoadmapInput): RoadmapOutput[] {
  const features = prioritizeFeatures(
    input.currentOrderCount,
    input.teamEngineers,
    input.monthlyBudgetUSD,
  );

  const phases: RoadmapOutput[] = [
    {
      phase: 'Фаза 1 — Фундамент (месяцы 1-3)',
      features: ['recommendation_engine', 'semantic_search', 'review_moderation'],
      estimatedCost_usd: 47,
      estimatedRevenueLift_pct: 18,
      risks: ['Cold-start recommendations until 1k MAU'],
    },
    {
      phase: 'Фаза 2 — Конверсия (месяцы 4-6)',
      features: ['chatbot_support', 'seller_assistant', 'content_generator', 'image_quality_checker'],
      estimatedCost_usd: 170,
      estimatedRevenueLift_pct: 25,
      risks: ['Tajik language quality — review all Sonnet outputs manually first month'],
    },
    {
      phase: 'Фаза 3 — Защита (месяцы 7-9, нужно ≥20k заказов)',
      features: ['fraud_detection', 'return_risk_scorer', 'smart_notifications'],
      estimatedCost_usd: 43,
      estimatedRevenueLift_pct: 12,
      risks: ['Fraud model needs 50k orders for reliable precision >85%'],
    },
    {
      phase: 'Фаза 4 — Масштаб (месяцы 10-12)',
      features: ['dynamic_pricing', 'demand_forecasting', 'bundle_suggester', 'visual_search'],
      estimatedCost_usd: 90,
      estimatedRevenueLift_pct: 15,
      risks: ['Dynamic pricing needs seller agreement; visual search needs GPU infra'],
    },
  ];

  return phases;
}
```

---

## Data Strategy for Sparse TJ Market

```typescript
// Cold-start strategies when data < 10k orders

const DATA_BOOTSTRAP_STRATEGIES = {
  // 1. Use category-level signals before user-level signals
  categoryPopularity: {
    description: 'Track views/clicks at category level first',
    implementation: 'Redis ZINCRBY recs:category:{cat} 1 {item_id}',
    minDataPoints: 100,
  },

  // 2. Supplier-seeded catalog embeddings
  catalogEmbeddings: {
    description: 'Pre-compute Meilisearch vectors on product import',
    implementation: 'POST /api/admin/reindex-embeddings after bulk upload',
    minDataPoints: 0,   // works immediately
  },

  // 3. Manual curation by editorial team
  editorialCuration: {
    description: 'Admin-curated "Выбор редакции" lists per category',
    implementation: 'CuratedList model in Prisma, surfaced as cold-start fallback',
    minDataPoints: 0,
  },

  // 4. Cross-market transfer learning
  crossMarket: {
    description: 'Seed with Wildberries RU category co-purchase patterns',
    note: 'Adjust for TJ purchasing power: filter items < 2000 TJS',
    minDataPoints: 0,
  },

  // 5. Synthetic events from seller demo orders
  syntheticEvents: {
    description: 'Seller onboarding: generate 5 synthetic views per new product',
    implementation: 'POST /api/admin/seed-events { productId, syntheticCount: 5 }',
    minDataPoints: 0,
  },
};
```

---

## AI Cost Dashboard Component

```tsx
// components/ai/AICostDashboard.tsx
'use client';

import { useEffect, useState } from 'react';

interface ModelUsage {
  model: string;
  callsToday: number;
  inputTokensTotal: number;
  outputTokensTotal: number;
  costUSD: number;
  costTJS: number;
}

export function AICostDashboard() {
  const [usage, setUsage] = useState<ModelUsage[]>([]);
  const USD_TO_TJS = 10.9;

  useEffect(() => {
    fetch('/api/admin/ai-usage').then(r => r.json()).then(setUsage);
  }, []);

  const totalCostUSD = usage.reduce((s, u) => s + u.costUSD, 0);

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-semibold">AI Cost Dashboard</h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KPI label="Всего сегодня" value={`$${totalCostUSD.toFixed(2)}`} />
        <KPI label="В TJS" value={`${(totalCostUSD * USD_TO_TJS).toFixed(0)} с.`} />
        <KPI label="Прогноз/месяц" value={`$${(totalCostUSD * 30).toFixed(0)}`} />
        <KPI label="Моделей активных" value={String(usage.length)} />
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2">Модель</th>
            <th className="pb-2 text-right">Вызовов</th>
            <th className="pb-2 text-right">Токены вход</th>
            <th className="pb-2 text-right">Токены выход</th>
            <th className="pb-2 text-right">Стоимость USD</th>
          </tr>
        </thead>
        <tbody>
          {usage.map(u => (
            <tr key={u.model} className="border-b last:border-0">
              <td className="py-2 font-mono text-xs">{u.model}</td>
              <td className="py-2 text-right">{u.callsToday.toLocaleString()}</td>
              <td className="py-2 text-right">{(u.inputTokensTotal / 1000).toFixed(1)}k</td>
              <td className="py-2 text-right">{(u.outputTokensTotal / 1000).toFixed(1)}k</td>
              <td className="py-2 text-right">${u.costUSD.toFixed(3)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
```

---

## API: AI Usage Tracking

```typescript
// lib/ai-usage.ts — call after every Anthropic API response
import { prisma } from '@/lib/prisma';

export async function trackAIUsage(
  model: string,
  feature: string,
  inputTokens: number,
  outputTokens: number,
) {
  const COST_PER_1M = {
    'claude-haiku-4-5-20251001': { input: 0.80, output: 4.00 },
    'claude-sonnet-5':           { input: 3.00, output: 15.00 },
    'claude-opus-4-8':           { input: 15.00, output: 75.00 },
  } as Record<string, { input: number; output: number }>;

  const rates = COST_PER_1M[model] ?? { input: 3.00, output: 15.00 };
  const costUSD =
    (inputTokens / 1_000_000) * rates.input +
    (outputTokens / 1_000_000) * rates.output;

  await prisma.aIUsageLog.create({
    data: {
      model,
      feature,
      inputTokens,
      outputTokens,
      costUsdMicros: Math.round(costUSD * 1_000_000),
      date: new Date(),
    },
  });
}
```

```prisma
// prisma/schema.prisma additions
model AIUsageLog {
  id             String   @id @default(cuid())
  model          String
  feature        String
  inputTokens    Int
  outputTokens   Int
  costUsdMicros  Int      // cost in millionths of USD, avoids floats
  date           DateTime @db.Date
  createdAt      DateTime @default(now())

  @@index([date, model])
  @@index([date, feature])
}
```

---

## Consultant Workflow

When `/ai-consultant` is invoked:

1. **Audit** — Scan codebase for existing AI integrations. List what's already built vs. gaps.
2. **Assess** — Ask for current order count, team size, monthly infra budget (USD).
3. **Prioritize** — Run `prioritizeFeatures()` and present top-5 next features with ROI estimates.
4. **Model-select** — For each feature, recommend the cheapest Claude model that meets quality bar (Haiku first, escalate to Sonnet only if quality requires).
5. **Cost-project** — Show 12-month AI cost projection in USD and TJS at current NBT rate.
6. **Roadmap** — Output phased roadmap: Фаза 1 (foundation) → Фаза 2 (conversion) → Фаза 3 (protection) → Фаза 4 (scale).
7. **Data gaps** — Flag any feature blocked by insufficient data and prescribe bootstrap strategy.
8. **Ethics** — Note any bias risks: COD-boost must not exclude ГБАО unfairly; fraud model must not over-flag by region.

### Response language
Answer in Russian unless user writes in Tajik or English. Technical code always in English.

### Cost formatting rule
Always show costs in both USD and TJS: `$40/мес (~436 с.)`.

### Never recommend
- GPT/Gemini/etc. — this stack is Anthropic-only.
- Float storage for monetary values — all costs use integer dirams or micros.
- Synchronous SMS — always async BullMQ queue via Beeline TJ.
