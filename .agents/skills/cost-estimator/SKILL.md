# Cost Estimator Agent

## Trigger
`/cost-estimator`

## Role
Unified construction and fit-out cost estimator for Tajikistan residential projects. Aggregates takeoffs from BIM Agent, material lists from House Designer, furniture from Furniture/Interior Designers, and landscaping from Landscape Designer — then produces phase-by-phase budget breakdowns, regional price adjustments, bank loan scenarios, and printable cost reports in TJS.

---

## Tajikistan Cost Context

| Context | Detail |
|---|---|
| Currency | Tajikistani somoni (TJS) — store as **integer dirams** (1 TJS = 100 dirams) |
| USD/TJS rate | ~10.9 TJS (store in `ExchangeRate` table, update daily) |
| Inflation | ~8–12% annual TJS inflation — apply to multi-year projects |
| Imported materials | Priced in USD by suppliers; convert at `ExchangeRate.rate` |
| Customs duty | 15–20% on imported construction materials |
| VAT | 14% on all goods/services (НДС) |
| Regional cost multipliers | Dushanbe ×1.0 (base), Khujand ×1.15, Kulob ×1.20, GBAO ×1.40 |
| Seasonal price spike | Cement/rebar +15% April–September (construction season) |
| Typical cost/m² | Budget 3 500–5 000 TJS/m², Standard 5 000–8 000, Premium 8 000–15 000 |
| Labour share | ~35% of total construction cost |
| Self-build discount | −20% vs contractor (but adds 30% time risk) |
| Bank loan rates | Amonatbank 21%, Eskhata 22%, Bank Arvand 24% annual |
| Loan max term | 10 years residential mortgage in TJ |

---

## Data Interfaces

```ts
interface CostEstimate {
  id: string;
  projectId: string;
  nameRu: string;
  region: TJRegion;
  buildingAreaM2: number;       // gross floor area
  plotAreaSotka: number;
  quality: QualityTier;
  phases: CostPhase[];
  summary: CostSummary;
  exchangeRates: ExchangeRateSnapshot;
  seasonMultiplier: number;     // 1.0 or 1.15
  vatIncluded: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type TJRegion = 'dushanbe' | 'khujand' | 'kulob' | 'qurghon' | 'hissor' | 'tursunzoda' | 'gbao' | 'rasht';
type QualityTier = 'budget' | 'standard' | 'premium' | 'luxury';

const REGION_MULTIPLIER: Record<TJRegion, number> = {
  dushanbe:    1.00,
  khujand:     1.15,
  kulob:       1.20,
  qurghon:     1.18,
  hissor:      1.05,
  tursunzoda:  1.08,
  gbao:        1.40,
  rasht:       1.25,
};

interface CostPhase {
  id: string;
  estimateId: string;
  order: number;
  nameRu: string;
  nameTj: string;
  lineItems: CostLineItem[];
  subtotalDirams: number;       // sum of line items
  labourDirams: number;
  materialDirams: number;
  contingencyPct: number;       // e.g. 0.10
  contingencyDirams: number;
  totalDirams: number;
  sourceAgent?: string;         // 'bim' | 'house-designer' | 'furniture-designer' | 'interior-designer' | 'landscape-designer'
  status: PhaseStatus;
  actualDirams?: number;        // filled as project progresses
}

type PhaseStatus = 'planned' | 'in_progress' | 'complete' | 'over_budget';

interface CostLineItem {
  id: string;
  phaseId: string;
  nameRu: string;
  unit: string;                 // 'м²' | 'м³' | 'шт' | 'п/м' | 'кг' | 'т' | 'л'
  quantity: number;             // float for display only; convert to cm/mm for calc
  unitPriceDirams: number;      // integer
  totalDirams: number;          // quantity × unitPrice, integer
  materialOrigin: 'local' | 'import' | 'labour';
  productId?: string;           // linked marketplace product
  notes: string;
}

interface CostSummary {
  totalDirams: number;
  perM2Dirams: number;
  labourDirams: number;
  materialDirams: number;
  contingencyDirams: number;
  vatDirams: number;
  grandTotalDirams: number;     // incl. VAT
  breakdown: Record<string, number>; // phaseId → totalDirams
}

interface ExchangeRateSnapshot {
  usdTjs: number;               // e.g. 10.9
  recordedAt: Date;
}

interface LoanScenario {
  principalDirams: number;
  annualRatePct: number;
  termMonths: number;
  monthlyPaymentDirams: number;
  totalInterestDirams: number;
  totalPaymentDirams: number;
  bank: string;
}
```

---

