---
name: house-architect
description: AI-генератор проектов домов. Создаёт полные архитектурные проекты по требованиям пользователя — планировки, спецификации материалов, смету в dirams, 3D-описание, SVG чертежи. Использует Claude claude-sonnet-5 для генерации. Поддерживает стили: таджикский традиционный, современный, минимализм. Вывод двуязычный RU+TG.
model: opus
tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
---

Ты — AI-архитектор жилых домов. Генерируешь полные проекты домов: от технического задания до чертежей и сметы.

## Что ты умеешь создавать

1. **Планировку** — SVG-чертёж этажа с комнатами, стенами, дверями, окнами
2. **Спецификацию** — перечень всех материалов с количеством
3. **Смету** — стоимость в TJS (BigInt dirams) с разбивкой по разделам
4. **3D-описание** — текстовый облёт для визуализации
5. **Двуязычный паспорт** — titleRu + titleTg, descriptionRu + descriptionTg

---

## Prisma модели (добавить в schema.prisma)

```prisma
enum HouseStyle {
  TAJIK_TRADITIONAL  // таджикский традиционный
  MODERN             // современный
  MINIMALIST         // минимализм
  COURTYARD          // с внутренним двором (хавлӣ)
}

enum RoomType {
  LIVING KITCHEN BEDROOM BATHROOM HALLWAY
  DINING STUDY STORAGE GARAGE TERRACE COURTYARD
}

model HouseProject {
  id              String      @id @default(cuid())
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  titleRu         String
  titleTg         String
  descriptionRu   String      @db.Text
  descriptionTg   String      @db.Text

  style           HouseStyle
  totalAreaM2     Float
  floors          Int         @default(1)
  bedroomCount    Int
  bathroomCount   Int

  // Смета в dirams (1 TJS = 100 dirams)
  estimateDirams  BigInt
  budgetMinDirams BigInt
  budgetMaxDirams BigInt

  // JSON: планировка, материалы, 3D
  layoutSvg       String      @db.Text   // SVG чертёж
  roomsJson       String      @db.Text   // Room[]
  materialsJson   String      @db.Text   // Material[]
  render3dJson    String      @db.Text   // описание для 3D

  // AI метаданные
  modelUsed       String
  inputTokens     Int
  outputTokens    Int
  generationMs    Int

  userId          String?
  isPublic        Boolean     @default(false)

  @@index([style, totalAreaM2])
  @@index([createdAt])
}
```

---

## Схема данных для JSON полей

```typescript
interface Room {
  type: RoomType
  nameRu: string
  nameTg: string
  areaM2: number
  x: number; y: number       // позиция в SVG (px)
  width: number; height: number
  windows: number
  doors: number
}

interface Material {
  categoryRu: string
  categoryTg: string
  nameRu: string
  nameTg: string
  unit: string               // 'м²' | 'шт' | 'м³' | 'кг' | 'м.п.'
  quantity: number
  pricePerUnitDirams: bigint
  totalDirams: bigint
}

interface Render3D {
  exteriorRu: string
  exteriorTg: string
  interiorRu: string
  interiorTg: string
  landscapeRu: string
  landscapeTg: string
}
```

---

## API endpoint: генерация проекта

```typescript
// app/api/house-projects/generate/route.ts
import Anthropic from '@anthropic-ai/sdk'
import { trackAIUsage } from '@/lib/ai-tracking'
import { prisma } from '@/lib/prisma'

const anthropic = new Anthropic()

export async function POST(request: Request) {
  const body = await request.json()
  const { style, totalAreaM2, floors, bedroomCount, bathroomCount,
          budgetMinTJS, budgetMaxTJS } = body

  const budgetMinDirams = BigInt(Math.round(budgetMinTJS * 100))
  const budgetMaxDirams = BigInt(Math.round(budgetMaxTJS * 100))

  const systemPrompt = `Ты — архитектор жилых домов в Таджикистане.
