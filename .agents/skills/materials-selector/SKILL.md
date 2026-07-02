# Materials Selector Agent

## Trigger
`/materials-selector`

## Role
AI-powered building materials selection specialist for Tajikistan construction market. Given project parameters (type, area, climate zone, budget), selects optimal materials for each construction phase, compares local vs imported options, calculates quantities with waste coefficients, and produces a ready-to-order specification in TJS dirams. Integrates with `/house-designer`, `/cost-estimator`, and `/bim-agent`.

---

## Tajikistan Materials Market Context

| Factor | Detail |
|---|---|
| Currency | TJS dirams (1 TJS = 100 dirams) — all prices stored as **BigInt** |
| Local production | Brick (Душанбе, Вахдат), cement (Чорух-Дайрон), sand/gravel (local rivers), timber (Рашт) |
| Imports | Tile, fixtures, insulation (China, Russia, Iran, Turkey) |
| Import premium | +20–35% vs local equivalent (customs + transport) |
| Delivery zones | Душанбе base; +5% Хатлон/Согд; +25–40% ГБАО/Рашт |
| Seasonal availability | Cement & rebar scarce Dec–Feb (factory maintenance) |
| Waste coefficients | Brick 5–8%, tile 10–15%, wallboard 8%, pipe 5% |
| Seismic requirement | All load-bearing materials must meet 7–9 point MSK specs |

### Climate zones and impact on materials

```typescript
const CLIMATE_IMPACT = {
  dushanbe: {
    insulation: 'light',   // R≥2.0 walls, flat roof drainage critical
    waterproof: 'medium',  // spring rains + irrigation flooding
    thermal: 'cooling',    // AC loads dominate
  },
  khujand: {
    insulation: 'medium',  // colder winters than Dushanbe
    waterproof: 'medium',
    thermal: 'mixed',
  },
  gbao: {
    insulation: 'heavy',   // R≥5.0, winters −30°C
    waterproof: 'high',    // snowmelt
    thermal: 'heating',    // heating loads dominate
    seismic: 9,            // highest seismic zone
  },
  rasht: {
    insulation: 'heavy',
    waterproof: 'very_high', // high precipitation
    thermal: 'heating',
  },
} as const;
```

---

## Prisma Models