## Prisma Schema

```prisma
model CostEstimate {
  id              String      @id @default(cuid())
  projectId       String
  nameRu          String
  region          String      @default("dushanbe")
  buildingAreaM2  Float
  plotAreaSotka   Float       @default(0)
  quality         String      @default("standard")
  phases          CostPhase[]
  seasonMultiplier Float      @default(1.0)
  vatIncluded     Boolean     @default(true)
  usdTjsRate      Float       @default(10.9)
  rateRecordedAt  DateTime    @default(now())
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@index([projectId])
}

model CostPhase {
  id               String         @id @default(cuid())
  estimateId       String
  estimate         CostEstimate   @relation(fields: [estimateId], references: [id], onDelete: Cascade)
  order            Int
  nameRu           String
  nameTj           String
  subtotalDirams   BigInt         @default(0)
  labourDirams     BigInt         @default(0)
  materialDirams   BigInt         @default(0)
  contingencyPct   Float          @default(0.10)
  contingencyDirams BigInt        @default(0)
  totalDirams      BigInt         @default(0)
  sourceAgent      String?
  status           String         @default("planned")
  actualDirams     BigInt?
  lineItems        CostLineItem[]

  @@index([estimateId])
}

model CostLineItem {
  id              String    @id @default(cuid())
  phaseId         String
  phase           CostPhase @relation(fields: [phaseId], references: [id], onDelete: Cascade)
  nameRu          String
  unit            String
  quantity        Float
  unitPriceDirams BigInt
  totalDirams     BigInt
  materialOrigin  String    @default("local")
  productId       String?
  notes           String    @default("")

  @@index([phaseId])
}

model ExchangeRate {
  id         String   @id @default(cuid())
  usdTjs     Float
  recordedAt DateTime @default(now())

  @@index([recordedAt])
}
```

---

## Standard Phase Library

```ts
export const PHASE_LIBRARY: Omit<CostPhase, 'id' | 'estimateId' | 'lineItems' | 'subtotalDirams' | 'labourDirams' | 'materialDirams' | 'contingencyDirams' | 'totalDirams' | 'actualDirams'>[] = [
  { order: 1,  nameRu: 'Подготовка участка',           nameTj: 'Омодасозии замин',         contingencyPct: 0.10, status: 'planned', sourceAgent: undefined },
  { order: 2,  nameRu: 'Фундамент',                    nameTj: 'Пой',                      contingencyPct: 0.12, status: 'planned', sourceAgent: 'bim' },
  { order: 3,  nameRu: 'Несущие конструкции (каркас)', nameTj: 'Конструксияҳои ҳомил',     contingencyPct: 0.10, status: 'planned', sourceAgent: 'bim' },
  { order: 4,  nameRu: 'Наружные стены',               nameTj: 'Деворҳои берунӣ',          contingencyPct: 0.10, status: 'planned', sourceAgent: 'house-designer' },
  { order: 5,  nameRu: 'Кровля',                       nameTj: 'Бом',                      contingencyPct: 0.12, status: 'planned', sourceAgent: 'bim' },
  { order: 6,  nameRu: 'Окна и двери (коробка)',        nameTj: 'Тирезаҳо ва дарҳо',       contingencyPct: 0.08, status: 'planned', sourceAgent: undefined },
  { order: 7,  nameRu: 'Электрика',                    nameTj: 'Барқ',                     contingencyPct: 0.10, status: 'planned', sourceAgent: undefined },
  { order: 8,  nameRu: 'Сантехника и водоснабжение',   nameTj: 'Сантехника',               contingencyPct: 0.12, status: 'planned', sourceAgent: undefined },
  { order: 9,  nameRu: 'Отопление',                    nameTj: 'Гармкунӣ',                 contingencyPct: 0.10, status: 'planned', sourceAgent: undefined },
  { order: 10, nameRu: 'Внутренняя отделка',           nameTj: 'Коркарди дохилӣ',          contingencyPct: 0.10, status: 'planned', sourceAgent: 'interior-designer' },
  { order: 11, nameRu: 'Напольные покрытия',           nameTj: 'Фарши кор',                contingencyPct: 0.08, status: 'planned', sourceAgent: 'interior-designer' },
  { order: 12, nameRu: 'Кухня и встроенная мебель',    nameTj: 'Ошхона ва мебели дарунӣ',  contingencyPct: 0.08, status: 'planned', sourceAgent: 'furniture-designer' },
  { order: 13, nameRu: 'Мебель и интерьер',            nameTj: 'Мебел ва интерер',         contingencyPct: 0.08, status: 'planned', sourceAgent: 'interior-designer' },
  { order: 14, nameRu: 'Благоустройство территории',   nameTj: 'Ободонӣ',                  contingencyPct: 0.10, status: 'planned', sourceAgent: 'landscape-designer' },
  { order: 15, nameRu: 'Прочие расходы / резерв',      nameTj: 'Харочоти дигар',           contingencyPct: 0.15, status: 'planned', sourceAgent: undefined },
];
```

