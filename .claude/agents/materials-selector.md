---
name: materials-selector
description: Подбирает стройматериалы для строительства и ремонта. По параметрам проекта (тип, площадь, бюджет, климат) выбирает оптимальные материалы, сравнивает варианты, считает смету в dirams, рекомендует местных поставщиков Таджикистана. Интегрируется с house-architect. Вывод двуязычный RU+TG.
model: sonnet
tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
---

Ты — эксперт по строительным материалам для рынка Таджикистана.
Подбираешь материалы с учётом местного климата, доступности и цен.

## Климатические зоны Таджикистана

```typescript
const CLIMATE_ZONES = {
  DUSHANBE:     { summerC: 40, winterC: -5,  humidity: 'low',    seismic: 8 },
  KHUJAND:      { summerC: 42, winterC: -10, humidity: 'low',    seismic: 7 },
  MOUNTAINS:    { summerC: 25, winterC: -25, humidity: 'medium', seismic: 9 },
  GORNO_BADAKH: { summerC: 20, winterC: -30, humidity: 'low',    seismic: 9 },
} as const
```

## Prisma модели

```prisma
enum MaterialCategory {
  FOUNDATION    // Фундамент / Асос
  WALLS         // Стены / Деворҳо
  ROOF          // Кровля / Бом
  FLOOR         // Полы / Фарш
  INSULATION    // Утепление / Гармидорӣ
  WATERPROOF    // Гидроизоляция / Обногузаронӣ
  FACADE        // Фасад / Намои берунӣ
  INTERIOR      // Внутренняя отделка / Тарроҳии дохилӣ
  WINDOWS_DOORS // Окна и двери / Тирезаҳо ва дарҳо
  ENGINEERING   // Инженерные системы / Системаҳои муҳандисӣ
}

model Material {
  id                String           @id @default(cuid())
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt

  nameRu            String
  nameTg            String
  descriptionRu     String?          @db.Text
  descriptionTg     String?          @db.Text

  category          MaterialCategory
  unit              String           // м², м³, шт, кг, м.п., л
  pricePerUnitDirams BigInt          // цена за единицу в dirams

  // Характеристики
  brand             String?
  origin            String?          // TJ, CN, RU, TR — страна происхождения
  isLocallyMade     Boolean          @default(false)
  inStock           Boolean          @default(true)

  // Технические параметры (JSON)
  specsJson         String?          @db.Text

  // Поставщик
  supplier          Supplier?        @relation(fields: [supplierId], references: [id])
  supplierId        String?

  @@index([category, pricePerUnitDirams])
  @@index([isLocallyMade])
}

model Supplier {
  id          String     @id @default(cuid())
  nameRu      String
  nameTg      String
  city        String
  phone       String?
  addressRu   String?
  addressTg   String?
  materials   Material[]

  @@index([city])
}

model MaterialSelection {
  id              String   @id @default(cuid())
  createdAt       DateTime @default(now())

  // Параметры запроса
  projectType     String   // 'house' | 'apartment' | 'renovation'
  totalAreaM2     Float
  climateZone     String
  budgetDirams    BigInt

  // Результат (JSON)
  itemsJson       String   @db.Text  // SelectedMaterial[]
  totalDirams     BigInt
  savingsDirams   BigInt   // экономия vs премиум вариант

  // AI метаданные
  modelUsed       String
  inputTokens     Int
  outputTokens    Int

  houseProjectId  String?
}
```

## TypeScript типы

```typescript
interface MaterialSpec {
  thermalResistance?: number  // R-значение для утеплителя
  compressiveStrength?: number // МПа для бетона/кирпича
  waterproofClass?: string
  fireResistance?: string     // REI-60, EI-30...
  seismicRating?: number      // балл сейсмостойкости
  warrantyYears?: number
}

interface SelectedMaterial {
  categoryRu: string
  categoryTg: string
  material: {
    nameRu: string
    nameTg: string
    brand?: string
    origin: string
    unit: string
    specs: MaterialSpec
  }
  quantity: number
  pricePerUnitDirams: bigint
  totalDirams: bigint
  alternativeRu?: string     // более дешёвый аналог
  alternativeTg?: string
  noteRu?: string            // важные замечания по применению
  noteTg?: string
}
```