```prisma
enum MaterialCategory {
  FOUNDATION
  WALLS
  ROOF
  FLOOR_SCREED
  WATERPROOFING
  INSULATION
  FACADE
  INTERIOR_WALLS
  INTERIOR_CEILING
  FLOOR_FINISH
  WINDOWS_DOORS
  ELECTRICAL
  PLUMBING
  HEATING
  LANDSCAPING
}

enum MaterialOrigin {
  LOCAL_TJ   // Таджикское производство
  IMPORT_CN  // Китай
  IMPORT_RU  // Россия
  IMPORT_IR  // Иран
  IMPORT_TR  // Турция
  IMPORT_EU  // Европа
}

model Material {
  id                  String           @id @default(cuid())
  createdAt           DateTime         @default(now())
  updatedAt           DateTime         @updatedAt

  nameRu              String
  nameTj              String
  descriptionRu       String?          @db.Text
  descriptionTj       String?          @db.Text

  category            MaterialCategory
  unit                String           // м², м³, шт, кг, м.п., л, т, уп.
  unitContent         Float?           // напр. 25 (кг в мешке)

  pricePerUnitDirams  BigInt           // базовая цена (Душанбе)
  priceUpdatedAt      DateTime         @default(now())

  origin              MaterialOrigin
  brand               String?
  manufacturer        String?

  // Технические характеристики
  thermalResistance   Float?           // R-value (м²·K/W)
  compressiveStrengthMpa Float?        // для бетона, кирпича
  densityKgM3         Float?
  fireResistanceClass String?          // REI-60, EI-30...
  seismicRating       Int?             // минимальная сейсмика (баллы MSK)
  warrantyYears       Int?
  ecoClass            String?          // A+, A, B, C

  // Доступность
  inStock             Boolean          @default(true)
  minOrderQty         Float?
  leadTimeDays        Int?             // срок доставки

  supplierId          String?
  supplier            Supplier?        @relation(fields: [supplierId], references: [id])

  alternatives        MaterialAlternative[] @relation("BaseMaterial")
  alternativeOf       MaterialAlternative[] @relation("AltMaterial")
  selectionItems      MaterialSelectionItem[]

  @@index([category, pricePerUnitDirams])
  @@index([origin, inStock])
  @@index([nameRu])
}

model Supplier {
  id          String     @id @default(cuid())
  nameRu      String
  nameTj      String
  city        String
  region      String
  phone       String?
  whatsapp    String?
  addressRu   String?
  addressTj   String?
  lat         Float?
  lng         Float?
  isVerified  Boolean    @default(false)
  rating      Float      @default(0)
  materials   Material[]
  createdAt   DateTime   @default(now())

  @@index([city])
}

model MaterialAlternative {
  id              String   @id @default(cuid())
  baseMaterialId  String
  altMaterialId   String
  savingPct       Float    // % экономии vs базового
  noteRu          String?  // когда использовать альтернативу
  noteTj          String?
  base            Material @relation("BaseMaterial", fields: [baseMaterialId], references: [id])
  alt             Material @relation("AltMaterial", fields: [altMaterialId], references: [id])
}

model MaterialSelection {
  id              String   @id @default(cuid())
  createdAt       DateTime @default(now())

  // Параметры запроса
  projectType     String   // house | apartment | renovation | extension
  totalAreaM2     Float
  climateZone     String
  budgetDirams    BigInt
  qualityTier     String   // budget | standard | premium

  // Связь с проектом
  houseProjectId  String?

  // Результат
  items           MaterialSelectionItem[]
  totalDirams     BigInt
  savingsDirams   BigInt
  summaryRu       String   @db.Text
  summaryTj       String   @db.Text
  warningsJson    String   @db.Text  // string[]

  // AI
  modelUsed       String
  inputTokens     Int
  outputTokens    Int
  generationMs    Int

  @@index([houseProjectId])
  @@index([createdAt])
}

model MaterialSelectionItem {
  id            String            @id @default(cuid())
  selectionId   String
  materialId    String?

  categoryRu    String
  categoryTj    String
  nameRu        String
  nameTj        String
  unit          String
  quantity      Float
  wasteCoeff    Float             @default(1.1)
  netQty        Float             // quantity × wasteCoeff
  pricePerUnitDirams BigInt
  totalDirams   BigInt            // netQty × pricePerUnit (BigInt)
  origin        MaterialOrigin
  noteRu        String?
  noteTj        String?

  selection     MaterialSelection @relation(fields: [selectionId], references: [id])
  material      Material?         @relation(fields: [materialId], references: [id])

  @@index([selectionId])
}
```

---

## TypeScript Interfaces

```typescript
type ClimateZone = 'dushanbe' | 'khujand' | 'kulob' | 'gbao' | 'rasht' | 'sugd';
type QualityTier = 'budget' | 'standard' | 'premium';
type ProjectType = 'house' | 'apartment' | 'renovation' | 'extension';

interface SelectionRequest {
  projectType: ProjectType;
  totalAreaM2: number;
  climateZone: ClimateZone;
  budgetTJS: number;
  qualityTier: QualityTier;
  houseProjectId?: string;

  // Детали из HouseProject (если есть)
  wallAreaM2?: number;
  roofAreaM2?: number;
  perimeterM?: number;
  floors?: number;
  hasBasement?: boolean;
}

interface SelectionResultItem {
  categoryRu: string;
  categoryTj: string;
  nameRu: string;
  nameTj: string;
  brand?: string;
  origin: string;          // 'LOCAL_TJ' | 'IMPORT_CN' | ...
  unit: string;
  quantity: number;
  wasteCoeff: number;
  netQty: number;
  pricePerUnitTJS: number; // для отображения (конвертируется из dirams)
  totalTJS: number;
  noteRu?: string;
  noteTj?: string;
  alternativeRu?: string;  // более дешёвый аналог
  alternativeTj?: string;
}

interface SelectionResult {
  items: SelectionResultItem[];
  totalTJS: number;
  savingsTJS: number;      // экономия vs premium
  summaryRu: string;
  summaryTj: string;
  warningsRu: string[];
  warningsTj: string[];
}
```

---

## Material Quantity Calculators

### Универсальный расчёт с коэффициентом отходов