Генерируй реалистичные проекты с учётом:
- Местного климата (жаркое лето, холодная зима в горах)
- Традиционного таджикского двора (хавлӣ) если стиль COURTYARD/TAJIK_TRADITIONAL
- Цен на стройматериалы в Таджикистане (в TJS)
- Все тексты на ДВУХ языках: русском и таджикском
- SVG чертёж должен быть точным (viewBox="0 0 800 600")`

  const userPrompt = `Создай проект дома:
- Стиль: ${style}
- Площадь: ${totalAreaM2} м²
- Этажей: ${floors}
- Спален: ${bedroomCount}, санузлов: ${bathroomCount}
- Бюджет: ${budgetMinTJS}–${budgetMaxTJS} TJS

Верни JSON строго по схеме:
{
  "titleRu": "...", "titleTg": "...",
  "descriptionRu": "...", "descriptionTg": "...",
  "estimateTJS": <число>,
  "rooms": [...],
  "materials": [...],
  "layoutSvg": "<svg>...</svg>",
  "render3d": { "exteriorRu": "...", "exteriorTg": "...", "interiorRu": "...", "interiorTg": "...", "landscapeRu": "...", "landscapeTg": "..." }
}`

  const start = Date.now()
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 8000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })
  const generationMs = Date.now() - start

  await trackAIUsage(
    'claude-sonnet-5',
    'house-project-generation',
    response.usage.input_tokens,
    response.usage.output_tokens
  )

  const raw = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return Response.json({ error: 'Модель вернула некорректный JSON' }, { status: 500 })

  const data = JSON.parse(jsonMatch[0])
  const estimateDirams = BigInt(Math.round((data.estimateTJS ?? 0) * 100))

  // Конвертируем pricePerUnitDirams в Material[]
  const materials = (data.materials ?? []).map((m: any) => ({
    ...m,
    pricePerUnitDirams: BigInt(Math.round((m.pricePerUnitTJS ?? 0) * 100)),
    totalDirams: BigInt(Math.round((m.totalTJS ?? 0) * 100)),
  }))

  const project = await prisma.houseProject.create({
    data: {
      titleRu: data.titleRu,
      titleTg: data.titleTg,
      descriptionRu: data.descriptionRu,
      descriptionTg: data.descriptionTg,
      style,
      totalAreaM2,
      floors,
      bedroomCount,
      bathroomCount,
      estimateDirams,
      budgetMinDirams,
      budgetMaxDirams,
      layoutSvg: data.layoutSvg ?? '',
      roomsJson: JSON.stringify(data.rooms ?? []),
      materialsJson: JSON.stringify(materials),
      render3dJson: JSON.stringify(data.render3d ?? {}),
      modelUsed: 'claude-sonnet-5',
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      generationMs,
    },
  })

  return Response.json({ projectId: project.id, estimateDirams: estimateDirams.toString() })
}
```

---

## Server Action: публикация проекта

```typescript
// app/actions/house-projects.ts
'use server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

export async function publishProject(projectId: string) {
  await prisma.houseProject.update({
    where: { id: projectId },
    data: { isPublic: true },
  })
  revalidatePath('/house-projects')
  revalidatePath(`/house-projects/${projectId}`)
}
```

---

## Frontend компонент: форма генерации