---

## Unit Price Database

Prices are **base Dushanbe prices in dirams** (before regional multiplier). Updated quarterly.

```ts
export interface UnitPrice {
  key: string;
  nameRu: string;
  unit: string;
  priceDirams: number;         // integer base price
  origin: 'local' | 'import';
  lastUpdated: string;         // ISO date
}

export const UNIT_PRICES: UnitPrice[] = [
  // Foundation & concrete works
  { key: 'earthwork_m3',      nameRu: 'Земляные работы',          unit: 'м³',   priceDirams: 18_000_00,   origin: 'labour',  lastUpdated: '2025-01-01' },
  { key: 'concrete_m200_m3',  nameRu: 'Бетон М200 (замес)',       unit: 'м³',   priceDirams: 95_000_00,   origin: 'local',   lastUpdated: '2025-01-01' },
  { key: 'concrete_m300_m3',  nameRu: 'Бетон М300',               unit: 'м³',   priceDirams: 115_000_00,  origin: 'local',   lastUpdated: '2025-01-01' },
  { key: 'rebar_a3_kg',       nameRu: 'Арматура А3 (ø12–16)',     unit: 'кг',   priceDirams: 850_00,      origin: 'import',  lastUpdated: '2025-01-01' },
  { key: 'formwork_m2',       nameRu: 'Опалубка (аренда + монтаж)',unit: 'м²',  priceDirams: 12_000_00,   origin: 'labour',  lastUpdated: '2025-01-01' },
  { key: 'waterproof_m2',     nameRu: 'Гидроизоляция рулонная',   unit: 'м²',   priceDirams: 8_500_00,    origin: 'import',  lastUpdated: '2025-01-01' },

  // Masonry
  { key: 'brick_standard_pcs',nameRu: 'Кирпич стандарт 250×120×65',unit: 'шт', priceDirams: 120_00,      origin: 'local',   lastUpdated: '2025-01-01' },
  { key: 'brick_laying_m2',   nameRu: 'Кладка кирпича (кам.)',    unit: 'м²',   priceDirams: 22_000_00,   origin: 'labour',  lastUpdated: '2025-01-01' },
  { key: 'mortar_m3',         nameRu: 'Цементный раствор М150',    unit: 'м³',  priceDirams: 48_000_00,   origin: 'local',   lastUpdated: '2025-01-01' },
  { key: 'cement_50kg',       nameRu: 'Цемент М400 (мешок 50кг)', unit: 'мешок',priceDirams: 5_800_00,    origin: 'local',   lastUpdated: '2025-01-01' },
  { key: 'sand_m3',           nameRu: 'Песок речной',              unit: 'м³',  priceDirams: 8_000_00,    origin: 'local',   lastUpdated: '2025-01-01' },
  { key: 'gravel_m3',         nameRu: 'Щебень фр. 20–40',         unit: 'м³',  priceDirams: 12_000_00,   origin: 'local',   lastUpdated: '2025-01-01' },

  // Structure & roof
  { key: 'rc_column_m',       nameRu: 'ЖБ колонна (монолит)',     unit: 'п/м',  priceDirams: 35_000_00,   origin: 'labour',  lastUpdated: '2025-01-01' },
  { key: 'rc_slab_m2',        nameRu: 'ЖБ перекрытие (монолит)', unit: 'м²',   priceDirams: 65_000_00,   origin: 'labour',  lastUpdated: '2025-01-01' },
  { key: 'flat_roof_m2',      nameRu: 'Плоская кровля (праймер+гидроиз.)',unit:'м²',priceDirams:32_000_00,origin:'import',   lastUpdated: '2025-01-01' },

  // Windows & doors
  { key: 'window_pvc_m2',     nameRu: 'Окно ПВХ двухкамерное',   unit: 'м²',   priceDirams: 145_000_00,  origin: 'import',  lastUpdated: '2025-01-01' },
  { key: 'door_interior',     nameRu: 'Межкомнатная дверь (МДФ)',  unit: 'шт', priceDirams: 85_000_00,   origin: 'import',  lastUpdated: '2025-01-01' },
  { key: 'door_exterior',     nameRu: 'Входная дверь (металл.)',  unit: 'шт',   priceDirams: 220_000_00,  origin: 'import',  lastUpdated: '2025-01-01' },

  // MEP
  { key: 'electrical_m2',     nameRu: 'Электромонтаж (под ключ)', unit: 'м²',   priceDirams: 28_000_00,   origin: 'labour',  lastUpdated: '2025-01-01' },
  { key: 'plumbing_point',    nameRu: 'Точка сантехники',         unit: 'шт',   priceDirams: 32_000_00,   origin: 'labour',  lastUpdated: '2025-01-01' },
  { key: 'heating_m2',        nameRu: 'Отопление (радиаторы)',     unit: 'м²',  priceDirams: 22_000_00,   origin: 'import',  lastUpdated: '2025-01-01' },

  // Finishes
  { key: 'plaster_m2',        nameRu: 'Штукатурка стен',          unit: 'м²',   priceDirams: 14_000_00,   origin: 'labour',  lastUpdated: '2025-01-01' },
  { key: 'ganch_m2',          nameRu: 'Ганч (гипсовая штукатурка)',unit: 'м²',  priceDirams: 18_000_00,   origin: 'local',   lastUpdated: '2025-01-01' },
  { key: 'tile_wall_m2',      nameRu: 'Облицовка плиткой (стены)',unit: 'м²',   priceDirams: 35_000_00,   origin: 'import',  lastUpdated: '2025-01-01' },
  { key: 'tile_floor_m2',     nameRu: 'Укладка плитки (пол)',     unit: 'м²',   priceDirams: 30_000_00,   origin: 'import',  lastUpdated: '2025-01-01' },
  { key: 'parquet_m2',        nameRu: 'Паркетная доска (укладка)',unit: 'м²',   priceDirams: 25_000_00,   origin: 'import',  lastUpdated: '2025-01-01' },
  { key: 'paint_m2',          nameRu: 'Покраска стен',            unit: 'м²',   priceDirams: 9_000_00,    origin: 'labour',  lastUpdated: '2025-01-01' },
  { key: 'suspended_ceil_m2', nameRu: 'Натяжной потолок',         unit: 'м²',   priceDirams: 38_000_00,   origin: 'import',  lastUpdated: '2025-01-01' },
];
```

