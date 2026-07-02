# House Designer Agent

## Trigger
`/house-designer`

## Role
Construction and house design specialist for the Tajikistan marketplace. Covers building material catalog structure, material quantity calculators, house project wizard, contractor marketplace, local building norms, and construction-specific UI/UX patterns.

---

## Tajikistan Construction Context

- Most common build: 2–3 storey private house (частный дом), 150–350 м²
- Structure: brick (кирпич) + reinforced concrete columns + flat roof (плоская крыша)
- Climate zones: Душанбе (hot dry summer, mild winter), Хатлон (same), Согд (colder winter), ГБАО (harsh mountain climate, needs extra insulation)
- Seismic zone: Tajikistan is a **high seismic risk** zone — reinforcement (арматура) specs are critical
- Local brick standard: silicate brick (силикатный кирпич) or clay brick (красный кирпич), size 250×120×65 mm
- Cement most used: М400, М500
- Local suppliers: Душанбе цементный завод, Чорух-Дайрон (aluminium), imported materials from China/Russia/Iran
- Water supply: many houses use roof tanks (бак на крыше) — plumbing design must account for this
- Heating: mostly individual gas boiler (газовый котёл) or electric in areas without gas

---

## Construction Category Taxonomy

```typescript
const CONSTRUCTION_CATEGORIES = {
  foundation: {
    nameRu: 'Фундамент',
    nameTj: 'Асос',
    subcategories: ['cement', 'sand', 'gravel', 'reinforcement', 'formwork', 'waterproofing'],
  },
  walls: {
    nameRu: 'Стены',
    nameTj: 'Деворҳо',
    subcategories: ['brick', 'block', 'aerated_concrete', 'plaster', 'facade_tiles', 'insulation'],
  },
  roof: {
    nameRu: 'Кровля',
    nameTj: 'Бом',
    subcategories: ['metal_sheet', 'bitumen_roll', 'waterproofing', 'insulation', 'drainage'],
  },
  floors: {
    nameRu: 'Полы',
    nameTj: 'Фарш',
    subcategories: ['cement_screed', 'tile', 'laminate', 'underfloor', 'leveling_compound'],
  },
  electrical: {
    nameRu: 'Электрика',
    nameTj: 'Барқ',
    subcategories: ['cable', 'socket', 'switch', 'circuit_breaker', 'conduit', 'led_lighting'],
  },
  plumbing: {
    nameRu: 'Сантехника',
    nameTj: 'Сантехника',
    subcategories: ['pipe_pvc', 'pipe_ppr', 'pipe_metal', 'fittings', 'toilet', 'sink', 'water_heater', 'pump'],
  },
  windows_doors: {
    nameRu: 'Окна и двери',
    nameTj: 'Тирезаҳо ва дарвозаҳо',
    subcategories: ['pvc_window', 'aluminum_window', 'interior_door', 'exterior_door', 'garage_door'],
  },
  finishing: {
    nameRu: 'Отделка',
    nameTj: 'Бозсозӣ',
    subcategories: ['paint', 'wallpaper', 'ceiling_tiles', 'plaster_finish', 'gypsum_board'],
  },
  tools: {
    nameRu: 'Инструменты',
    nameTj: 'Асбобҳо',
    subcategories: ['power_tools', 'hand_tools', 'mixers', 'levels', 'safety'],
  },
};
```

---

## Database Schema

