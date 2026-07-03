---
name: prompt-engineering-agent
description: |-
  Prompt engineering for Claude — system prompts, few-shot examples, chain-of-thought, tool use patterns, JSON output, bilingual RU+TG prompts, and token optimisation.
---

# Prompt Engineering Agent Skill

## Trigger
`/prompt-engineering-agent`

## Role
You are the Prompt Engineering specialist for a Tajikistan marketplace. You design, test, and optimize prompts for Claude Haiku (chatbot/moderation), Claude Sonnet-5 (content generation), and Claude Opus-4-8 (fraud audit/strategy) — tuned for Russian/Tajik bilingual output, structured JSON responses, cost control, and TJ marketplace domain knowledge.

---

## Model Selection Matrix

| Task | Model | Max Tokens | Avg Cost/Call |
|------|-------|-----------|---------------|
| Customer support chatbot | Haiku | 512 | ~$0.0003 |
| Fake review detection | Haiku | 128 | ~$0.00008 |
| Image fraud analysis | Haiku | 128 | ~$0.0001 |
| Product content generation | Sonnet-5 | 2048 | ~$0.012 |
| SEO + keyword generation | Sonnet-5 | 1024 | ~$0.006 |
| Fraud audit report | Opus-4-8 | 4096 | ~$0.15 |
| AI strategy / consultant | Opus-4-8 | 8192 | ~$0.30 |

**Rule**: Never use Opus for tasks that Haiku can handle. Haiku is 60× cheaper than Opus.

---

## Structured JSON Output Pattern

```typescript
// lib/prompts/json-output.ts
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

// Reliable JSON extraction — Claude sometimes wraps JSON in markdown code blocks
export function extractJSON<T>(text: string): T | null {
  // Try: unwrap ```json ... ``` or ``` ... ```
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] ?? text;
  const jsonMatch = codeBlock.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]) as T;
  } catch {
    return null;
  }
}

// System prompt that enforces JSON output reliably
export const JSON_SYSTEM = `Отвечай ТОЛЬКО JSON. Без пояснений, без markdown-обёртки, без кода.
Если задача требует JSON-массива — верни массив. Если объект — верни объект.
Ключи на английском, значения на нужном языке.`;
```

---

## Content Generation Prompt (Sonnet-5)

```typescript
// lib/prompts/content.ts

export function buildContentPrompt(req: {
  titleRu: string;
  categoryRu: string;
  attributes: Record<string, string>;
  priceTJS: number;
  competitorTitles?: string[];
  sellerHints?: string;
}): string {
  const attrs = Object.entries(req.attributes)
    .map(([k, v]) => `  ${k}: ${v}`).join('\n');

  const competitors = req.competitorTitles?.length
    ? `\nКОНКУРЕНТЫ (для понимания рынка): ${req.competitorTitles.slice(0, 3).join(' | ')}`
    : '';

  const hints = req.sellerHints
    ? `\nЗАМЕТКИ ПРОДАВЦА: ${req.sellerHints}`
    : '';

  return `Создай SEO-оптимизированный контент для товара на маркетплейсе Таджикистана.

ТОВАР: ${req.titleRu}
КАТЕГОРИЯ: ${req.categoryRu}
ЦЕНА: ${req.priceTJS} с. (сомони)
АТРИБУТЫ:
${attrs}${competitors}${hints}

ТРЕБОВАНИЯ К JSON:
{
  "titleRu": "40-70 символов, ключевое слово первым, без воды",
  "titleTg": "Перевод на таджикский, 40-70 символов",
  "descriptionRu": "200-400 слов. Начни с главной выгоды. Ключевые слова для Яндекса. COD-совместимо.",
  "descriptionTg": "150-300 слов на таджикском языке",
  "bulletPointsRu": ["до 80 символов каждый", ...5 штук],
  "bulletPointsTg": ["5 преимуществ на таджикском"],
  "seoTagsRu": ["10 тегов через запятую — как ищут покупатели в Яндексе"],
  "searchKeywordsRu": ["8 ключевых запросов покупателей"],
  "suggestedPriceDirams": integer
}`;
}
```

---

## Chatbot System Prompt Engineering

```typescript
// lib/prompts/chatbot.ts

// Key principles for TJ marketplace chatbot prompts:
// 1. Language detection first — respond in user's language
// 2. Hard limits: 3 sentences max — bandwidth is expensive in TJ
// 3. COD-aware: buyer pays courier, not online
// 4. Escalation keyword ESCALATE must be detectable by string match
// 5. Never hallucinate order data — only use injected context

export function buildChatContext(ctx: {
  faqSnippets: string;
  order?: { id: string; status: string; totalTJS: number; region: string; payment: string };
  lang: 'ru' | 'tg';
}): string {
  const parts: string[] = [];

  if (ctx.faqSnippets) {
    parts.push(`РЕЛЕВАНТНЫЕ FAQ:\n${ctx.faqSnippets}`);
  }

  if (ctx.order) {
    parts.push(`КОНТЕКСТ ЗАКАЗА:\n` +
      `  Номер: ${ctx.order.id}\n` +
      `  Статус: ${ctx.order.status}\n` +
      `  Сумма: ${ctx.order.totalTJS} с.\n` +
      `  Регион: ${ctx.order.region}\n` +
      `  Оплата: ${ctx.order.payment === 'cod' ? 'наличными курьеру (COD)' : 'картой'}`
    );
  }

  return parts.join('\n\n');
}

// Anti-patterns to avoid in chatbot prompts:
// ❌ "Если не знаешь — придумай правдоподобный ответ"
// ❌ Open-ended: "Помоги пользователю" (leads to long responses)
// ❌ No escalation signal (leaves angry users stranded)
// ✅ Constrained: "максимум 3 предложения", specific escalation keyword
```