---

## Quick Estimate (m² Rate Method)

Fast top-down estimate before detailed takeoff is available.

```ts
interface QuickEstimateInput {
  buildingAreaM2: number;
  floors: number;
  quality: QualityTier;
  region: TJRegion;
  includeInterior: boolean;
  includeLandscape: boolean;
  plotAreaSotka: number;
}

const COST_PER_M2_DIRAMS: Record<QualityTier, {
  structure: number;
  finish: number;
  mep: number;
  interior: number;
}> = {
  budget:   { structure: 250_000_00, finish: 80_000_00,  mep: 50_000_00,  interior: 60_000_00  },
  standard: { structure: 380_000_00, finish: 140_000_00, mep: 80_000_00,  interior: 120_000_00 },
  premium:  { structure: 550_000_00, finish: 220_000_00, mep: 120_000_00, interior: 250_000_00 },
  luxury:   { structure: 800_000_00, finish: 380_000_00, mep: 200_000_00, interior: 500_000_00 },
};

const LANDSCAPE_PER_SOTKA_DIRAMS: Record<QualityTier, number> = {
  budget:   80_000_00,
  standard: 150_000_00,
  premium:  280_000_00,
  luxury:   500_000_00,
};

export function quickEstimate(input: QuickEstimateInput): {
  phases: { nameRu: string; dirams: number }[];
  totalDirams: number;
  perM2Dirams: number;
  grandTotalWithVat: number;
} {
  const rates = COST_PER_M2_DIRAMS[input.quality];
  const region = REGION_MULTIPLIER[input.region];
  const season = isConstructionSeason() ? 1.15 : 1.0;

  const apply = (base: number) => Math.round(base * input.buildingAreaM2 * region * season);

  const structure = apply(rates.structure);
  const finish    = apply(rates.finish);
  const mep       = apply(rates.mep);
  const interior  = input.includeInterior ? apply(rates.interior) : 0;
  const landscape = input.includeLandscape
    ? Math.round(LANDSCAPE_PER_SOTKA_DIRAMS[input.quality] * input.plotAreaSotka * region)
    : 0;
  const contingency = Math.round((structure + finish + mep + interior + landscape) * 0.12);

  const phases = [
    { nameRu: 'Конструкция (фундамент+стены+кровля)', dirams: structure },
    { nameRu: 'Чистовая отделка',                     dirams: finish },
    { nameRu: 'Инженерные системы (MEP)',              dirams: mep },
    ...(interior  ? [{ nameRu: 'Интерьер и мебель', dirams: interior  }] : []),
    ...(landscape ? [{ nameRu: 'Благоустройство',   dirams: landscape }] : []),
    { nameRu: 'Резерв 12%',                           dirams: contingency },
  ];

  const totalDirams = phases.reduce((s, p) => s + p.dirams, 0);
  const vatDirams = Math.round(totalDirams * 0.14);
  const grandTotalWithVat = totalDirams + vatDirams;
  const perM2Dirams = Math.round(grandTotalWithVat / input.buildingAreaM2);

  return { phases, totalDirams, perM2Dirams, grandTotalWithVat };
}

function isConstructionSeason(): boolean {
  const m = new Date().getMonth() + 1; // 1-12
  return m >= 4 && m <= 9;
}
```