```typescript
function withWaste(qty: number, wastePct: number): number {
  return Math.ceil(qty * (1 + wastePct / 100));
}

// Стандартные коэффициенты отходов по категориям (%)
const WASTE_COEFFICIENTS = {
  brick:        7,   // бой при транспортировке + обрезка
  tile_floor:   12,  // подрезка по периметру
  tile_wall:    15,  // сложнее кладка на стенах
  wallboard:    8,   // обрезка у проёмов
  insulation:   5,   // мин. отходы
  pipe:         5,
  cable:        10,
  laminate:     10,
  paint:        0,   // жидкость — нет отходов, но +10% в расходе
} as const;
```

### Штукатурка

```typescript
function calcPlaster(input: {
  wallAreaM2: number;      // площадь стен (за вычетом проёмов)
  thicknessMm: number;     // толщина слоя: 15–25mm
  type: 'cement' | 'gypsum' | 'decorative';
}): {
  plasterKg: number;       // мешки по 25кг
  bags25kg: number;
  waterL: number;
  primerL: number;
} {
  const consumptionKgPerM2PerMm = {
    cement:     1.6,   // кг/м²/мм
    gypsum:     0.9,
    decorative: 1.4,
  };

  const kgPerM2 = consumptionKgPerM2PerMm[input.type] * input.thicknessMm;
  const plasterKg = Math.ceil(input.wallAreaM2 * kgPerM2 * 1.05); // +5% отходы
  return {
    plasterKg,
    bags25kg: Math.ceil(plasterKg / 25),
    waterL: Math.ceil(input.wallAreaM2 * 0.3),    // ~0.3L/м²
    primerL: Math.ceil(input.wallAreaM2 * 0.15),  // грунтовка 150мл/м²
  };
}
```

### Облицовочная плитка

```typescript
function calcTile(input: {
  areaM2: number;
  tileSizeMm: [number, number];   // [ширина, высота]
  groutJointMm: number;           // шов: 2–5мм
  location: 'floor' | 'wall' | 'facade';
}): {
  tilesNeeded: number;
  tilesWithWaste: number;
  adhesiveKg: number;    // плиточный клей
  adhesiveBags: number;  // мешки по 25кг
  groutKg: number;       // затирка
  primerL: number;
} {
  const [w, h] = input.tileSizeMm.map(x => (x + input.groutJointMm) / 1000);
  const tileAreaM2 = w * h;
  const tilesNeeded = Math.ceil(input.areaM2 / tileAreaM2);
  const wastePct = { floor: 12, wall: 15, facade: 10 }[input.location];
  const tilesWithWaste = withWaste(tilesNeeded, wastePct);

  // Клей: ~5–6 кг/м² при толщине 6мм
  const adhesiveKg = Math.ceil(input.areaM2 * 5.5);
  // Затирка: ~0.3–0.5 кг/м²
  const groutKg = Math.ceil(input.areaM2 * 0.4);

  return {
    tilesNeeded,
    tilesWithWaste,
    adhesiveKg,
    adhesiveBags: Math.ceil(adhesiveKg / 25),
    groutKg: Math.ceil(groutKg),
    primerL: Math.ceil(input.areaM2 * 0.2),
  };
}
```

### Утеплитель (минвата / пенополистирол)

