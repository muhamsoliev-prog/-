# CLAUDE.md — Единый стандарт проекта

> Этот файл — главный источник истины. Все агенты, разработчики и AI-инструменты
> следуют этим правилам без исключений. При конфликте с любым другим документом —
> побеждает этот файл.

---

## 1. Архитектура

### Стек
| Слой | Технология | Версия |
|------|-----------|--------|
| Frontend | Next.js App Router | 14.x |
| Язык | TypeScript | strict mode |
| Стили | Tailwind CSS + shadcn/ui | latest |
| ORM | Prisma | 5.x |
| БД | PostgreSQL | 15+ |
| Очереди | BullMQ + Redis | — |
| Поиск | Meilisearch | 1.x |
| AI | Anthropic SDK (`@anthropic-ai/sdk`) | — |
| Тесты | Vitest (unit) + Playwright (E2E) | — |

### Структура директорий
```
app/
  (admin)/          # Защищённые страницы администратора
  (shop)/           # Публичный магазин
    [locale]/       # ru / tg — языковой сегмент
  api/              # Route Handlers (REST)
  actions/          # Server Actions (мутации)
components/
  ui/               # shadcn/ui — НЕ ИЗМЕНЯТЬ напрямую
  shared/           # Переиспользуемые компоненты
  features/         # Компоненты конкретных фич
lib/
  prisma.ts         # Singleton клиент Prisma
  redis.ts          # Singleton клиент Redis
  ai-tracking.ts    # trackAIUsage()
  queues/           # BullMQ очереди
  search/           # Meilisearch клиент
prisma/
  schema.prisma     # Единая схема БД
  migrations/       # Автогенерированные миграции
  seed.ts           # Начальные данные
.claude/
  agents/           # Специализированные субагенты
  hooks/            # Автоматические хуки
.agents/skills/     # Скиллы для /команд
```

### Принципы
- **Server Components по умолчанию** — `"use client"` только при необходимости хуков или событий браузера
- **Данные ближе к источнику** — запросы в БД делаются в Server Components, не в Client
- **Очереди для тяжёлого** — любая операция >500ms идёт в BullMQ, не блокирует HTTP
- **Один источник правды** — состояние в БД, не в localStorage/cookies без крайней нужды

---

## 2. Стиль кода

### TypeScript
```typescript
// ✅ Явные типы на публичных API
export async function getProduct(id: string): Promise<Product | null> { ... }

// ✅ Zod для валидации на границах системы
const schema = z.object({ titleRu: z.string().min(1).max(200) })

// ❌ any — запрещён везде кроме крайней нужды с комментарием
const data: any = ...  // только с // eslint-disable-next-line @typescript-eslint/no-explicit-any + причина

// ✅ Readonly для иммутабельных данных
function render(items: ReadonlyArray<Product>) { ... }
```

### Форматирование (Prettier автоматически)
- Отступ: 2 пробела
- Кавычки: одинарные для JS/TS, двойные для JSX атрибутов
- Точка с запятой: да
- Trailing comma: all
- Print width: 100

### Комментарии
```typescript
// Комментарии ТОЛЬКО когда WHY неочевиден
// ✅ Tajikistan seismic zone 8 — requires 14mm rebar per SNiP
const rebarDiameterMm = 14

// ❌ Комментарий объясняет ЧТО, а не ПОЧЕМУ — удалить
// Increment counter
counter++
```

---

## 3. Правила именования

### Файлы и директории
| Тип | Конвенция | Пример |
|-----|-----------|--------|
| React компонент | PascalCase | `ProductCard.tsx` |
| Хук | camelCase с `use` | `useCart.ts` |
| Утилита / хелпер | camelCase | `formatPrice.ts` |
| Server Action | camelCase | `createOrder.ts` |
| API Route | kebab-case директория | `app/api/house-projects/route.ts` |
| Тест | рядом с файлом | `ProductCard.test.tsx` |
| Константы | SCREAMING_SNAKE | `MAX_ORDER_ITEMS = 100` |