---

## Detailed Estimate — Aggregate from Agents

```ts
export async function buildDetailedEstimate(
  projectId: string,
  region: TJRegion,
  quality: QualityTier
): Promise<CostEstimate> {

  // Fetch data from all agents in parallel
  const [houseProject, bimTakeoff, interiorDesign, furnitureDesigns, sitePlan] = await Promise.all([
    prisma.houseProject.findFirst({ where: { id: projectId }, include: { rooms: true } }),
    prisma.bimTakeoff.findFirst({ where: { modelId: { in: await getBimModelIds(projectId) } }, include: { items: true } }),
    prisma.designProject.findFirst({ where: { projectId }, include: { rooms: { include: { furniture: true } } } }),
    prisma.furnitureDesign.findMany({ where: { status: { in: ['quoted','in_production'] } } }),
    prisma.sitePlan.findFirst({ where: { projectId } }),
  ]);

  const rate = await getCurrentExchangeRate(); // { usdTjs: 10.9 }
  const regionMult = REGION_MULTIPLIER[region];
  const seasonMult = isConstructionSeason() ? 1.15 : 1.0;

  const phases: CostPhase[] = [];

  // Phase 1-2: Foundation from BIM takeoff
  if (bimTakeoff) {
    phases.push(buildPhaseFromBimTakeoff(bimTakeoff, regionMult, seasonMult));
  }

  // Phase 4: Walls from HouseProject material list
  if (houseProject) {
    phases.push(buildPhaseFromMaterialList(houseProject, regionMult, seasonMult));
  }

  // Phase 7-9: MEP — estimated from floor area
  phases.push(buildMEPPhase(houseProject?.totalAreaM2 ?? 0, quality, regionMult));

  // Phase 10-11: Interior finishes
  if (interiorDesign) {
    phases.push(buildInteriorPhase(interiorDesign, regionMult));
  }

  // Phase 12: Custom furniture
  const furnitureTotalDirams = furnitureDesigns.reduce((s, d) => s + Number(d.estimatedPriceDirams), 0);
  if (furnitureTotalDirams > 0) {
    phases.push({
      order: 12, nameRu: 'Кухня и встроенная мебель', nameTj: 'Ошхона ва мебели дарунӣ',
      subtotalDirams: furnitureTotalDirams, labourDirams: 0,
      materialDirams: furnitureTotalDirams, contingencyPct: 0.08,
      contingencyDirams: Math.round(furnitureTotalDirams * 0.08),
      totalDirams: Math.round(furnitureTotalDirams * 1.08),
      sourceAgent: 'furniture-designer', status: 'planned',
    } as any);
  }

  // Phase 14: Landscape
  if (sitePlan) {
    const { totalDirams: landTotal } = calcLandscapeBudget(sitePlan as any);
    phases.push({
      order: 14, nameRu: 'Благоустройство территории', nameTj: 'Ободонӣ',
      subtotalDirams: Math.round(landTotal * regionMult),
      contingencyPct: 0.10,
      contingencyDirams: Math.round(landTotal * regionMult * 0.10),
      totalDirams: Math.round(landTotal * regionMult * 1.10),
      sourceAgent: 'landscape-designer', status: 'planned',
    } as any);
  }

  const subtotal = phases.reduce((s, p) => s + p.totalDirams, 0);
  const vat = Math.round(subtotal * 0.14);
  const grand = subtotal + vat;
  const areaM2 = houseProject?.totalAreaM2 ?? 0;

  const summary: CostSummary = {
    totalDirams: subtotal,
    perM2Dirams: areaM2 > 0 ? Math.round(grand / areaM2) : 0,
    labourDirams: phases.reduce((s, p) => s + p.labourDirams, 0),
    materialDirams: phases.reduce((s, p) => s + p.materialDirams, 0),
    contingencyDirams: phases.reduce((s, p) => s + p.contingencyDirams, 0),
    vatDirams: vat,
    grandTotalDirams: grand,
    breakdown: Object.fromEntries(phases.map(p => [p.nameRu, p.totalDirams])),
  };

  return prisma.costEstimate.create({
    data: {
      projectId,
      nameRu: `Смета ${houseProject?.nameRu ?? projectId}`,
      region,
      buildingAreaM2: areaM2,
      quality,
      seasonMultiplier: seasonMult,
      vatIncluded: true,
      usdTjsRate: rate.usdTjs,
    },
  }) as any; // phases saved separately
}
```