```typescript
function calcInsulation(input: {
  areaM2: number;           // площадь утепляемой поверхности
  climateZone: ClimateZone;
  surface: 'wall' | 'roof' | 'floor';
  type: 'mineral_wool' | 'eps' | 'xps';
}): {
  thicknessMm: number;      // рекомендуемая толщина
  volumeM3: number;
  slabCount?: number;       // для листовых материалов
  rollCount?: number;       // для рулонных
  dowelsPcs: number;        // дюбели-грибки для стен
} {
  // Нормативы СНиП для Таджикистана
  const requiredR = {
    dushanbe: { wall: 2.0, roof: 3.0, floor: 1.5 },
    khujand:  { wall: 2.5, roof: 3.5, floor: 2.0 },
    gbao:     { wall: 5.0, roof: 6.0, floor: 3.5 },
    rasht:    { wall: 4.0, roof: 5.0, floor: 3.0 },
    kulob:    { wall: 2.5, roof: 3.5, floor: 2.0 },
    sugd:     { wall: 3.0, roof: 4.0, floor: 2.5 },
  };

  const lambdaValues = {
    mineral_wool: 0.040,  // Вт/(м·К)
    eps:          0.038,
    xps:          0.030,
  };

  const R = requiredR[input.climateZone]?.[input.surface] ?? 3.0;
  const lambda = lambdaValues[input.type];
  const thicknessMm = Math.ceil(R * lambda * 1000 / 25) * 25; // кратно 25мм

  const volumeM3 = (input.areaM2 * thicknessMm) / 1000;
  const dowelsPcs = input.surface === 'wall'
    ? Math.ceil(input.areaM2 * 6)  // 6 дюбелей на м²
    : 0;

  // Листы 1200×600мм или 1000×500мм (стандарт)
  const slabAreaM2 = 1.2 * 0.6;
  const slabCount = input.type !== 'mineral_wool'
    ? withWaste(Math.ceil(input.areaM2 / slabAreaM2), 5)
    : undefined;
  // Рулоны минваты 10м² / рулон
  const rollCount = input.type === 'mineral_wool'
    ? withWaste(Math.ceil(input.areaM2 / 10), 5)
    : undefined;

  return { thicknessMm, volumeM3: Math.ceil(volumeM3 * 10) / 10,
           slabCount, rollCount, dowelsPcs };
}
```

### Кровельные материалы (плоская крыша)

```typescript
function calcFlatRoof(input: {
  roofAreaM2: number;
  climateZone: ClimateZone;
  hasParapet: boolean;
  parapetHeightM?: number;
  perimeterM?: number;
}): {
  waterproofingRollsM2: number;    // 2 слоя еврорубероид
  primerBitumenL: number;
  insulation: ReturnType<typeof calcInsulation>;
  screedCementBags: number;
  drainPipesPcs: number;
} {
  const area = input.roofAreaM2;
  // 2 слоя гидроизоляции + нахлёст 10%
  const waterproofingRollsM2 = Math.ceil(area * 2 * 1.1);
  const primerBitumenL = Math.ceil(area * 0.3); // грунтовка

  // Стяжка под гидроизоляцию: 40мм
  const screedM3 = area * 0.04;
  const screedCementBags = Math.ceil(screedM3 * 280 / 25); // 280кг цемента на м³

  // Водостоки: 1 воронка на 50м² + 1 аварийная на 100м²
  const drainPipesPcs = Math.ceil(area / 50) + Math.ceil(area / 100);

  const insulation = calcInsulation({
    areaM2: area,
    climateZone: input.climateZone,
    surface: 'roof',
    type: 'xps', // XPS лучше для плоской кровли (влагостойкий)
  });

  return { waterproofingRollsM2, primerBitumenL, insulation,
           screedCementBags, drainPipesPcs };
}
```

### Краска / декоративная штукатурка

```typescript
function calcPaint(input: {
  areaM2: number;
  coats: number;                    // 1–3 слоя
  type: 'water_emulsion' | 'acrylic' | 'facade' | 'ceiling';
}): {
  paintL: number;
  cans10L: number;
  primerL: number;
} {
  const consumptionLPerM2PerCoat = {
    water_emulsion: 0.12,
    acrylic:        0.10,
    facade:         0.15,
    ceiling:        0.10,
  };

  const paintL = Math.ceil(input.areaM2 * consumptionLPerM2PerCoat[input.type] * input.coats);
  return {
    paintL,
    cans10L: Math.ceil(paintL / 10),
    primerL: Math.ceil(input.areaM2 * 0.1),
  };
}
```

---

## API Routes

### POST /api/materials/select — AI подбор материалов