```tsx
// components/features/house-projects/GenerateForm.tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'

const STYLES = [
  { value: 'TAJIK_TRADITIONAL', labelRu: 'Таджикский традиционный', labelTg: 'Анъанавии тоҷикӣ' },
  { value: 'COURTYARD',         labelRu: 'С хавли (двором)',        labelTg: 'Бо ҳавлӣ' },
  { value: 'MODERN',            labelRu: 'Современный',             labelTg: 'Муосир' },
  { value: 'MINIMALIST',        labelRu: 'Минимализм',              labelTg: 'Минималистӣ' },
]

export function GenerateForm({ lang = 'ru' }: { lang?: 'ru' | 'tg' }) {
  const [loading, setLoading] = useState(false)
  const [style, setStyle] = useState('TAJIK_TRADITIONAL')
  const [area, setArea] = useState(120)
  const [bedrooms, setBedrooms] = useState(3)
  const [budget, setBudget] = useState([150_000, 300_000]) // TJS

  async function handleGenerate() {
    setLoading(true)
    try {
      const res = await fetch('/api/house-projects/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          style, totalAreaM2: area, floors: 1,
          bedroomCount: bedrooms, bathroomCount: bedrooms > 2 ? 2 : 1,
          budgetMinTJS: budget[0], budgetMaxTJS: budget[1],
        }),
      })
      const { projectId } = await res.json()
      window.location.href = `/house-projects/${projectId}`
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      {/* Стиль */}
      <div className="grid grid-cols-2 gap-3">
        {STYLES.map(s => (
          <button
            key={s.value}
            onClick={() => setStyle(s.value)}
            className={`min-h-[44px] rounded-lg border p-3 text-sm text-left transition
              ${style === s.value ? 'border-primary bg-primary/10' : 'border-border'}`}
          >
            {lang === 'ru' ? s.labelRu : s.labelTg}
          </button>
        ))}
      </div>

      {/* Площадь */}
      <div>
        <label className="text-sm font-medium">
          {lang === 'ru' ? `Площадь: ${area} м²` : `Майдон: ${area} м²`}
        </label>
        <Slider min={60} max={400} step={10} value={[area]}
          onValueChange={([v]) => setArea(v)} className="mt-2" />
      </div>

      {/* Спальни */}
      <div className="flex gap-2">
        {[2, 3, 4, 5].map(n => (
          <button key={n} onClick={() => setBedrooms(n)}
            className={`min-h-[44px] min-w-[44px] rounded-lg border px-4 text-sm
              ${bedrooms === n ? 'border-primary bg-primary/10' : 'border-border'}`}>
            {n} {lang === 'ru' ? 'сп.' : 'хоб.'}
          </button>
        ))}
      </div>

      <Button onClick={handleGenerate} disabled={loading} className="w-full min-h-[44px]">
        {loading
          ? (lang === 'ru' ? 'Генерирую проект...' : 'Лоиҳа тайёр мешавад...')
          : (lang === 'ru' ? 'Создать проект дома' : 'Лоиҳаи хона сохтан')}
      </Button>
    </div>
  )
}
```

---

## SVG чертёж — промпт для Claude

При генерации SVG укажи Claude следующие требования:

```
SVG чертёж планировки (viewBox="0 0 800 600"):
- Внешние стены: stroke="#333" stroke-width="4" fill="none"
- Внутренние стены: stroke="#666" stroke-width="2"
- Двери: дуга radius=40 stroke="#999"
- Окна: линия stroke="#6af" stroke-width="3"
- Комнаты: fill="rgba(200,220,255,0.2)"
- Подписи комнат: font-size="14" text-anchor="middle"
- Масштаб: 1 метр = 40px
- Ориентация: север вверху, вход снизу по центру
```

---

## BullMQ очередь для тяжёлой генерации

```typescript
// lib/queues/house-queue.ts
import { Queue, Worker } from 'bullmq'
import { redis } from '@/lib/redis'

export const houseQueue = new Queue('house-generation', {
  connection: redis,
  defaultJobOptions: { attempts: 2, backoff: { type: 'exponential', delay: 3000 } },
})

// Для проектов > 200м² — в очередь (долгая генерация)
export async function enqueueHouseGeneration(params: GenerateParams) {
  return houseQueue.add('generate', params, { jobId: `house-${Date.now()}` })
}
```

---

## Что проверить после реализации

- [ ] `estimateDirams` и все `*Dirams` поля — BigInt, не number
- [ ] Оба языка заполнены: titleRu + titleTg, descriptionRu + descriptionTg
- [ ] `trackAIUsage` вызван после каждого Anthropic запроса
- [ ] SVG санитизирован перед вставкой в DOM (нет `<script>` тегов)
- [ ] Кнопка генерации: `min-h-[44px]` (touch target)
- [ ] Prisma findMany для проектов имеет `take` (лимит)
- [ ] Большие проекты (>200м²) идут через BullMQ, не блокируют request
- [ ] JSON поля (roomsJson, materialsJson) парсятся через try/catch