### Переменные и функции
```typescript
// Булевые — is/has/can/should
const isLoading = true
const hasDiscount = order.discountDirams > 0n
const canCheckout = cart.items.length > 0

// Обработчики событий — handle + действие
const handleAddToCart = () => { ... }
const handleFormSubmit = async (e: FormEvent) => { ... }

// Async функции — без суффикса Async (async уже в сигнатуре)
async function fetchProducts() { ... }  // ✅
async function fetchProductsAsync() { ... }  // ❌
```

### Prisma / БД поля
```prisma
// Двуязычные поля — всегда пара Ru + Tg
titleRu     String
titleTg     String

// Деньги — всегда dirams (BigInt)
priceDirams    BigInt
discountDirams BigInt @default(0)

// Даты — createdAt + updatedAt на каждой модели
createdAt   DateTime @default(now())
updatedAt   DateTime @updatedAt

// Enum — SCREAMING_SNAKE
enum OrderStatus { PENDING CONFIRMED SHIPPED DELIVERED CANCELLED }
```

---

## 4. Работа с БД

### Деньги — только BigInt dirams
```typescript
// 1 TJS = 100 dirams

// ✅ Хранение и вычисления
const price: bigint = product.priceDirams        // из Prisma
const total = price * BigInt(quantity)            // арифметика
const discount = BigInt(Math.round(pct * 100))   // конверсия из процентов

// ✅ Только для отображения в UI
const displayTJS = Number(price) / 100            // ТОЛЬКО в компоненте

// ❌ НИКОГДА
const price: number = product.priceDirams        // потеря точности
const price = parseFloat(row.price)              // float = ошибки
```

### Обязательные правила Prisma
```typescript
// Всегда limit — никаких findMany() без take
await prisma.product.findMany({ take: 50, skip: offset })

// Select только нужных полей
await prisma.product.findMany({
  select: { id: true, titleRu: true, titleTg: true, priceDirams: true },
  take: 20,
})

// Транзакции для связанных операций
await prisma.$transaction([
  prisma.order.create({ data: orderData }),
  prisma.product.update({ where: { id }, data: { stock: { decrement: qty } } }),
])

// Индексы на полях поиска/фильтрации
model Order {
  @@index([status, createdAt])
  @@index([userId, createdAt])
}
```

### Миграции
```bash
# Всегда descriptive name
npx prisma migrate dev --name add-house-project-model
npx prisma migrate dev --name add-supplier-fields-to-material

# Никогда не редактируй уже применённые миграции
# При конфликте — новая миграция
```

---

## 5. UI / Frontend

### Mobile-first обязательно
```tsx
// Минимум 44×44px для ЛЮБОГО кликабельного элемента
<button className="min-h-[44px] min-w-[44px] px-4">...</button>
<Link className="flex items-center min-h-[44px] px-3">...</Link>

// Responsive — начинай с mobile, добавляй sm: md: lg:
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
```

### Двуязычность — всегда
```tsx
// ✅ Прямо в компоненте
<h1>{lang === 'ru' ? product.titleRu : product.titleTg}</h1>

// ✅ Через утилиту (если есть в проекте)
<h1>{t(product, 'title')}</h1>

// ❌ Только один язык
<h1>{product.titleRu}</h1>
```

### COD совместимость
```tsx
// COD (наличные при получении) = 60% заказов
// Всегда показывать первым вариантом оплаты
const PAYMENT_METHODS = [
  { id: 'cod',  labelRu: 'Наличными при получении', labelTg: 'Пул ҳангоми қабул' }, // ПЕРВЫЙ
  { id: 'card', labelRu: 'Банковская карта',         labelTg: 'Корти бонкӣ' },
]
// Никогда не прячь COD за feature flag или условие
```

### Server vs Client Components
```tsx
// Server Component (дефолт) — данные, статика, SEO
export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await prisma.product.findUnique({ where: { id: params.id } })
  return <ProductDetail product={product} />
}

// Client Component — только для интерактивности
'use client'
export function AddToCartButton({ productId }: { productId: string }) {
  const [loading, setLoading] = useState(false)
  // ...
}
```