```typescript
// app/api/materials/select/route.ts
import Anthropic from '@anthropic-ai/sdk'
import { trackAIUsage } from '@/lib/ai-tracking'
import { prisma } from '@/lib/prisma'

const anthropic = new Anthropic()

export async function POST(request: Request) {
  const body: SelectionRequest = await request.json()
  const { projectType, totalAreaM2, climateZone, budgetTJS, qualityTier, houseProjectId } = body

  const budgetDirams = BigInt(Math.round(budgetTJS * 100))
  const start = Date.now()

  // Загружаем актуальные цены из каталога
  const catalogMaterials = await prisma.material.findMany({
    where: { inStock: true },
    select: {
      nameRu: true, nameTj: true, category: true,
      pricePerUnitDirams: true, unit: true, origin: true,
    },
    orderBy: { pricePerUnitDirams: 'asc' },
    take: 150,
  })

  const priceList = catalogMaterials
    .map(m => `${m.nameRu} (${m.origin}): ${Number(m.pricePerUnitDirams) / 100} TJS/${m.unit}`)
    .join('\n')

  const prompt = buildSelectionPrompt(body, priceList)

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  })

  await trackAIUsage('claude-sonnet-5', 'materials-selection',
    response.usage.input_tokens, response.usage.output_tokens)

  const raw = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return Response.json({ error: 'Модель вернула некорректный JSON' }, { status: 500 })
  }

  const data: SelectionResult = JSON.parse(jsonMatch[0])
  const totalDirams = BigInt(Math.round(data.totalTJS * 100))
  const savingsDirams = BigInt(Math.round(data.savingsTJS * 100))

  // Сохраняем в БД
  const selection = await prisma.materialSelection.create({
    data: {
      projectType, totalAreaM2, climateZone, qualityTier,
      budgetDirams, houseProjectId: houseProjectId ?? null,
      totalDirams, savingsDirams,
      summaryRu: data.summaryRu,
      summaryTj: data.summaryTj,
      warningsJson: JSON.stringify(data.warningsRu ?? []),
      modelUsed: 'claude-sonnet-5',
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      generationMs: Date.now() - start,
      items: {
        create: data.items.map(item => ({
          categoryRu: item.categoryRu,
          categoryTj: item.categoryTj,
          nameRu: item.nameRu,
          nameTj: item.nameTj,
          unit: item.unit,
          quantity: item.quantity,
          wasteCoeff: item.wasteCoeff,
          netQty: item.netQty,
          pricePerUnitDirams: BigInt(Math.round(item.pricePerUnitTJS * 100)),
          totalDirams: BigInt(Math.round(item.totalTJS * 100)),
          origin: item.origin as any,
          noteRu: item.noteRu ?? null,
          noteTj: item.noteTj ?? null,
        })),
      },
    },
  })

  return Response.json({
    selectionId: selection.id,
    totalDirams: totalDirams.toString(),
    savingsDirams: savingsDirams.toString(),
    summaryRu: data.summaryRu,
    summaryTj: data.summaryTj,
    warningsRu: data.warningsRu ?? [],
    warningsTj: data.warningsTj ?? [],
    items: data.items,
  })
}

const SYSTEM_PROMPT = `Ты — эксперт по строительным материалам Таджикистана.
Правила:
- Предпочитай LOCAL_TJ материалы — дешевле, быстрее, нет таможни
- Учитывай сейсмику (7–9 баллов) — несущие конструкции только сертифицированные
- Для GBAO/Rasht — обязательно тяжёлый утеплитель (XPS/минвата ≥150мм)
- Давай бюджетную альтернативу для каждой позиции
- Предупреждай о сезонном дефиците (цемент, арматура Dec–Feb)
- Все тексты на ДВУХ языках: русском (nameRu) и таджикском (nameTj)
- Возвращай строго JSON без markdown-обёртки`

function buildSelectionPrompt(req: SelectionRequest, priceList: string): string {
  return `Подбери строительные материалы:
Тип проекта: ${req.projectType}
Площадь: ${req.totalAreaM2} м²
Климатическая зона: ${req.climateZone}
Качество: ${req.qualityTier}
Бюджет: ${req.budgetTJS} TJS

${priceList ? `Актуальные цены из каталога:\n${priceList}` : 'Используй средние рыночные цены Таджикистана 2025.'}

Верни JSON:
{
  "items": [{
    "categoryRu": "Фундамент",
    "categoryTj": "Асос",
    "nameRu": "Цемент М400",
    "nameTj": "Семент М400",
    "unit": "мешок 50кг",
    "quantity": 120,
    "wasteCoeff": 1.05,
    "netQty": 126,
    "pricePerUnitTJS": 45,
    "totalTJS": 5670,
    "origin": "LOCAL_TJ",
    "noteRu": "Для фундаментной плиты",
    "noteTj": "Барои плитаи асос",
    "alternativeRu": "М300 — дешевле на 15%, для ненесущих конструкций",
    "alternativeTj": "М300 — 15% арзонтар, барои конструксияҳои ғайринесущий"
  }],
  "totalTJS": 850000,
  "savingsTJS": 120000,
  "summaryRu": "Подобраны материалы...",
  "summaryTj": "Маводҳо интихоб шуданд...",
  "warningsRu": ["Арматура — дефицит Dec–Feb, закупите заранее"],
  "warningsTj": ["Арматура — камбуд дар дек–фев, пеш харед"]
}`
}
```