```prisma
model HouseProject {
  id            String   @id @default(cuid())
  userId        String
  nameRu        String   // "Мой дом в Душанбе"
  status        String   @default("draft")
  // draft → planning → materials_selected → in_progress → completed

  // House parameters
  totalArea     Float    // total floor area m²
  floors        Int      @default(1)
  wallHeight    Float    @default(3.0)  // meters per floor
  roofType      String   @default("flat")  // flat | gable | hip
  climateZone   String   // dushanbe | khatlon | sugd | gbao

  // Calculated from room layout
  perimeter     Float?   // outer wall perimeter in meters
  wallArea      Float?   // total wall area in m²
  floorArea     Float?   // ground floor area in m²
  roofArea      Float?   // roof area in m²

  rooms         HouseRoom[]
  materialLists HouseMaterialList[]
  user          User     @relation(fields: [userId], references: [id])
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model HouseRoom {
  id          String  @id @default(cuid())
  projectId   String
  nameRu      String  // "Гостиная", "Кухня", "Спальня 1"
  type        String  // living | bedroom | kitchen | bathroom | hallway | balcony | garage
  lengthM     Float
  widthM      Float
  heightM     Float   @default(3.0)
  floorNo     Int     @default(1)
  hasWindow   Boolean @default(true)
  windowCount Int     @default(1)
  hasDoor     Boolean @default(true)
  doorCount   Int     @default(1)
  project     HouseProject @relation(fields: [projectId], references: [id])
}

model HouseMaterialList {
  id          String  @id @default(cuid())
  projectId   String
  stage       String  // foundation | walls | roof | floors | electrical | plumbing | finishing
  nameRu      String
  items       HouseMaterialItem[]
  project     HouseProject @relation(fields: [projectId], references: [id])
  createdAt   DateTime @default(now())
}

model HouseMaterialItem {
  id            String  @id @default(cuid())
  listId        String
  productId     String?  // linked to marketplace product
  nameRu        String
  unit          String   // шт | м² | м³ | кг | п.м | л
  quantity      Float
  wasteCoeff    Float    @default(1.1)  // 10% waste by default
  netQty        Float    // quantity × wasteCoeff, rounded up
  priceAmount   Int?     // dirams (filled when product linked)
  totalAmount   Int?     // netQty × priceAmount
  list          HouseMaterialList @relation(fields: [listId], references: [id])
  product       Product?  @relation(fields: [productId], references: [id])
}

// Contractor profiles on the marketplace
model Contractor {
  id            String   @id @default(cuid())
  userId        String   @unique
  companyName   String?
  specialties   String[] // ['foundation', 'walls', 'electrical', 'plumbing', 'finishing', 'full_cycle']
  city          String
  region        String
  experienceYrs Int      @default(0)
  licenseNo     String?
  portfolioUrls String[]
  rating        Float    @default(0)
  reviewCount   Int      @default(0)
  isVerified    Boolean  @default(false)
  isAvailable   Boolean  @default(true)
  pricePerDay   Int?     // dirams per day (brigada rate)
  minProjectM2  Float?
  user          User     @relation(fields: [userId], references: [id])
  reviews       ContractorReview[]
  quotes        ContractorQuote[]
  createdAt     DateTime @default(now())
}

model ContractorReview {
  id            String  @id @default(cuid())
  contractorId  String
  authorId      String
  rating        Int     // 1–5
  comment       String?
  stage         String? // which stage they did
  contractor    Contractor @relation(fields: [contractorId], references: [id])
  author        User       @relation(fields: [authorId], references: [id])
  createdAt     DateTime @default(now())
}

model ContractorQuote {
  id            String   @id @default(cuid())
  contractorId  String
  projectId     String
  requesterId   String
  priceAmount   Int      // total quote in dirams
  durationDays  Int
  notes         String?
  status        String   @default("pending") // pending | accepted | declined
  contractor    Contractor   @relation(fields: [contractorId], references: [id])
  project       HouseProject @relation(fields: [projectId], references: [id])
  createdAt     DateTime @default(now())
}
```

---

## Material Quantity Calculators

### Brick Calculator