### Структура страницы
```
app/(shop)/[locale]/products/[id]/
  page.tsx          # Server Component — данные + разметка
  loading.tsx       # Skeleton UI
  error.tsx         # Error boundary
  not-found.tsx     # 404
```

---

## 6. Безопасность

### Валидация входных данных
```typescript
// Zod на ВСЕХ публичных endpoint'ах
const schema = z.object({
  titleRu: z.string().min(1).max(200).trim(),
  priceDirams: z.bigint().positive().max(BigInt(100_000_000_00)), // 1M TJS max
})
const parsed = schema.safeParse(body)
if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })
```

### XSS
```tsx
// ❌ dangerouslySetInnerHTML с пользовательскими данными
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// ✅ Только с sanitized контентом (DOMPurify или белый список тегов)
import DOMPurify from 'dompurify'
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />

// ✅ SVG от AI — всегда санитизировать (нет <script>, <iframe>, on*)
const cleanSvg = svgContent.replace(/<script[\s\S]*?<\/script>/gi, '')
                            .replace(/\bon\w+="[^"]*"/g, '')
```

### Аутентификация
```typescript
// Проверка сессии в каждом защищённом Route Handler
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  // ...
}

// Server Action — то же самое
'use server'
export async function deleteProduct(id: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) throw new Error('Forbidden')
  // ...
}
```

### Секреты
```bash
# .env.local — никогда в git
ANTHROPIC_API_KEY=...
DATABASE_URL=...
REDIS_URL=...

# Переменные без NEXT_PUBLIC_ — только на сервере
# NEXT_PUBLIC_ переменные видны в браузере — не класть секреты
```

---

## 7. Тестирование

### Что тестировать обязательно
1. **Вся бизнес-логика** с деньгами (BigInt dirams) — граничные значения, переполнение
2. **Двуязычность** — компонент рендерит titleRu и titleTg
3. **COD сценарий** — заказ с оплатой при получении
4. **Ошибки** — недоступный API, невалидный ввод, 0n цена

### Vitest — unit тесты
```typescript
// lib/pricing.test.ts
import { describe, it, expect } from 'vitest'

describe('calculateTotal', () => {
  it('считает сумму в dirams', () => {
    expect(calculateTotal([{ priceDirams: 1000n, qty: 3 }])).toBe(3000n)
  })

  it('возвращает 0n для пустого массива', () => {
    expect(calculateTotal([])).toBe(0n)
  })

  it('не уходит в минус при скидке > цены', () => {
    expect(applyDiscount(100n, 200n)).toBe(0n)
  })
})
```

### Playwright — E2E тесты
```typescript
// e2e/checkout.spec.ts
test('COD отображается первым вариантом оплаты', async ({ page }) => {
  await page.goto('/cart')
  const methods = page.locator('[data-testid="payment-method"]')
  await expect(methods.first()).toHaveAttribute('data-value', 'cod')
})

test('touch target кнопки корзины ≥ 44px', async ({ page }) => {
  const btn = page.locator('[data-testid="add-to-cart"]').first()
  const box = await btn.boundingBox()
  expect(box!.height).toBeGreaterThanOrEqual(44)
})
```

### Покрытие
- Бизнес-логика: **≥80%**
- Критические пути (оплата, заказ): **100%**
- UI компоненты: только золотые пути + edge cases

---

## 8. Работа с AI-агентами

### Anthropic API — обязательный трекинг
```typescript
import Anthropic from '@anthropic-ai/sdk'
import { trackAIUsage } from '@/lib/ai-tracking'

// КАЖДЫЙ вызов — trackAIUsage после
const response = await anthropic.messages.create({
  model: 'claude-sonnet-5',
  max_tokens: 4000,
  messages: [{ role: 'user', content: prompt }],
})

await trackAIUsage(
  'claude-sonnet-5',        // model
  'house-project-gen',      // feature
  response.usage.input_tokens,
  response.usage.output_tokens,
)
```