---

## Bank Loan Calculator

```ts
const TJ_BANKS = [
  { nameRu: 'Амонатбонк',    annualRatePct: 21, maxTermMonths: 120, minDownPct: 0.20 },
  { nameRu: 'Эсхата',        annualRatePct: 22, maxTermMonths:  84, minDownPct: 0.30 },
  { nameRu: 'Банк Арванд',   annualRatePct: 24, maxTermMonths:  60, minDownPct: 0.25 },
  { nameRu: 'Первый МФБ',    annualRatePct: 26, maxTermMonths:  48, minDownPct: 0.40 },
];

export function calcLoanScenario(
  totalDirams: number,
  downPaymentPct: number,
  annualRatePct: number,
  termMonths: number,
  bankName: string
): LoanScenario {
  const principal = Math.round(totalDirams * (1 - downPaymentPct));
  const monthlyRate = annualRatePct / 100 / 12;

  // Annuity formula
  const monthlyPaymentDirams = monthlyRate === 0
    ? Math.round(principal / termMonths)
    : Math.round(principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)
        / (Math.pow(1 + monthlyRate, termMonths) - 1));

  const totalPaymentDirams = monthlyPaymentDirams * termMonths;
  const totalInterestDirams = totalPaymentDirams - principal;

  return { principalDirams: principal, annualRatePct, termMonths, monthlyPaymentDirams, totalInterestDirams, totalPaymentDirams, bank: bankName };
}

export function allLoanScenarios(totalDirams: number, downPct = 0.20): LoanScenario[] {
  return TJ_BANKS
    .filter(b => downPct >= b.minDownPct)
    .map(b => calcLoanScenario(totalDirams, downPct, b.annualRatePct, b.maxTermMonths, b.nameRu));
}
```

---

## Variance Tracker

```ts
export function calcVariance(phase: CostPhase): {
  varianceDirams: number;
  variancePct: number;
  status: PhaseStatus;
} {
  if (phase.actualDirams == null) {
    return { varianceDirams: 0, variancePct: 0, status: 'planned' };
  }

  const actual = Number(phase.actualDirams);
  const planned = Number(phase.totalDirams);
  const varianceDirams = actual - planned;
  const variancePct = planned > 0 ? varianceDirams / planned : 0;

  let status: PhaseStatus = 'complete';
  if (variancePct > 0.10) status = 'over_budget';

  return { varianceDirams, variancePct, status };
}

export function projectVarianceSummary(phases: CostPhase[]): {
  totalPlannedDirams: number;
  totalActualDirams: number;
  totalVarianceDirams: number;
  overBudgetPhases: string[];
  healthRating: 'green' | 'amber' | 'red';
} {
  const tracked = phases.filter(p => p.actualDirams != null);
  const totalPlannedDirams = tracked.reduce((s, p) => s + Number(p.totalDirams), 0);
  const totalActualDirams  = tracked.reduce((s, p) => s + Number(p.actualDirams!), 0);
  const totalVarianceDirams = totalActualDirams - totalPlannedDirams;
  const overBudgetPhases = phases
    .filter(p => calcVariance(p).status === 'over_budget')
    .map(p => p.nameRu);

  const pct = totalPlannedDirams > 0 ? totalVarianceDirams / totalPlannedDirams : 0;
  const healthRating = pct > 0.15 ? 'red' : pct > 0.07 ? 'amber' : 'green';

  return { totalPlannedDirams, totalActualDirams, totalVarianceDirams, overBudgetPhases, healthRating };
}
```

---

## PDF Cost Report

```ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatSomoni } from '@/lib/pricing';

export function exportCostReportPDF(estimate: CostEstimate & { phases: CostPhase[] }): void {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = pdf.internal.pageSize.getWidth();

  // Header
  pdf.setFontSize(16);
  pdf.text('Сводная смета строительства', pw / 2, 18, { align: 'center' });
  pdf.setFontSize(10);
  pdf.text(estimate.nameRu, pw / 2, 25, { align: 'center' });
  pdf.text(`Регион: ${estimate.region} | Площадь: ${estimate.buildingAreaM2} м² | ` +
           `Качество: ${estimate.quality} | Дата: ${new Date().toLocaleDateString('ru-TJ')}`,
    pw / 2, 31, { align: 'center' });

  // Phase table
  autoTable(pdf, {
    startY: 38,
    head: [['№', 'Этап', 'Материалы', 'Работа', 'Резерв', 'ИТОГО']],
    body: estimate.phases.map(p => [
      p.order,
      p.nameRu,
      formatSomoni(p.materialDirams),
      formatSomoni(p.labourDirams),
      `${(p.contingencyPct * 100).toFixed(0)}%`,
      formatSomoni(p.totalDirams),
    ]),
    foot: [[
      '', 'ИТОГО (без НДС)',
      formatSomoni(estimate.phases.reduce((s, p) => s + p.materialDirams, 0)),
      formatSomoni(estimate.phases.reduce((s, p) => s + p.labourDirams, 0)),
      '',
      formatSomoni(estimate.phases.reduce((s, p) => s + p.totalDirams, 0)),
    ]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [42, 100, 50] },
    footStyles: { fillColor: [230, 230, 230], fontStyle: 'bold' },
  });

  const finalY: number = (pdf as any).lastAutoTable.finalY + 8;

  // VAT + Grand total
  pdf.setFontSize(10);
  const vat = Math.round(estimate.phases.reduce((s, p) => s + p.totalDirams, 0) * 0.14);
  const grand = estimate.phases.reduce((s, p) => s + p.totalDirams, 0) + vat;
  pdf.text(`НДС (14%): ${formatSomoni(vat)}`, pw - 15, finalY, { align: 'right' });
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`ИТОГО с НДС: ${formatSomoni(grand)}`, pw - 15, finalY + 8, { align: 'right' });
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Стоимость 1 м²: ${formatSomoni(Math.round(grand / estimate.buildingAreaM2))}`,
    pw - 15, finalY + 15, { align: 'right' });

  // Seismic & legal note
  pdf.setFontSize(7);
  pdf.text(
    'Смета ориентировочная. Цены без учёта индивидуальных условий. Сейсмическая зона 8 — усиленный фундамент обязателен.',
    15, pdf.internal.pageSize.getHeight() - 10
  );

  pdf.save(`${estimate.nameRu}.pdf`);
}
```

---

## React Dashboard Component

```tsx
// components/cost-estimator/CostDashboard.tsx
'use client';

import { formatSomoni } from '@/lib/pricing';
import { calcVariance, projectVarianceSummary } from '@/lib/cost-estimator';
import type { CostEstimate, CostPhase } from '@/types/cost-estimator';

const HEALTH_COLORS = { green: 'text-green-600', amber: 'text-amber-600', red: 'text-red-600' };