```typescript
interface BrickCalcInput {
  wallAreaM2: number;       // net wall area (minus windows/doors)
  wallThicknessMm: number;  // 250 (0.5 brick), 380 (1.5), 510 (2 brick)
  mortarJointMm: number;    // typically 10–12mm
  wastePercent: number;     // 5–15%
}

interface BrickCalcResult {
  bricksPerM2: number;
  totalBricks: number;
  totalWithWaste: number;
  cementBagsM3: number;     // per m² of mortar
  sandM3: number;
  mortarM3: number;
}

function calcBricks(input: BrickCalcInput): BrickCalcResult {
  // Standard TJ brick: 250×120×65mm
  const brickL = 0.250, brickH = 0.065;
  const joint = input.mortarJointMm / 1000;

  const bricksPerM2 =
    1 / ((brickL + joint) * (brickH + joint)) *
    (input.wallThicknessMm / 120); // rows per thickness

  const totalBricks = Math.ceil(input.wallAreaM2 * bricksPerM2);
  const totalWithWaste = Math.ceil(totalBricks * (1 + input.wastePercent / 100));

  // Mortar: ~0.3 m³ per m³ of brickwork
  const wallVolume = input.wallAreaM2 * (input.wallThicknessMm / 1000);
  const mortarM3 = wallVolume * 0.3;
  // M75 mortar: 1 part cement + 4 parts sand
  // 1 m³ mortar needs ~250 kg cement = ~5 bags × 50kg
  const cementBagsM3 = mortarM3 * 5;
  const sandM3 = mortarM3 * 0.8;

  return {
    bricksPerM2: Math.round(bricksPerM2),
    totalBricks,
    totalWithWaste,
    cementBagsM3: Math.ceil(cementBagsM3),
    sandM3: Math.ceil(sandM3 * 10) / 10,
    mortarM3: Math.ceil(mortarM3 * 10) / 10,
  };
}
```

### Cement/Concrete Calculator

```typescript
function calcConcrete(input: {
  type: 'foundation_slab' | 'foundation_strip' | 'column' | 'floor_screed';
  dimensionsM: { length?: number; width?: number; depth?: number; diameter?: number };
  count?: number;
}): {
  concreteM3: number;
  cementBags: number; // 50kg bags of M400
  sandM3: number;
  gravelM3: number;
  waterL: number;
} {
  let volumeM3 = 0;
  const d = input.dimensionsM;

  switch (input.type) {
    case 'foundation_slab':
      volumeM3 = (d.length ?? 0) * (d.width ?? 0) * (d.depth ?? 0.2);
      break;
    case 'foundation_strip':
      volumeM3 = (d.length ?? 0) * (d.width ?? 0.4) * (d.depth ?? 0.8);
      break;
    case 'column':
      const r = (d.diameter ?? 0.3) / 2;
      volumeM3 = Math.PI * r * r * (d.depth ?? 3) * (input.count ?? 1);
      break;
    case 'floor_screed':
      volumeM3 = (d.length ?? 0) * (d.width ?? 0) * (d.depth ?? 0.05);
      break;
  }

  // M200 concrete: 1:2:4 (cement:sand:gravel) + ~180L water per m³
  const cementKgPerM3 = 280; // kg for M200
  const sandM3PerM3 = 0.56;
  const gravelM3PerM3 = 1.12;
  const waterLPerM3 = 180;

  return {
    concreteM3: Math.ceil(volumeM3 * 10) / 10,
    cementBags: Math.ceil((volumeM3 * cementKgPerM3) / 50),
    sandM3: Math.ceil(volumeM3 * sandM3PerM3 * 10) / 10,
    gravelM3: Math.ceil(volumeM3 * gravelM3PerM3 * 10) / 10,
    waterL: Math.ceil(volumeM3 * waterLPerM3),
  };
}
```

### Reinforcement (Арматура) Calculator — Seismic Zone

```typescript
function calcReinforcement(input: {
  foundationType: 'slab' | 'strip';
  lengthM: number;
  widthM: number;
  seismicZone: number; // 7 | 8 | 9 (MSK scale, Tajikistan mostly 7-9)
}): {
  rebarDiameterMm: number;
  gridSpacingMm: number;
  totalLinearM: number;
  totalWeightKg: number;
} {
  // Higher seismic zone → smaller grid spacing, larger diameter
  const specs = {
    7: { diameter: 12, spacing: 200 },
    8: { diameter: 14, spacing: 150 },
    9: { diameter: 16, spacing: 125 },
  };
  const spec = specs[input.seismicZone as keyof typeof specs] ?? specs[8];

  const { lengthM, widthM } = input;
  const spacingM = spec.spacing / 1000;

  // Two-layer grid (top and bottom)
  const rowsX = Math.ceil(widthM / spacingM) + 1;
  const rowsY = Math.ceil(lengthM / spacingM) + 1;
  const totalLinearM = (rowsX * lengthM + rowsY * widthM) * 2; // × 2 for two layers

  // Weight per linear meter for each diameter (kg/m)
  const weightPerM: Record<number, number> = { 10: 0.617, 12: 0.888, 14: 1.21, 16: 1.58, 18: 2.0 };
  const totalWeightKg = Math.ceil(totalLinearM * (weightPerM[spec.diameter] ?? 1.21));

  return {
    rebarDiameterMm: spec.diameter,
    gridSpacingMm: spec.spacing,
    totalLinearM: Math.ceil(totalLinearM),
    totalWeightKg,
  };
}
```