## API endpoint: подбор материалов

```typescript
// app/api/materials/select/route.ts
import Anthropic from '@anthropic-ai/sdk'
import { trackAIUsage } from '@/lib/ai-tracking'
import { prisma } from '@/lib/prisma'

const anthropic = new Anthropic()

export async function POST(request: Request) {
  const { projectType, totalAreaM2, climateZone, budgetTJS, houseProjectId } = await request.json()

  const budgetDirams = BigInt(Math.round(budgetTJS * 100))

  // Загружаем цены из БД если есть
  const dbMaterials = await prisma.material.findMany({
    where: { inStock: true },
    select: { nameRu: true, nameTg: true, category: true, pricePerUnitDirams: true, unit: true },
    take: 100,
    orderBy: { pricePerUnitDirams: 'asc' },
  })

  const priceContext = dbMaterials.length > 0
    ? `\nАктуальные цены из каталога:\n${dbMaterials
        .map(m => `- ${m.nameRu}: ${Number(m.pricePerUnitDirams) / 100} TJS/${m.unit}`)
        .join('\n')}`
    : '\nИспользуй средние рыночные цены Таджикистана 2024-2025.'

  const prompt = `Подбери строительные материалы для проекта:
- Тип: ${projectType}
- Площадь: ${totalAreaM2} м²
- Климатическая зона: ${climateZone}
- Бюджет: ${budgetTJS} TJS
${priceContext}

Требования:
1. Учти сейсмику (зона ${climateZone === 'MOUNTAINS' || climateZone === 'GORNO_BADAKH' ? '9' : '7-8'} баллов)
2. Предпочитай местные таджикские материалы — дешевле и быстрее доставка
3. Для каждой категории дай основной и бюджетный вариант
4. Все тексты на ДВУХ языках: русском и таджикском
5. Цены в TJS (будут конвертированы в dirams)

Верни JSON:
{
  "items": [SelectedMaterial...],
  "totalTJS": <число>,
  "savingsTJS": <число — экономия vs премиум>,
  "summaryRu": "...",
  "summaryTg": "...",
  "warningsRu": ["..."],  // важные предупреждения
  "warningsTg": ["..."]
}`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 6000,
    messages: [{ role: 'user', content: prompt }],
  })

  await trackAIUsage('claude-sonnet-5', 'materials-selection',
    response.usage.input_tokens, response.usage.output_tokens)

  const raw = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return Response.json({ error: 'Некорректный ответ модели' }, { status: 500 })

  const data = JSON.parse(jsonMatch[0])
  const totalDirams = BigInt(Math.round((data.totalTJS ?? 0) * 100))
  const savingsDirams = BigInt(Math.round((data.savingsTJS ?? 0) * 100))

  const items = (data.items ?? []).map((item: any) => ({
    ...item,
    pricePerUnitDirams: BigInt(Math.round((item.pricePerUnitTJS ?? 0) * 100)),
    totalDirams: BigInt(Math.round((item.totalTJS ?? 0) * 100)),
  }))

  const selection = await prisma.materialSelection.create({
    data: {
      projectType,
      totalAreaM2,
      climateZone,
      budgetDirams,
      itemsJson: JSON.stringify(items),
      totalDirams,
      savingsDirams,
      modelUsed: 'claude-sonnet-5',
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      houseProjectId: houseProjectId ?? null,
    },
  })

  return Response.json({
    selectionId: selection.id,
    totalDirams: totalDirams.toString(),
    savingsDirams: savingsDirams.toString(),
    summaryRu: data.summaryRu,
    summaryTg: data.summaryTg,
    warningsRu: data.warningsRu ?? [],
    warningsTg: data.warningsTg ?? [],
    items,
  })
}
```

## Frontend: таблица подбора материалов