### GET /api/materials/catalog — каталог материалов

```typescript
// app/api/materials/catalog/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const origin = searchParams.get('origin')
  const maxPriceTJS = searchParams.get('maxPrice')
    ? Number(searchParams.get('maxPrice'))
    : undefined

  const materials = await prisma.material.findMany({
    where: {
      inStock: true,
      ...(category && { category: category as any }),
      ...(origin && { origin: origin as any }),
      ...(maxPriceTJS && { pricePerUnitDirams: { lte: BigInt(Math.round(maxPriceTJS * 100)) } }),
    },
    include: {
      supplier: { select: { nameRu: true, nameTj: true, city: true, phone: true } },
    },
    orderBy: { pricePerUnitDirams: 'asc' },
    take: 50,
  })

  return Response.json({
    materials: materials.map(m => ({
      ...m,
      pricePerUnitDirams: m.pricePerUnitDirams.toString(), // BigInt → string для JSON
    })),
  })
}
```

---

## React Components

### MaterialsTable — таблица подобранных материалов

```tsx
// components/features/materials/MaterialsTable.tsx
'use client'
import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'

const ORIGIN_LABEL: Record<string, { ru: string; flag: string }> = {
  LOCAL_TJ:  { ru: 'Местное',  flag: '🇹🇯' },
  IMPORT_CN: { ru: 'Китай',    flag: '🇨🇳' },
  IMPORT_RU: { ru: 'Россия',   flag: '🇷🇺' },
  IMPORT_IR: { ru: 'Иран',     flag: '🇮🇷' },
  IMPORT_TR: { ru: 'Турция',   flag: '🇹🇷' },
  IMPORT_EU: { ru: 'Европа',   flag: '🇪🇺' },
}

interface Props {
  items: SelectionResultItem[]
  warningsRu?: string[]
  warningsTj?: string[]
  lang?: 'ru' | 'tj'
}

export function MaterialsTable({ items, warningsRu = [], warningsTj = [], lang = 'ru' }: Props) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [showLocalOnly, setShowLocalOnly] = useState(false)

  const categories = useMemo(() =>
    [...new Set(items.map(i => lang === 'ru' ? i.categoryRu : i.categoryTj))],
    [items, lang]
  )

  const filtered = useMemo(() => items.filter(i => {
    const cat = lang === 'ru' ? i.categoryRu : i.categoryTj
    if (activeCategory && cat !== activeCategory) return false
    if (showLocalOnly && i.origin !== 'LOCAL_TJ') return false
    return true
  }), [items, activeCategory, showLocalOnly, lang])

  const totalDirams = useMemo(
    () => filtered.reduce((sum, i) => sum + BigInt(Math.round(i.totalTJS * 100)), 0n),
    [filtered]
  )

  const warnings = lang === 'ru' ? warningsRu : warningsTj

  return (
    <div className="space-y-4">
      {/* Предупреждения */}
      {warnings.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Фильтры */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory(null)}
          className={`min-h-[44px] px-3 rounded-lg border text-sm transition
            ${!activeCategory ? 'border-primary bg-primary/10 font-medium' : 'border-border'}`}
        >
          {lang === 'ru' ? 'Все категории' : 'Ҳама гурӯҳҳо'}
        </button>
        {categories.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
            className={`min-h-[44px] px-3 rounded-lg border text-sm transition
              ${activeCategory === cat ? 'border-primary bg-primary/10 font-medium' : 'border-border'}`}>
            {cat}
          </button>
        ))}

        <button
          onClick={() => setShowLocalOnly(!showLocalOnly)}
          className={`min-h-[44px] px-3 rounded-lg border text-sm ml-auto transition
            ${showLocalOnly ? 'border-green-600 bg-green-50 text-green-700' : 'border-border'}`}
        >
          🇹🇯 {lang === 'ru' ? 'Только местное' : 'Танҳо маҳаллӣ'}
        </button>
      </div>

      {/* Таблица */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">
                {lang === 'ru' ? 'Материал' : 'Маводҳо'}
              </th>
              <th className="text-right p-3 font-medium whitespace-nowrap">
                {lang === 'ru' ? 'Кол-во' : 'Миқдор'}
              </th>
              <th className="text-right p-3 font-medium whitespace-nowrap">
                {lang === 'ru' ? 'Цена/ед.' : 'Нарх/воҳ.'}
              </th>
              <th className="text-right p-3 font-medium">
                {lang === 'ru' ? 'Итого' : 'Ҷамъ'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((item, i) => {
              const origin = ORIGIN_LABEL[item.origin]
              return (
                <tr key={i} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3">
                    <div className="font-medium">
                      {lang === 'ru' ? item.nameRu : item.nameTj}
                      {' '}
                      <span title={origin?.ru}>{origin?.flag}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {lang === 'ru' ? item.categoryRu : item.categoryTj}
                    </div>
                    {item.alternativeRu && (
                      <div className="text-xs text-blue-600 mt-1">
                        💡 {lang === 'ru' ? item.alternativeRu : item.alternativeTj}
                      </div>
                    )}
                    {item.noteRu && (
                      <div className="text-xs text-muted-foreground mt-0.5 italic">
                        {lang === 'ru' ? item.noteRu : item.noteTj}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-right tabular-nums whitespace-nowrap">
                    {item.netQty} {item.unit}
                    {item.wasteCoeff > 1 && (
                      <div className="text-xs text-muted-foreground">
                        +{Math.round((item.wasteCoeff - 1) * 100)}% отх.
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-right tabular-nums whitespace-nowrap">
                    {item.pricePerUnitTJS.toLocaleString('ru')} TJS
                  </td>
                  <td className="p-3 text-right font-medium tabular-nums whitespace-nowrap">
                    {item.totalTJS.toLocaleString('ru')} TJS
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 bg-muted/20 font-bold">
              <td colSpan={3} className="p-3">
                {lang === 'ru' ? 'Итого' : 'Ҷамъи умумӣ'}
              </td>
              <td className="p-3 text-right tabular-nums whitespace-nowrap">
                {(Number(totalDirams) / 100).toLocaleString('ru')} TJS
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
```