### Tile Calculator

```typescript
function calcTile(input: {
  areaM2: number;
  tileLengthMm: number;
  tileWidthMm: number;
  jointMm: number;
  wastePercent: number; // 10% for straight, 15% for diagonal
}): {
  tilesNeeded: number;
  tilesWithWaste: number;
  tileAdhesiveKg: number;  // kg of adhesive mix
  groutKg: number;
} {
  const tileSizeM2 =
    ((input.tileLengthMm + input.jointMm) / 1000) *
    ((input.tileWidthMm + input.jointMm) / 1000);

  const tilesNeeded = Math.ceil(input.areaM2 / tileSizeM2);
  const tilesWithWaste = Math.ceil(tilesNeeded * (1 + input.wastePercent / 100));

  // Adhesive: ~4 kg per m² for standard ceramic
  const tileAdhesiveKg = Math.ceil(input.areaM2 * 4);
  // Grout: ~0.3 kg per m² for standard joint
  const groutKg = Math.ceil(input.areaM2 * 0.3);

  return { tilesNeeded, tilesWithWaste, tileAdhesiveKg, groutKg };
}
```

### Paint Calculator

```typescript
function calcPaint(input: {
  areaM2: number;
  coats: number;
  coverageM2PerL: number; // from product specs, typically 8–12 m²/L per coat
}): { litersNeeded: number; cansNeeded: number; canSizeL: number } {
  const litersNeeded = Math.ceil((input.areaM2 / input.coverageM2PerL) * input.coats * 1.05);
  const canSizeL = litersNeeded > 18 ? 20 : litersNeeded > 9 ? 10 : 5;
  const cansNeeded = Math.ceil(litersNeeded / canSizeL);
  return { litersNeeded, cansNeeded, canSizeL };
}
```

---

## House Project Wizard — Full Material List Generator