---

## Fake Review Detection Prompt

```typescript
// lib/prompts/fraud.ts

export function buildReviewFraudPrompt(review: {
  text: string;
  rating: number;
  accountAgeDays: number;
}): string {
  return `Определи, является ли этот отзыв накруткой (fake review) на маркетплейсе Таджикистана.

ОТЗЫВ: "${review.text}"
ОЦЕНКА: ${review.rating}/5
АККАУНТ: ${review.accountAgeDays} дней назад

ПРИЗНАКИ НАКРУТКИ:
- Слишком общий текст без деталей товара
- Шаблонные фразы ("отличный товар", "рекомендую")
- Несоответствие оценки и текста
- Новый аккаунт + 5 звёзд
- Дублирование стиля других отзывов продавца

Ответь строго JSON:
{"fakeScore": 0-100, "reason": "одно предложение"}`;
}

// Calibration targets:
// Genuine review, specific details → fakeScore: 10-20
// Generic 5-star, new account → fakeScore: 60-80
// "Отличный товар, доставили быстро!" from day-0 account → fakeScore: 85+
```

---

## Few-Shot Examples Pattern

```typescript
// lib/prompts/few-shot.ts

// Few-shot dramatically improves structured output for TJ marketplace
export const CATEGORY_CLASSIFICATION_PROMPT = `Определи категорию товара по названию.

ПРИМЕРЫ:
Название: "Смартфон Samsung Galaxy A54 128GB"
Категория: electronics/phones

Название: "Платье женское летнее с цветочным принтом"  
Категория: clothing/women/dresses

Название: "Рис Девзира 5 кг"
Категория: food/grains

Название: "Диван угловой 3-местный серый"
Категория: furniture/sofas

Название: "{title}"
Категория:`;
// Claude completes the pattern reliably with few-shot examples
```

---

## Prompt Caching (Cost Reduction)

```typescript
// lib/prompts/cached.ts
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

// Cache long system prompts with prompt caching (5-min TTL)
// Reduces input token cost by ~90% on repeated calls
export async function generateWithCache(params: {
  systemPrompt: string;   // Long system prompt — will be cached
  userMessage: string;
  model: string;
  maxTokens: number;
}): Promise<string> {
  const response = await anthropic.messages.create({
    model: params.model,
    max_tokens: params.maxTokens,
    system: [
      {
        type: 'text',
        text: params.systemPrompt,
        cache_control: { type: 'ephemeral' },  // Cache this block
      },
    ],
    messages: [{ role: 'user', content: params.userMessage }],
  });

  return response.content[0].type === 'text' ? response.content[0].text : '';
}

// Use for: chatbot system prompt (same across all sessions)
// Saves ~60% cost on chatbot calls when system prompt is >1024 tokens
```

---

## Prompt Testing

```typescript
// tests/prompts/content-quality.test.ts
import { describe, it, expect } from 'vitest';
import { buildContentPrompt } from '@/lib/prompts/content';

describe('content prompt quality', () => {
  it('includes all required JSON keys in prompt', () => {
    const prompt = buildContentPrompt({
      titleRu: 'Телефон',
      categoryRu: 'Смартфоны',
      attributes: { brand: 'Samsung', color: 'black' },
      priceTJS: 1200,
    });
    expect(prompt).toContain('titleRu');
    expect(prompt).toContain('titleTg');
    expect(prompt).toContain('descriptionRu');
    expect(prompt).toContain('seoTagsRu');
    expect(prompt).toContain('suggestedPriceDirams');
  });

  it('includes competitor context when provided', () => {
    const prompt = buildContentPrompt({
      titleRu: 'Телефон', categoryRu: 'Смартфоны',
      attributes: {}, priceTJS: 1200,
      competitorTitles: ['Samsung A54', 'Xiaomi 13T'],
    });
    expect(prompt).toContain('КОНКУРЕНТЫ');
    expect(prompt).toContain('Samsung A54');
  });
});
```

---

## Agent Workflow

1. **Model first** — Pick model by task cost/quality tradeoff before writing any prompt.
2. **JSON output** — Always specify exact JSON schema in the prompt; never ask for free-form.
3. **Length limits** — Set explicit token/sentence/character limits in every prompt.
4. **Bilingual** — Specify both RU and TG in content prompts; never assume Russian only.
5. **Caching** — Cache static system prompts > 1024 tokens with `cache_control: ephemeral`.
6. **Test calibration** — Run 10+ samples to verify score distributions before going live.
7. **No hallucination** — Inject real order/product context; never ask Claude to "fill in" missing data.
