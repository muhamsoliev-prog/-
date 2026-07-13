---
name: chatbot-agent
description: |-
  Tajikistan marketplace chatbot — Claude-powered order tracking, product search, FAQ answering, Telegram bot integration, bilingual RU+TG, and COD payment flow.
---

# Chatbot Agent Skill

## Trigger
`/chatbot-agent`

## Role
You are the Chatbot Engineer for a Tajikistan marketplace. You build the customer support chatbot powered by Claude Haiku, with FAQ knowledge base, order context injection, Russian/Tajik bilingual responses, escalation to human operators, and conversation history — all tuned for TJ COD-heavy buyers.

---

## Architecture

```
User → POST /api/support/chat
  → Load conversation history (Redis, 24h TTL)
  → Inject order context (Prisma)
  → Inject FAQ snippets (Meilisearch)
  → Claude claude-haiku-4-5-20251001
  → Detect escalation flag
  → Save reply to history
  → Return { reply, escalate, suggestedActions }
```

---

## System Prompt

```typescript
// lib/chatbot/prompts.ts

export const CHATBOT_SYSTEM = `Ты — вежливый помощник по поддержке клиентов маркетплейса в Таджикистане.

ПРАВИЛА:
- Отвечай на языке пользователя (русский или таджикский)
- Будь кратким — максимум 3 предложения на ответ
- Никогда не выдумывай информацию о заказах — только из контекста
- Если не знаешь ответа — скажи честно и предложи связаться с оператором
- Валюта всегда в TJS (сомони)
- Доставка: Душанбе 1-2 дня, Худжанд 2-3 дня, ГБАО 5-7 дней
- COD (оплата при получении): деньги платятся курьеру при получении товара
- При оформлении возврата: у покупателя 14 дней с момента получения

ЭСКАЛАЦИЯ (добавь ESCALATE в конец ответа при):
- Жалоба на некачественный товар
- Конфликт с продавцом
- Запрос о возврате денег на карту/кошелёк
- Технический сбой с оплатой
- Пользователь раздражён или повторяет вопрос дважды`;

export const CHATBOT_SYSTEM_TG = `Ту ёрдамчии боадаби хадамоти мизоҷони бозори интернетии Тоҷикистон мебошӣ.

ҚОИДАҲО:
- Ба забони корбар (русӣ ё тоҷикӣ) ҷавоб деҳ
- Мухтасар бош — ҳадди аксар 3 ҷумла
- Иттилооти сохтагӣ дар бораи фармоишҳо надеҳ
- Агар ҷавобро надонӣ — гуфта деҳ ва оператор пешниҳод кун
- Асъор ҳамеша TJS`;
```

---

## Conversation History (Redis)

```typescript
// lib/chatbot/history.ts
import { redis } from '@/lib/redis';
import Anthropic from '@anthropic-ai/sdk';

const TTL_SECONDS = 86_400;  // 24 hours
const MAX_HISTORY = 20;      // last 20 turns

export async function getHistory(sessionId: string): Promise<Anthropic.MessageParam[]> {
  const raw = await redis.get(`chat:${sessionId}`);
  return raw ? JSON.parse(raw) : [];
}

export async function appendHistory(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
): Promise<void> {
  const history = await getHistory(sessionId);
  history.push({ role, content });
  // Keep last MAX_HISTORY turns
  const trimmed = history.slice(-MAX_HISTORY);
  await redis.setex(`chat:${sessionId}`, TTL_SECONDS, JSON.stringify(trimmed));
}
```

---

## FAQ Knowledge Base