```typescript
async function generateMaterialList(projectId: string): Promise<HouseMaterialList[]> {
  const project = await prisma.houseProject.findUnique({
    where: { id: projectId },
    include: { rooms: true },
  });
  if (!project) throw new AppError('Project not found', 404);

  const lists: Prisma.HouseMaterialListCreateInput[] = [];

  // Calculate aggregate dimensions
  const totalWallAreaM2 = project.wallArea ?? estimateWallArea(project);
  const windowCount = project.rooms.reduce((s, r) => s + (r.hasWindow ? r.windowCount : 0), 0);
  const doorCount = project.rooms.reduce((s, r) => s + (r.hasDoor ? r.doorCount : 0), 0);
  const netWallArea = totalWallAreaM2 - windowCount * 1.8 - doorCount * 2.1; // approx opening sizes

  // 1. FOUNDATION
  const foundation = calcConcrete({
    type: 'foundation_slab',
    dimensionsM: {
      length: Math.sqrt(project.floorArea ?? project.totalArea),
      width: Math.sqrt(project.floorArea ?? project.totalArea),
      depth: 0.25,
    },
  });
  const seismic = project.climateZone === 'gbao' ? 9 : 8;
  const rebar = calcReinforcement({
    foundationType: 'slab',
    lengthM: Math.sqrt(project.totalArea),
    widthM: Math.sqrt(project.totalArea),
    seismicZone: seismic,
  });

  lists.push({
    project: { connect: { id: projectId } },
    stage: 'foundation',
    nameRu: 'Фундамент',
    items: {
      create: [
        { nameRu: 'Цемент М400 (мешки 50 кг)', unit: 'мешок', quantity: foundation.cementBags, netQty: Math.ceil(foundation.cementBags * 1.05) },
        { nameRu: 'Песок строительный', unit: 'м³', quantity: foundation.sandM3, netQty: Math.ceil(foundation.sandM3 * 1.05) },
        { nameRu: 'Щебень 20-40 мм', unit: 'м³', quantity: foundation.gravelM3, netQty: Math.ceil(foundation.gravelM3 * 1.05) },
        { nameRu: `Арматура ø${rebar.rebarDiameterMm}мм`, unit: 'кг', quantity: rebar.totalWeightKg, netQty: Math.ceil(rebar.totalWeightKg * 1.05) },
        { nameRu: 'Гидроизоляция (рулон)', unit: 'м²', quantity: project.totalArea * 1.5, netQty: Math.ceil(project.totalArea * 1.6) },
      ],
    },
  });

  // 2. WALLS
  const bricks = calcBricks({
    wallAreaM2: netWallArea,
    wallThicknessMm: 380,
    mortarJointMm: 10,
    wastePercent: 8,
  });

  lists.push({
    project: { connect: { id: projectId } },
    stage: 'walls',
    nameRu: 'Стены',
    items: {
      create: [
        { nameRu: 'Кирпич красный (рядовой)', unit: 'шт', quantity: bricks.totalBricks, netQty: bricks.totalWithWaste },
        { nameRu: 'Цемент М400', unit: 'мешок', quantity: bricks.cementBagsM3, netQty: Math.ceil(bricks.cementBagsM3 * 1.05) },
        { nameRu: 'Песок для кладки', unit: 'м³', quantity: bricks.sandM3, netQty: Math.ceil(bricks.sandM3 * 1.05) },
        { nameRu: 'Штукатурная смесь', unit: 'мешок', quantity: Math.ceil(netWallArea * 0.8), netQty: Math.ceil(netWallArea * 0.85) },
      ],
    },
  });

  // 3. WINDOWS & DOORS
  lists.push({
    project: { connect: { id: projectId } },
    stage: 'windows_doors',
    nameRu: 'Окна и двери',
    items: {
      create: [
        { nameRu: 'Окно ПВХ 1200×1400 мм (двухкамерное)', unit: 'шт', quantity: windowCount, netQty: windowCount },
        { nameRu: 'Дверь межкомнатная 900×2100 мм', unit: 'шт', quantity: doorCount - 1, netQty: doorCount - 1 },
        { nameRu: 'Дверь входная металлическая', unit: 'шт', quantity: 1, netQty: 1 },
      ],
    },
  });

  // 4. ROOF (flat roof — most common in TJ)
  const roofArea = project.roofArea ?? project.totalArea / project.floors * 1.15;
  lists.push({
    project: { connect: { id: projectId } },
    stage: 'roof',
    nameRu: 'Кровля',
    items: {
      create: [
        { nameRu: 'Гидроизоляция кровельная (еврорубероид)', unit: 'м²', quantity: roofArea, netQty: Math.ceil(roofArea * 1.15) },
        { nameRu: 'Утеплитель (пенопласт 100мм)', unit: 'м²', quantity: roofArea, netQty: Math.ceil(roofArea * 1.1) },
        { nameRu: 'Битумная мастика', unit: 'кг', quantity: Math.ceil(roofArea * 1.5), netQty: Math.ceil(roofArea * 1.6) },
        { nameRu: 'Цементная стяжка (мешки)', unit: 'мешок', quantity: Math.ceil(roofArea * 0.4), netQty: Math.ceil(roofArea * 0.45) },
      ],
    },
  });

  // 5. FLOOR SCREED
  const floorScreedM3 = (project.totalArea / project.floors) * 0.05; // 5cm screed
  lists.push({
    project: { connect: { id: projectId } },
    stage: 'floors',
    nameRu: 'Полы',
    items: {
      create: [
        { nameRu: 'Цемент М400 (стяжка)', unit: 'мешок', quantity: Math.ceil(floorScreedM3 * 5), netQty: Math.ceil(floorScreedM3 * 5.5) },
        { nameRu: 'Песок для стяжки', unit: 'м³', quantity: Math.ceil(floorScreedM3 * 3), netQty: Math.ceil(floorScreedM3 * 3.2) },
        { nameRu: 'Плитка напольная 600×600 мм', unit: 'м²', quantity: project.totalArea * 0.4, netQty: Math.ceil(project.totalArea * 0.45) },
        { nameRu: 'Плиточный клей', unit: 'мешок', quantity: Math.ceil(project.totalArea * 0.4 * 0.3), netQty: Math.ceil(project.totalArea * 0.4 * 0.35) },
      ],
    },
  });

  // Save all lists
  const savedLists = await prisma.$transaction(
    lists.map(l => prisma.houseMaterialList.create({ data: l, include: { items: true } }))
  );

  return savedLists;
}

function estimateWallArea(project: HouseProject): number {
  // rough estimate: perimeter × height × floors
  const side = Math.sqrt(project.totalArea / project.floors);
  const perimeter = side * 4;
  return perimeter * project.wallHeight * project.floors;
}
```