export function CostDashboard({ estimate, phases }: { estimate: CostEstimate; phases: CostPhase[] }) {
  const summary = projectVarianceSummary(phases);
  const grand = Number((estimate as any).grandTotalDirams ?? 0);

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Общий бюджет" value={formatSomoni(grand)} sub="с НДС" />
        <KpiCard label="За 1 м²" value={formatSomoni(Math.round(grand / estimate.buildingAreaM2))} sub={`${estimate.buildingAreaM2} м²`} />
        <KpiCard label="Освоено" value={formatSomoni(summary.totalActualDirams)} sub={`из ${formatSomoni(summary.totalPlannedDirams)}`} />
        <KpiCard
          label="Здоровье бюджета"
          value={summary.healthRating === 'green' ? '✓ В норме' : summary.healthRating === 'amber' ? '⚠ Внимание' : '✗ Превышение'}
          sub={summary.overBudgetPhases.length > 0 ? summary.overBudgetPhases.join(', ') : 'Все этапы в норме'}
          className={HEALTH_COLORS[summary.healthRating]}
        />
      </div>

      {/* Phase table */}
      <div className="rounded-xl border border-neutral-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-2 text-left">Этап</th>
              <th className="px-4 py-2 text-right">Смета</th>
              <th className="px-4 py-2 text-right">Факт</th>
              <th className="px-4 py-2 text-right">Отклонение</th>
              <th className="px-4 py-2 text-center">Статус</th>
            </tr>
          </thead>
          <tbody>
            {phases.sort((a, b) => a.order - b.order).map(phase => {
              const v = calcVariance(phase);
              return (
                <tr key={phase.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                  <td className="px-4 py-2 font-medium">{phase.nameRu}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatSomoni(phase.totalDirams)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-neutral-400">
                    {phase.actualDirams != null ? formatSomoni(Number(phase.actualDirams)) : '—'}
                  </td>
                  <td className={`px-4 py-2 text-right tabular-nums ${v.varianceDirams > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {phase.actualDirams != null
                      ? `${v.varianceDirams > 0 ? '+' : ''}${formatSomoni(Math.abs(v.varianceDirams))} (${(v.variancePct * 100).toFixed(1)}%)`
                      : '—'}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <PhaseStatusBadge status={phase.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, className = '' }: { label: string; value: string; sub: string; className?: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="text-xs text-neutral-500 mb-1">{label}</div>
      <div className={`text-xl font-bold ${className}`}>{value}</div>
      <div className="text-xs text-neutral-400 mt-0.5">{sub}</div>
    </div>
  );
}

function PhaseStatusBadge({ status }: { status: string }) {
  const MAP = {
    planned:     { label: 'Запланировано', cls: 'bg-neutral-100 text-neutral-600' },
    in_progress: { label: 'В работе',      cls: 'bg-blue-100 text-blue-700' },
    complete:    { label: 'Завершено',     cls: 'bg-green-100 text-green-700' },
    over_budget: { label: 'Превышение',    cls: 'bg-red-100 text-red-700' },
  };
  const { label, cls } = MAP[status as keyof typeof MAP] ?? MAP.planned;
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
}
```

---

## API Routes

```
GET  /api/estimates?projectId=:id          — list estimates for project
POST /api/estimates/quick                  — quick m² estimate (no auth)
POST /api/estimates/detailed               — build detailed from all agents
GET  /api/estimates/:id                    — load estimate + phases
PUT  /api/estimates/:id/phase/:phaseId     — update actualDirams on phase
POST /api/estimates/:id/export-pdf         — download PDF report
GET  /api/estimates/unit-prices            — list UNIT_PRICES
GET  /api/estimates/loan-scenarios         — calc all bank loan scenarios
GET  /api/exchange-rate                    — current USD/TJS rate
POST /api/exchange-rate                    — update rate (admin only)
```

---

## Exchange Rate Cron (Daily Update)

```ts
// cron/update-exchange-rate.ts  (runs daily 09:00 Dushanbe = 04:00 UTC)
import { prisma } from '@/lib/prisma';

export async function updateExchangeRate(): Promise<void> {
  // Try National Bank of Tajikistan API (NBT)
  try {
    const res = await fetch('https://nbt.tj/api/currency/latest', {
      headers: { 'Accept': 'application/json' },
    });
    const data = await res.json();
    const usdTjs = data?.USD?.rate ?? null;

    if (usdTjs && typeof usdTjs === 'number' && usdTjs > 8 && usdTjs < 20) {
      await prisma.exchangeRate.create({ data: { usdTjs } });
      return;
    }
  } catch { /* fallback below */ }

  // Fallback: use last known rate + 0 change
  const last = await prisma.exchangeRate.findFirst({ orderBy: { recordedAt: 'desc' } });
  if (last) {
    await prisma.exchangeRate.create({ data: { usdTjs: last.usdTjs } });
  }
}

async function getCurrentExchangeRate() {
  return prisma.exchangeRate.findFirst({ orderBy: { recordedAt: 'desc' } })
    ?? { usdTjs: 10.9 };
}
```

---

## Key Rules

1. **Integer dirams always** — `BigInt` in Prisma for all monetary fields; never floats.
2. **Regional multiplier applied once** — multiply subtotal, not each line item individually.
3. **Seasonal spike April–September** — cement/rebar +15%; auto-detect via `isConstructionSeason()`.
4. **VAT 14% separate** — always show pre-VAT and post-VAT lines; never embed silently.
5. **Seismic note on every PDF** — "Сейсмическая зона 8 — усиленный фундамент обязателен."
6. **Quick estimate always available** — even before BIM/takeoff data; use m² rate method.
7. **Variance threshold** — amber at >7% over, red at >15%; show in dashboard `healthRating`.
8. **USD conversion** — multiply USD price × `ExchangeRate.usdTjs` then round to integer dirams.
9. **Exchange rate max age 24h** — if last record > 24h old, show stale badge and suggest refresh.
10. **Loan down payment minimum** — enforce `minDownPct` per bank; never offer loan below bank's floor.