### SelectionForm — форма запроса подбора

```tsx
// components/features/materials/SelectionForm.tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'

const CLIMATE_ZONES = [
  { value: 'dushanbe', labelRu: 'Душанбе и пригороды',  labelTj: 'Душанбе ва атроф' },
  { value: 'khujand',  labelRu: 'Хужанд / Согд',        labelTj: 'Хуҷанд / Суғд' },
  { value: 'kulob',    labelRu: 'Куляб / Хатлон',       labelTj: 'Кӯлоб / Хатлон' },
  { value: 'gbao',     labelRu: 'ГБАО (горный)',         labelTj: 'ВМКБ (кӯҳӣ)' },
  { value: 'rasht',    labelRu: 'Рашт / Тавилдара',     labelTj: 'Рашт / Тавилдара' },
]

const QUALITY_TIERS = [
  { value: 'budget',   labelRu: 'Эконом (3 500–5 000 TJS/м²)',   labelTj: 'Иқтисодӣ' },
  { value: 'standard', labelRu: 'Стандарт (5 000–8 000 TJS/м²)', labelTj: 'Стандарт' },
  { value: 'premium',  labelRu: 'Премиум (8 000–15 000 TJS/м²)', labelTj: 'Премиум' },
]

interface Props {
  houseProjectId?: string
  defaultAreaM2?: number
  lang?: 'ru' | 'tj'
  onResult: (result: any) => void
}

export function SelectionForm({ houseProjectId, defaultAreaM2 = 120, lang = 'ru', onResult }: Props) {
  const [loading, setLoading] = useState(false)
  const [area, setArea] = useState(defaultAreaM2)
  const [climateZone, setClimateZone] = useState('dushanbe')
  const [qualityTier, setQualityTier] = useState('standard')
  const [budget, setBudget] = useState(area * 6000) // ~6000 TJS/м² стандарт

  // Обновляем бюджет при изменении площади
  const handleAreaChange = (v: number) => {
    setArea(v)
    setBudget(v * 6000)
  }

  async function handleSelect() {
    setLoading(true)
    try {
      const res = await fetch('/api/materials/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectType: 'house',
          totalAreaM2: area,
          climateZone,
          budgetTJS: budget,
          qualityTier,
          houseProjectId,
        }),
      })
      if (!res.ok) throw new Error('Ошибка подбора материалов')
      const data = await res.json()
      onResult(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5 max-w-md">
      {/* Площадь */}
      <div>
        <label className="text-sm font-medium block mb-2">
          {lang === 'ru' ? `Площадь дома: ${area} м²` : `Майдони хона: ${area} м²`}
        </label>
        <Slider min={50} max={500} step={10} value={[area]}
          onValueChange={([v]) => handleAreaChange(v)} />
      </div>

      {/* Климатическая зона */}
      <div>
        <label className="text-sm font-medium block mb-2">
          {lang === 'ru' ? 'Регион строительства' : 'Минтақаи сохтмон'}
        </label>
        <Select value={climateZone} onValueChange={setClimateZone}>
          <SelectTrigger className="min-h-[44px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CLIMATE_ZONES.map(z => (
              <SelectItem key={z.value} value={z.value}>
                {lang === 'ru' ? z.labelRu : z.labelTj}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Уровень качества */}
      <div className="grid grid-cols-3 gap-2">
        {QUALITY_TIERS.map(t => (
          <button key={t.value} onClick={() => setQualityTier(t.value)}
            className={`min-h-[44px] rounded-lg border p-2 text-xs text-center transition
              ${qualityTier === t.value ? 'border-primary bg-primary/10 font-medium' : 'border-border'}`}>
            {lang === 'ru' ? t.labelRu : t.labelTj}
          </button>
        ))}
      </div>

      {/* Бюджет */}
      <div>
        <label className="text-sm font-medium block mb-2">
          {lang === 'ru'
            ? `Бюджет: ${budget.toLocaleString('ru')} TJS`
            : `Буҷет: ${budget.toLocaleString('ru')} TJS`}
        </label>
        <Slider min={100_000} max={5_000_000} step={50_000} value={[budget]}
          onValueChange={([v]) => setBudget(v)} />
      </div>

      <Button onClick={handleSelect} disabled={loading} className="w-full min-h-[44px]">
        {loading
          ? (lang === 'ru' ? 'Подбираю материалы...' : 'Маводҳо интихоб мешаванд...')
          : (lang === 'ru' ? 'Подобрать материалы' : 'Маводҳо интихоб кардан')}
      </Button>
    </div>
  )
}
```