### BullMQ для тяжёлых AI задач
```typescript
// Генерация >2000 токенов → в очередь
export const aiQueue = new Queue('ai-generation', {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
})

// В Route Handler — добавляем задачу, отвечаем сразу
const job = await aiQueue.add('generate-project', params)
return Response.json({ jobId: job.id }, { status: 202 })
```

### Специализированные агенты
| Агент | Когда использовать |
|-------|-------------------|
| `planner` | Перед реализацией любой задачи с несколькими файлами |
| `database` | Изменения Prisma схемы, миграции, оптимизация запросов |
| `frontend` | React компоненты, страницы, shadcn/ui |
| `backend` | API routes, Server Actions, BullMQ, интеграции |
| `tester` | После реализации фичи — написание тестов |
| `reviewer` | Перед мержем — проверка кода |
| `house-architect` | Генерация проектов домов |
| `materials-selector` | Подбор стройматериалов |

### Правила для агентов
- Агент `planner` запускается **до** написания кода для задач >2 файлов
- Агент `reviewer` запускается **перед каждым мержем** в main
- Агенты `database` и `backend` работают **параллельно** если нет зависимостей
- Агент `tester` пишет тесты **только после** завершения реализации

---

## 9. Git

### Ветки
```
main                    # Продакшн — только через PR
develop                 # Интеграционная ветка (если используется)
feat/короткое-описание  # Новая фича
fix/описание-бага       # Исправление
chore/что-делаем        # Конфигурация, зависимости
```

### Conventional Commits — обязательно
```bash
# Формат: <тип>(<скоуп>): <описание на русском или английском>
feat(cart): add COD payment method
fix(pricing): prevent negative discount calculation
chore(deps): upgrade prisma to 5.8
feat(house)!: breaking change — rename titleRu → nameRu

# Типы:
# feat     — новая функциональность
# fix      — исправление бага
# chore    — конфигурация, зависимости, рефакторинг
# docs     — только документация
# test     — только тесты
# perf     — улучшение производительности
# !        — breaking change
```

### Правила PR
1. **Один PR = одна задача** — не смешивать фичи
2. **Все хуки должны пройти** — tsc, eslint, prettier, тесты
3. **Описание PR**: что сделано, как проверить, скриншот если UI
4. **Ревью агентом** перед мержем: `Agent(subagent_type='reviewer')`
5. **Squash merge** в main — чистая история

### Что никогда не коммитить
```
.env.local              # секреты
.claude/settings.local.json  # локальные настройки
node_modules/
*.log
.DS_Store
```

---

## 10. Экономия токенов (Context7)

### Вызывай Context7 ТОЛЬКО для
- API изменившиеся после 2024 (breaking changes)
- Точный синтаксис конфигурационных файлов конкретной версии
- Гайды по миграции (Next.js 14→15, Prisma 5→6)

### НЕ вызывай Context7 для
- `useState`, `useEffect`, `useCallback`, `useMemo`, `useRef`
- `async/await`, `Promise.all`, `Array.map/filter/reduce`
- TypeScript базовые типы, дженерики, утилиты
- Отладки бизнес-логики, рефакторинга, написания скриптов с нуля

### Правила чтения файлов
```
Grep перед Read         — сначала найди строку, потом читай контекст
offset + limit в Read   — не читай весь файл ради одной функции
Параллельные вызовы     — независимые операции запускай одновременно
Не повторяй             — факт установлен в разговоре → не перепроверяй
```

---

## Быстрый чеклист перед коммитом

```
☐ Деньги — BigInt dirams везде, не number/Decimal
☐ Двуязычность — titleRu + titleTg заполнены
☐ COD — работает и отображается первым
☐ Touch targets — все кнопки/ссылки min-h-[44px]
☐ trackAIUsage — вызван после каждого Anthropic запроса
☐ findMany — есть take/limit
☐ Валидация — Zod на публичных endpoints
☐ Тесты — написаны для новой логики
☐ tsc/eslint/prettier — хуки прошли без ошибок
☐ Conventional commit — правильный формат сообщения
```