---

## API Routes

```typescript
// src/api/v1/house-designer/routes.ts
import { Router } from 'express';
import { requireAuth } from '@/middleware/auth';
import * as hd from './house-designer.controller';

const router = Router();

// Projects
router.get('/projects', requireAuth, hd.listProjects);
router.post('/projects', requireAuth, hd.createProject);
router.get('/projects/:id', requireAuth, hd.getProject);
router.patch('/projects/:id', requireAuth, hd.updateProject);
router.delete('/projects/:id', requireAuth, hd.deleteProject);

// Rooms
router.post('/projects/:id/rooms', requireAuth, hd.addRoom);
router.patch('/projects/:id/rooms/:roomId', requireAuth, hd.updateRoom);
router.delete('/projects/:id/rooms/:roomId', requireAuth, hd.deleteRoom);

// Material lists
router.post('/projects/:id/generate-list', requireAuth, hd.generateMaterialList);
router.get('/projects/:id/material-list', requireAuth, hd.getMaterialList);
router.patch('/projects/:id/material-list/items/:itemId', requireAuth, hd.updateMaterialItem);
router.post('/projects/:id/material-list/add-to-cart', requireAuth, hd.addAllToCart);

// Calculators (public — no auth required)
router.post('/calc/bricks', hd.calcBricks);
router.post('/calc/concrete', hd.calcConcrete);
router.post('/calc/reinforcement', hd.calcReinforcement);
router.post('/calc/tile', hd.calcTile);
router.post('/calc/paint', hd.calcPaint);

// Contractors
router.get('/contractors', hd.listContractors);
router.get('/contractors/:id', hd.getContractor);
router.post('/contractors/:id/quote', requireAuth, hd.requestQuote);
router.post('/contractors/:id/review', requireAuth, hd.addReview);

export default router;
```

---

## Frontend — Project Wizard

```tsx
// app/(buyer)/house-designer/new/page.tsx
// Step 1: Basic parameters → Step 2: Add rooms → Step 3: Review & generate list

const WIZARD_STEPS = [
  { key: 'params',    label: 'Параметры дома' },
  { key: 'rooms',     label: 'Планировка' },
  { key: 'materials', label: 'Список материалов' },
];

// Step 1 — Basic params form
function HouseParamsStep({ onNext }: { onNext: (data: HouseParams) => void }) {
  const form = useForm<HouseParams>({ resolver: zodResolver(houseParamsSchema) });

  return (
    <form onSubmit={form.handleSubmit(onNext)} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Площадь дома (м²)</label>
          <input {...form.register('totalArea', { valueAsNumber: true })}
            type="number" min={30} max={2000}
            className="mt-1 w-full rounded-md border px-3 py-2" />
        </div>
        <div>
          <label className="text-sm font-medium">Этажей</label>
          <select {...form.register('floors', { valueAsNumber: true })}
            className="mt-1 w-full rounded-md border px-3 py-2">
            {[1, 2, 3].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Регион строительства</label>
        <select {...form.register('climateZone')}
          className="mt-1 w-full rounded-md border px-3 py-2">
          <option value="dushanbe">Душанбе и РРП</option>
          <option value="khatlon">Хатлонская область</option>
          <option value="sugd">Согдийская область</option>
          <option value="gbao">ГБАО (Горный Бадахшан)</option>
        </select>
        {form.watch('climateZone') === 'gbao' && (
          <p className="mt-1 text-xs text-amber-600">
            ⚠️ Горный Бадахшан: будет применена арматура ø16мм с шагом 125мм (сейсмозона 9)
          </p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium">Тип кровли</label>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {[
            { value: 'flat', label: 'Плоская', desc: 'Традиционная для Таджикистана' },
            { value: 'gable', label: 'Двускатная', desc: 'Для Согда и ГБАО' },
          ].map(opt => (
            <label key={opt.value}
              className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <input type="radio" {...form.register('roofType')} value={opt.value} className="mt-0.5" />
              <div>
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <button type="submit"
        className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground">
        Далее: Планировка →
      </button>
    </form>
  );
}
```