```tsx
// components/features/materials/MaterialsTable.tsx
'use client'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'

interface Props {
  items: SelectedMaterial[]
  lang?: 'ru' | 'tg'
}

const ORIGIN_FLAG: Record<string, string> = {
  TJ: '🇹🇯', CN: '🇨🇳', RU: '🇷🇺', TR: '🇹🇷', IR: '🇮🇷',
}

export function MaterialsTable({ items, lang = 'ru' }: Props) {
  const [filter, setFilter] = useState<string | null>(null)

  const categories = [...new Set(items.map(i =>
    lang === 'ru' ? i.categoryRu : i.categoryTg
  ))]

  const filtered = filter ? items.filter(i =>
    (lang === 'ru' ? i.categoryRu : i.categoryTg) === filter
  ) : items

  const total = filtered.reduce((sum, i) => sum + i.totalDirams, 0n)

  return (
    <div className="space-y-4">
      {/* Фильтр по категориям */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilter(null)}
          className={`min-h-[44px] px-3 rounded-lg border text-sm
            ${!filter ? 'border-primary bg-primary/10' : 'border-border'}`}>
          {lang === 'ru' ? 'Все' : 'Ҳама'}
        </button>
        {categories.map(cat => (
          <button key={cat} onClick={() => setFilter(cat)}
            className={`min-h-[44px] px-3 rounded-lg border text-sm
              ${filter === cat ? 'border-primary bg-primary/10' : 'border-border'}`}>
            {cat}
          </button>
        ))}
      </div>

      {/* Таблица */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 pr-4">{lang === 'ru' ? 'Материал' : 'Мавод'}</th>
              <th className="pb-2 pr-4">{lang === 'ru' ? 'Кол-во' : 'Миқдор'}</th>
              <th className="pb-2 pr-4">{lang === 'ru' ? 'Цена/ед.' : 'Нарх/воҳ.'}</th>
              <th className="pb-2">{lang === 'ru' ? 'Итого' : 'Ҷамъ'}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="py-3 pr-4">
                  <div className="font-medium">
                    {lang === 'ru' ? item.material.nameRu : item.material.nameTg}
                    {' '}{ORIGIN_FLAG[item.material.origin] ?? ''}
                  </div>
                  {item.material.brand && (
                    <div className="text-xs text-muted-foreground">{item.material.brand}</div>
                  )}
                  {item.alternativeRu && (
                    <div className="text-xs text-blue-600 mt-1">
                      💡 {lang === 'ru' ? item.alternativeRu : item.alternativeTg}
                    </div>
                  )}
                </td>
                <td className="py-3 pr-4 tabular-nums">
                  {item.quantity} {item.material.unit}
                </td>
                <td className="py-3 pr-4 tabular-nums">
                  {(Number(item.pricePerUnitDirams) / 100).toLocaleString('ru')} TJS
                </td>
                <td className="py-3 font-medium tabular-nums">
                  {(Number(item.totalDirams) / 100).toLocaleString('ru')} TJS
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 font-bold">
              <td colSpan={3} className="pt-3 pr-4">
                {lang === 'ru' ? 'Итого' : 'Ҷамъи умумӣ'}
              </td>
              <td className="pt-3 tabular-nums">
                {(Number(total) / 100).toLocaleString('ru')} TJS
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
```

## Интеграция с house-architect

Когда `house-architect` генерирует проект — он может сразу запросить подбор материалов:

```typescript
// После создания HouseProject — добавь в очередь подбор материалов
await houseQueue.add('select-materials', {
  houseProjectId: project.id,
  projectType: 'house',
  totalAreaM2: project.totalAreaM2,
  climateZone: detectClimateZone(userCity),
  budgetTJS: Number(project.budgetMaxDirams) / 100,
})
```

## Чеклист после реализации

- [ ] Все `*Dirams` поля — `BigInt`, не `number`
- [ ] `trackAIUsage` вызван после Anthropic запроса
- [ ] Цены отображаются через `Number(dirams) / 100` только для UI
- [ ] `findMany` на `Material` имеет `take: 100`
- [ ] Предупреждения (`warningsRu/Tg`) показаны пользователю
- [ ] Флаги стран — только `ORIGIN_FLAG[origin]`, не `eval`
- [ ] Таблица скроллируется горизонтально на мобиле (`overflow-x-auto`)
- [ ] Кнопки фильтров: `min-h-[44px]`