```typescript
// lib/chatbot/faq.ts
import { meiliSearch } from '@/lib/search/client';

// FAQ documents indexed in Meilisearch 'faq' index
export interface FAQDocument {
  id: string;
  questionRu: string;
  questionTg: string;
  answerRu: string;
  answerTg: string;
  category: 'delivery' | 'payment' | 'return' | 'seller' | 'account' | 'order';
}

const SEED_FAQ: FAQDocument[] = [
  { id: 'faq-1', questionRu: 'Как оплатить заказ?', questionTg: 'Чӣ тавр фармоишро пардохт кунам?',
    answerRu: 'Вы можете оплатить наличными курьеру (COD) или картой онлайн при оформлении.',
    answerTg: 'Шумо метавонед ба курьер нақд (COD) ё бо корт онлайн пардохт кунед.',
    category: 'payment' },
  { id: 'faq-2', questionRu: 'Сколько идёт доставка?', questionTg: 'Расонидан чанд рӯз мегирад?',
    answerRu: 'Душанбе: 1-2 дня. Худжанд: 2-3 дня. Куляб: 3-4 дня. ГБАО: 5-7 дней.',
    answerTg: 'Душанбе: 1-2 рӯз. Хуҷанд: 2-3 рӯз. Кӯлоб: 3-4 рӯз. ВМКБ: 5-7 рӯз.',
    category: 'delivery' },
  { id: 'faq-3', questionRu: 'Как вернуть товар?', questionTg: 'Чӣ тавр молро баргардонам?',
    answerRu: 'Возврат возможен в течение 14 дней. Свяжитесь с поддержкой, укажите номер заказа.',
    answerTg: 'Баргардонидан дар давоми 14 рӯз имконпазир аст. Бо дастгирӣ тамос гиред.',
    category: 'return' },
  { id: 'faq-4', questionRu: 'Где мой заказ?', questionTg: 'Фармоишам куҷост?',
    answerRu: 'Статус заказа можно отследить в разделе "Мои заказы" в личном кабинете.',
    answerTg: 'Ҳолати фармоишро дар бахши "Фармоишҳои ман" дар кабинети шахсӣ пайгирӣ кардан мумкин.',
    category: 'order' },
];

export async function getFAQContext(query: string, lang: 'ru' | 'tg' = 'ru'): Promise<string> {
  const results = await meiliSearch.index('faq').search(query, {
    limit: 3,
    attributesToRetrieve: ['answerRu', 'answerTg', 'questionRu'],
  });

  return results.hits
    .map(h => `Q: ${h.questionRu}\nA: ${lang === 'tg' ? h.answerTg : h.answerRu}`)
    .join('\n\n');
}

export { SEED_FAQ };
```

---

## Chat API Route

```typescript
// app/api/support/chat/route.ts
import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getHistory, appendHistory } from '@/lib/chatbot/history';
import { getFAQContext } from '@/lib/chatbot/faq';
import { CHATBOT_SYSTEM } from '@/lib/chatbot/prompts';
import { prisma } from '@/lib/prisma';
import { trackAIUsage } from '@/lib/ai-usage';

const anthropic = new Anthropic();

export async function POST(req: NextRequest) {
  const { message, sessionId, userId, orderId, lang = 'ru' } = await req.json();

  if (!message?.trim() || !sessionId) {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Parallel: fetch history + FAQ + order context
  const [history, faqContext, order] = await Promise.all([
    getHistory(sessionId),
    getFAQContext(message, lang),
    orderId
      ? prisma.order.findUnique({
          where: { id: orderId },
          select: { id: true, status: true, totalDirams: true, createdAt: true, regionId: true, paymentMethod: true },
        })
      : Promise.resolve(null),
  ]);

  // Build user turn with context
  const contextParts: string[] = [];
  if (faqContext) contextParts.push(`Релевантные FAQ:\n${faqContext}`);
  if (order) {
    contextParts.push(`Заказ #${order.id}: статус=${order.status}, сумма=${Number(order.totalDirams) / 100} с., оплата=${order.paymentMethod}, регион=${order.regionId}`);
  }
  const userContent = contextParts.length
    ? `${contextParts.join('\n\n')}\n\nВопрос: ${message}`
    : message;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: CHATBOT_SYSTEM,
    messages: [...history, { role: 'user', content: userContent }],
  });

  const replyText = response.content[0].type === 'text' ? response.content[0].text : '';
  const escalate = replyText.includes('ESCALATE');
  const reply = replyText.replace('ESCALATE', '').trim();

  // Suggested quick-reply actions
  const suggestedActions = buildSuggestedActions(message, reply, lang);

  // Persist history (user message without injected context, reply without flag)
  await Promise.all([
    appendHistory(sessionId, 'user', message),
    appendHistory(sessionId, 'assistant', reply),
    trackAIUsage('claude-haiku-4-5-20251001', 'chatbot', response.usage.input_tokens, response.usage.output_tokens),
  ]);

  // If escalation — create support ticket async
  if (escalate && userId) {
    prisma.supportTicket.create({
      data: { userId, sessionId, lastMessage: message, status: 'open', lang },
    }).catch(() => {});
  }

  return Response.json({ reply, escalate, suggestedActions });
}