```tsx
// Step 2 — Room builder
const ROOM_TYPES = [
  { value: 'living',    label: 'Гостиная',     icon: '🛋️' },
  { value: 'bedroom',   label: 'Спальня',      icon: '🛏️' },
  { value: 'kitchen',   label: 'Кухня',        icon: '🍳' },
  { value: 'bathroom',  label: 'Ванная/туалет',icon: '🚿' },
  { value: 'hallway',   label: 'Коридор/прихожая', icon: '🚪' },
  { value: 'balcony',   label: 'Балкон/терраса', icon: '🌿' },
  { value: 'garage',    label: 'Гараж',        icon: '🚗' },
];

function RoomBuilderStep({
  rooms,
  onAdd,
  onRemove,
  onNext,
}: RoomBuilderProps) {
  const totalArea = rooms.reduce((s, r) => s + r.lengthM * r.widthM, 0);

  return (
    <div className="space-y-4">
      {/* Room list */}
      {rooms.map((room, i) => (
        <div key={i} className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">{room.nameRu}</p>
            <p className="text-xs text-muted-foreground">
              {room.lengthM} × {room.widthM} м = {(room.lengthM * room.widthM).toFixed(1)} м²
            </p>
          </div>
          <button onClick={() => onRemove(i)} className="text-red-500 hover:text-red-600">✕</button>
        </div>
      ))}

      <p className="text-sm text-muted-foreground">
        Итого: {totalArea.toFixed(1)} м²
      </p>

      {/* Add room */}
      <AddRoomForm onAdd={onAdd} roomTypes={ROOM_TYPES} />

      <button onClick={onNext}
        className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground">
        Создать список материалов →
      </button>
    </div>
  );
}
```

```tsx
// Step 3 — Material list with "Add all to cart"
function MaterialListStep({ projectId }: { projectId: string }) {
  const { data: lists } = useQuery({
    queryKey: ['house-materials', projectId],
    queryFn: () => api.get<HouseMaterialList[]>(`/house-designer/projects/${projectId}/material-list`),
  });

  const addAllToCart = useMutation({
    mutationFn: () => api.post(`/house-designer/projects/${projectId}/material-list/add-to-cart`),
    onSuccess: () => toast.success('Все материалы добавлены в корзину'),
  });

  const totalAmount = lists?.flatMap(l => l.items).reduce((s, i) => s + (i.totalAmount ?? 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      {lists?.map(list => (
        <section key={list.id}>
          <h3 className="mb-2 font-semibold">{list.nameRu}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-1 pr-3">Материал</th>
                  <th className="pb-1 pr-3">Кол-во</th>
                  <th className="pb-1 pr-3">Ед.</th>
                  <th className="pb-1 text-right">Сумма</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {list.items.map(item => (
                  <tr key={item.id}>
                    <td className="py-1.5 pr-3">{item.nameRu}</td>
                    <td className="py-1.5 pr-3 font-mono">{item.netQty}</td>
                    <td className="py-1.5 pr-3 text-muted-foreground">{item.unit}</td>
                    <td className="py-1.5 text-right">
                      {item.totalAmount ? formatSomoni(item.totalAmount) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {/* Total + CTA */}
      <div className="sticky bottom-0 rounded-xl border bg-card p-4 shadow-lg">
        <div className="mb-3 flex justify-between">
          <span className="font-medium">Ориентировочная стоимость</span>
          <span className="text-lg font-bold">{formatSomoni(totalAmount)}</span>
        </div>
        <button
          onClick={() => addAllToCart.mutate()}
          disabled={addAllToCart.isPending}
          className="w-full rounded-lg bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50">
          {addAllToCart.isPending ? 'Добавляем...' : 'Добавить всё в корзину'}
        </button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Цены могут отличаться от фактических. Список можно редактировать.
        </p>
      </div>
    </div>
  );
}
```