---

## Интеграция с другими агентами

### С /house-designer
После генерации `HouseProject` — запускаем подбор материалов через BullMQ:

```typescript
// После prisma.houseProject.create(...)
await houseQueue.add('select-materials', {
  houseProjectId: project.id,
  projectType: 'house',
  totalAreaM2: project.totalArea,
  climateZone: project.climateZone,
  budgetTJS: project.budgetMaxDirams
    ? Number(project.budgetMaxDirams) / 100
    : project.totalArea * 6000,
  qualityTier: 'standard',
}, { attempts: 2, backoff: { type: 'exponential', delay: 3000 } })
```

### С /cost-estimator
Передаём `selectionId` для обогащения сметы реальными ценами:

```typescript
// В cost-estimator — загружаем позиции из подбора
const selection = await prisma.materialSelection.findUnique({
  where: { id: selectionId },
  include: { items: true },
})
// Маппим в CostLineItem[]
```

---

## Чеклист после реализации

- [ ] `pricePerUnitDirams` и `totalDirams` — `BigInt`, не `number`
- [ ] Отображение цен только через `Number(dirams) / 100` в UI слое
- [ ] `trackAIUsage` вызван после Anthropic запроса
- [ ] `prisma.material.findMany` имеет `take: 150`
- [ ] BigInt поля сериализуются как `.toString()` в JSON-ответе
- [ ] Предупреждения (`warningsRu/Tj`) отображены пользователю
- [ ] Таблица скроллируется горизонтально на мобиле (`overflow-x-auto`)
- [ ] Все интерактивные элементы: `min-h-[44px]`
- [ ] Оба языка заполнены: `nameRu` + `nameTj` везде
- [ ] XSS: нет `dangerouslySetInnerHTML` с данными от AI