function buildSuggestedActions(userMsg: string, reply: string, lang: 'ru' | 'tg'): string[] {
  const ru = [
    userMsg.toLowerCase().includes('заказ') && 'Отследить заказ',
    userMsg.toLowerCase().includes('верн') && 'Оформить возврат',
    reply.includes('оператор') && 'Позвонить оператору',
  ].filter(Boolean) as string[];

  return lang === 'tg'
    ? ru.map(a => a.replace('Отследить заказ', 'Фармоишро пайгирӣ кунед')
               .replace('Оформить возврат', 'Баргардониданро расмӣ кунед')
               .replace('Позвонить оператору', 'Бо оператор занг занед'))
    : ru;
}
```

---

## Chat UI Component

```tsx
// components/support/ChatWidget.tsx
'use client';

import { useState, useRef, useEffect } from 'react';

interface Message { role: 'user' | 'bot'; text: string; ts: number; }

export function ChatWidget({ userId, lang = 'ru' }: { userId?: string; lang?: 'ru' | 'tg' }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg, ts: Date.now() }]);
    setLoading(true);

    const res = await fetch('/api/support/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMsg, sessionId, userId, lang }),
    });
    const { reply, escalate, suggestedActions } = await res.json();

    setMessages(prev => [...prev, { role: 'bot', text: reply, ts: Date.now() }]);
    setLoading(false);

    if (escalate) {
      setMessages(prev => [...prev, {
        role: 'bot',
        text: lang === 'tg' ? '🔴 Шуморо ба оператор пайваст мекунем...' : '🔴 Подключаем оператора...',
        ts: Date.now(),
      }]);
    }
  }

  const placeholder = lang === 'tg' ? 'Паёмро нависед...' : 'Напишите сообщение...';
  const title = lang === 'tg' ? 'Дастгирии мизоҷон' : 'Поддержка покупателей';

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-2xl text-white shadow-lg"
        aria-label={title}
      >
        {open ? '✕' : '💬'}
      </button>

      {open && (
        <div className="fixed bottom-24 right-4 z-50 flex h-[480px] w-80 flex-col rounded-2xl border bg-background shadow-xl sm:w-96">
          {/* Header */}
          <div className="rounded-t-2xl bg-primary p-3 text-sm font-semibold text-white">
            {title}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-2 p-3">
            {messages.length === 0 && (
              <p className="text-center text-xs text-muted-foreground mt-8">
                {lang === 'tg' ? 'Саволи худро бинависед' : 'Задайте ваш вопрос'}
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.role === 'user' ? 'bg-primary text-white' : 'bg-muted'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-muted px-4 py-2 text-sm">...</div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t p-2 flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder={placeholder}
              className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="rounded-lg bg-primary px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
```

---

## Prisma Additions

```prisma
model SupportTicket {
  id          String   @id @default(cuid())
  userId      String
  sessionId   String
  lastMessage String
  status      String   @default("open")  // open | assigned | resolved
  lang        String   @default("ru")
  agentId     String?
  createdAt   DateTime @default(now())
  resolvedAt  DateTime?

  @@index([status, createdAt])
  @@index([userId])
}
```

---

## Agent Workflow

When `/chatbot-agent` is invoked:

1. **Setup** — Seed FAQ index in Meilisearch with `SEED_FAQ`. Verify `MEILISEARCH_HOST` and `ANTHROPIC_API_KEY`.
2. **History** — Confirm Redis `chat:{sessionId}` TTL is 24h. Never store PII beyond session.
3. **Context** — `orderId` must come from authenticated session — never trust client-sent orderId for auth.
4. **Escalation** — `SupportTicket` created async (non-blocking). Operator dashboard polls `status = 'open'`.
5. **Language** — detect from `lang` param, default `ru`. System prompt is Russian; for Tajik use `CHATBOT_SYSTEM_TG`.
6. **Cost control** — Haiku, max 512 tokens output. Never use Sonnet/Opus for chat.
7. **Abuse** — Rate limit: 30 messages per sessionId per hour via Redis `INCR chat:rate:{sessionId}` TTL 3600.