---

## Standalone Calculators (Public Pages)

```
/calculators/brick       → Калькулятор кирпича
/calculators/concrete    → Калькулятор бетона/фундамента
/calculators/tile        → Калькулятор плитки
/calculators/paint       → Калькулятор краски
/calculators/rebar       → Калькулятор арматуры (сейсмозона)
/calculators/screed      → Калькулятор стяжки пола
```

These pages are SEO-optimised (ISR, Russian keywords) — high organic traffic from Tajik builders searching "сколько кирпичей нужно на дом" etc.

```tsx
// app/(public)/calculators/brick/page.tsx
export const metadata = {
  title: 'Калькулятор кирпича онлайн — Таджикистан',
  description: 'Рассчитайте количество кирпичей для строительства дома в Таджикистане. Учёт раствора, отходов и стоимости.',
};
export const revalidate = 86400; // daily ISR
```

---

## Contractor Directory

```tsx
// components/contractors/ContractorCard.tsx
function ContractorCard({ contractor }: { contractor: Contractor }) {
  const specialtyLabels: Record<string, string> = {
    foundation:   'Фундамент',
    walls:        'Кладка',
    electrical:   'Электрика',
    plumbing:     'Сантехника',
    finishing:    'Отделка',
    full_cycle:   'Под ключ',
  };

  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{contractor.companyName ?? 'Частный мастер'}</h3>
          <p className="text-sm text-muted-foreground">{contractor.city}, {contractor.region}</p>
        </div>
        {contractor.isVerified && (
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
            ✓ Проверен
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {contractor.specialties.map(s => (
          <span key={s} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {specialtyLabels[s] ?? s}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-4 text-sm">
        <span>⭐ {contractor.rating.toFixed(1)} ({contractor.reviewCount})</span>
        <span className="text-muted-foreground">{contractor.experienceYrs} лет опыта</span>
        {contractor.pricePerDay && (
          <span className="font-medium">{formatSomoni(contractor.pricePerDay)}/день</span>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <Link href={`/contractors/${contractor.id}`}
          className="flex-1 rounded-md border py-1.5 text-center text-sm font-medium">
          Профиль
        </Link>
        <button className="flex-1 rounded-md bg-primary py-1.5 text-sm font-medium text-primary-foreground">
          Запросить смету
        </button>
      </div>
    </div>
  );
}
```

---

## Tajikistan-Specific Checklist

- [ ] Seismic zone selector in house params — drives rebar diameter and spacing
- [ ] GBAO projects show extra insulation items (mountain climate)
- [ ] Flat roof is default (most common in Tajikistan lowlands)
- [ ] Silicate vs. clay brick choice — price differs significantly
- [ ] Roof water tank plumbing note for houses outside Dushanbe city grid
- [ ] Gas boiler heating option (most common), electric boiler fallback for areas without gas
- [ ] Calculator pages SEO in Russian (high search volume for DIY builders)
- [ ] Waste coefficients applied to all materials (never order exact qty)
- [ ] "Добавить всё в корзину" CTA is the primary conversion on material list page
- [ ] Contractor ratings shown prominently — word-of-mouth is how TJ builders choose contractors
- [ ] Material quantities rounded UP (never round down on a construction site)
- [ ] Total cost estimate shown as "ориентировочная" (approximate) — prices change constantly
