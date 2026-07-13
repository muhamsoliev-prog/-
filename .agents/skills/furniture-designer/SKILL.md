---
name: furniture-designer
description: |-
  3D furniture designer for Tajikistan interior market — parametric models, material textures, price in dirams, room fit calculation, and BIM/planner-3d integration.
---

# Furniture Designer Agent

## Trigger
`/furniture-designer`

## Role
Parametric custom furniture configurator for the Tajikistan marketplace. Buyers design kitchens, wardrobes, тахт platforms, carved сервантs, and bedroom sets using local wood types and ганч ornaments — then send a production quote to a network of local усто (master craftsmen). Finished designs publish as marketplace listings with real pricing.

---

## Tajikistan Furniture Context

| Context | Detail |
|---|---|
| Primary local woods | Walnut (грецкий орех), mulberry/тут, apricot/зардолу, poplar/тол |
| Imported materials | MDF Egger (Austria), ЛДСП Kronospan, PVC film, HPL laminate |
| Most common custom piece | Kitchen set (гарнитур) — almost all TJ kitchens are custom |
| Traditional furniture | Такт (low platform), сервант (display cabinet), резной шкаф |
| Ornament tradition | Ганч carving, нақш (geometric inlay), точёные ножки |
| Craftsman network | Усто — individual masters, workshops in Душанбе/Худжанд/Хорог |
| Pricing unit | Per running metre (п/м) for kitchens; per piece for carcass furniture |
| Typical kitchen budget | 3 000–15 000 сомонӣ (300 000–1 500 000 TJS) |
| Delivery to regions | Surcharge: +15% Худжанд, +25% Куляб, +50% Хорог |

---

## Material Catalog

```ts
export interface WoodMaterial {
  id: string;
  nameRu: string;
  nameTj: string;
  type: 'solid_wood' | 'mdf' | 'ldsp' | 'hpl' | 'veneer';
  origin: 'local' | 'import';
  priceDiramPerM2: number;       // integer dirams per m²
  density: number;               // kg/m³ for weight calc
  colorHex: string;
  textureUrl?: string;
  grainDirection: 'vertical' | 'horizontal' | 'none';
  durabilityYears: number;
  notes: string;
}

export const WOOD_MATERIALS: WoodMaterial[] = [
  // Local solid wood
  { id: 'walnut_local',    nameRu: 'Орех грецкий (местный)', nameTj: 'Чормағзи маҳаллӣ',  type: 'solid_wood', origin: 'local',  priceDiramPerM2: 180_000_00, density: 640, colorHex: '#6b4226', grainDirection: 'vertical', durabilityYears: 50, notes: 'Лучший для резьбы' },
  { id: 'mulberry_local',  nameRu: 'Тут (шелковица)',         nameTj: 'Тут',                type: 'solid_wood', origin: 'local',  priceDiramPerM2: 95_000_00,  density: 580, colorHex: '#8b5e3c', grainDirection: 'vertical', durabilityYears: 40, notes: 'Светлое ядро, прочное' },
  { id: 'apricot_local',   nameRu: 'Зардолу (абрикос)',       nameTj: 'Зардолу',            type: 'solid_wood', origin: 'local',  priceDiramPerM2: 75_000_00,  density: 560, colorHex: '#c47c3a', grainDirection: 'vertical', durabilityYears: 30, notes: 'Тёплый оттенок, средняя твёрдость' },
  { id: 'poplar_local',    nameRu: 'Тол (тополь)',            nameTj: 'Тол',                type: 'solid_wood', origin: 'local',  priceDiramPerM2: 35_000_00,  density: 420, colorHex: '#d4b896', grainDirection: 'vertical', durabilityYears: 20, notes: 'Бюджетный, мягкий' },

  // Imported sheet materials
  { id: 'mdf_16mm',        nameRu: 'МДФ 16мм (Egger)',        nameTj: 'МДФ 16мм',           type: 'mdf',        origin: 'import', priceDiramPerM2: 28_000_00,  density: 750, colorHex: '#e8d5b7', grainDirection: 'none',     durabilityYears: 15, notes: 'Стандарт для фасадов' },
  { id: 'ldsp_16mm',       nameRu: 'ЛДСП 16мм (Kronospan)',   nameTj: 'ЛДСП 16мм',          type: 'ldsp',       origin: 'import', priceDiramPerM2: 18_000_00,  density: 680, colorHex: '#f0ead8', grainDirection: 'none',     durabilityYears: 12, notes: 'Корпус кухни, шкафов' },
  { id: 'ldsp_18mm',       nameRu: 'ЛДСП 18мм',               nameTj: 'ЛДСП 18мм',          type: 'ldsp',       origin: 'import', priceDiramPerM2: 22_000_00,  density: 680, colorHex: '#f0ead8', grainDirection: 'none',     durabilityYears: 12, notes: 'Для горизонтальных нагрузок' },
  { id: 'hpl_compact',     nameRu: 'HPL компакт (столешница)',nameTj: 'HPL столешница',      type: 'hpl',        origin: 'import', priceDiramPerM2: 95_000_00,  density: 1400,colorHex: '#d0c8b8', grainDirection: 'none',     durabilityYears: 20, notes: 'Влагостойкая столешница' },
  { id: 'veneer_oak',      nameRu: 'Шпон дуб (натуральный)',  nameTj: 'Шпони дуб',          type: 'veneer',     origin: 'import', priceDiramPerM2: 45_000_00,  density: 0,   colorHex: '#b8956a', grainDirection: 'vertical', durabilityYears: 25, notes: 'Поверх МДФ/ЛДСП' },
  { id: 'pvc_white',       nameRu: 'ПВХ-плёнка белая',        nameTj: 'Плёнкаи сафед',      type: 'mdf',        origin: 'import', priceDiramPerM2: 8_000_00,   density: 0,   colorHex: '#f8f8f8', grainDirection: 'none',     durabilityYears: 10, notes: 'Бюджетный фасад МДФ' },
];
```

---

## Carving Patterns (ганч / нақш)

```ts
export interface CarvingPattern {
  id: string;
  nameRu: string;
  nameTj: string;
  svgUrl: string;              // repeating SVG tile
  previewUrl: string;          // preview image
  compatibleMaterials: string[]; // material IDs
  priceDiramPerM2: number;     // labor cost per m² (on top of material)
  depthMm: number;             // carving depth
  region: 'dushanbe' | 'khujand' | 'kulob' | 'all';
}

export const CARVING_PATTERNS: CarvingPattern[] = [
  { id: 'ganch_rosette',   nameRu: 'Ганч розетка',       nameTj: 'Ганч-гул',        svgUrl: '/patterns/ganch_rosette.svg',   previewUrl: '/patterns/ganch_rosette.jpg',   compatibleMaterials: ['walnut_local', 'mulberry_local', 'mdf_16mm'], priceDiramPerM2: 120_000_00, depthMm: 15, region: 'all' },
  { id: 'naqsh_geometric', nameRu: 'Нақш геометрический',nameTj: 'Нақши ҳандасӣ',   svgUrl: '/patterns/naqsh_geometric.svg', previewUrl: '/patterns/naqsh_geometric.jpg', compatibleMaterials: ['walnut_local', 'mulberry_local'],             priceDiramPerM2: 95_000_00,  depthMm: 8,  region: 'all' },
  { id: 'isfahani_scroll', nameRu: 'Исфаханский аканф', nameTj: 'Ислимии исфаҳонӣ', svgUrl: '/patterns/isfahani_scroll.svg', previewUrl: '/patterns/isfahani_scroll.jpg', compatibleMaterials: ['walnut_local'],                               priceDiramPerM2: 180_000_00, depthMm: 20, region: 'dushanbe' },
  { id: 'khujand_star',    nameRu: 'Худжандская звезда', nameTj: 'Ситораи хуҷандӣ', svgUrl: '/patterns/khujand_star.svg',    previewUrl: '/patterns/khujand_star.jpg',    compatibleMaterials: ['walnut_local', 'apricot_local'],              priceDiramPerM2: 110_000_00, depthMm: 12, region: 'khujand' },
  { id: 'plain',           nameRu: 'Без резьбы',         nameTj: 'Бе нақш',         svgUrl: '',                              previewUrl: '',                              compatibleMaterials: ['walnut_local','mulberry_local','mdf_16mm','ldsp_16mm','pvc_white'], priceDiramPerM2: 0, depthMm: 0, region: 'all' },
];
```

---

## Furniture Types

```ts
export type FurnitureType =
  | 'kitchen'         // Кухонный гарнитур
  | 'wardrobe'        // Шкаф-купе / распашной
  | 'takht'           // Такт (традиционная платформа)
  | 'servant'         // Сервант / витрина
  | 'bed'             // Кровать
  | 'tv_unit'         // ТВ-тумба / стенка
  | 'bookcase'        // Книжный шкаф
  | 'dressing_table'  // Туалетный столик
  | 'hallway'         // Прихожая
  | 'custom';         // Произвольная

export interface FurnitureDesign {
  id: string;
  userId: string;
  type: FurnitureType;
  nameRu: string;

  // Overall dimensions (cm, integers)
  totalWidthCm: number;
  totalHeightCm: number;
  totalDepthCm: number;

  // Materials
  carcassMaterialId: string;
  facadeMaterialId: string;
  worktopMaterialId?: string;     // kitchens only
  backPanelMaterialId: string;

  // Carving
  carvingPatternId: string;
  carvingCoverage: number;        // 0-1, fraction of facade surface

  // Configuration
  modules: FurnitureModule[];
  hardware: HardwareSpec;
  colorFinish: string;            // hex or RAL code

  // Pricing
  estimatedPriceDirams: number;   // integer, calc'd by calcFurniturePrice()
  laborPriceDirams: number;
  materialPriceDirams: number;
  deliveryZone: string;

  // Lifecycle
  status: 'draft' | 'quoted' | 'in_production' | 'delivered';
  craftsmanId?: string;
  productId?: string;             // if published to marketplace
  createdAt: Date;
  updatedAt: Date;
}

export interface FurnitureModule {
  id: string;
  designId: string;
  type: ModuleType;
  widthCm: number;
  heightCm: number;
  depthCm: number;
  positionX: number;             // cm from left
  positionY: number;             // cm from floor
  shelvesCount: number;
  hasDrawers: boolean;
  drawersCount: number;
  hasDoors: boolean;
  doorsCount: number;
  doorStyle: 'swing' | 'sliding' | 'open';
  innerMaterialId: string;
}

export type ModuleType =
  // Kitchen
  | 'lower_standard'    // Нижний стандартный 60 см
  | 'lower_sink'        // Под мойку
  | 'lower_corner'      // Угловой нижний
  | 'upper_standard'    // Верхний стандартный
  | 'upper_corner'      // Угловой верхний
  | 'tall_pantry'       // Пенал
  | 'tall_fridge'       // Под холодильник
  // Wardrobe
  | 'hanging_long'      // Длинная штанга (пальто)
  | 'hanging_short'     // Короткая штанга × 2
  | 'shelves_only'      // Полки
  | 'drawers_block'     // Блок ящиков
  | 'mirror_door'       // Дверь с зеркалом
  // Takht
  | 'takht_platform'    // Основная платформа
  | 'takht_niche'       // Встроенная ниша
  | 'takht_storage'     // Ящики под сиденьем
  // Generic
  | 'open_shelf'
  | 'closed_cabinet'
  | 'custom';

export interface HardwareSpec {
  hingeBrand: 'blum' | 'grass' | 'hafele' | 'local';
  slideType: 'full_extension' | 'partial' | 'soft_close';
  handleStyle: 'bar' | 'cup' | 'knob' | 'integrated' | 'carved';
  handleMaterial: 'chrome' | 'brass' | 'black' | 'wood';
  legType: 'adjustable' | 'solid_wood' | 'none';
  legHeightCm: number;
}
```

---

## Prisma Schema

```prisma
model FurnitureDesign {
  id                  String            @id @default(cuid())
  userId              String
  type                String
  nameRu              String
  totalWidthCm        Int
  totalHeightCm       Int
  totalDepthCm        Int
  carcassMaterialId   String
  facadeMaterialId    String
  worktopMaterialId   String?
  backPanelMaterialId String
  carvingPatternId    String            @default("plain")
  carvingCoverage     Float             @default(0)
  colorFinish         String            @default("#f5f0e8")
  estimatedPriceDirams BigInt           @default(0)
  laborPriceDirams    BigInt            @default(0)
  materialPriceDirams BigInt            @default(0)
  deliveryZone        String            @default("dushanbe")
  status              String            @default("draft")
  craftsmanId         String?
  productId           String?
  modules             FurnitureModule[]
  hardware            Json
  quotes              CraftsmanQuote[]
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt

  @@index([userId])
  @@index([status])
}

model FurnitureModule {
  id               String          @id @default(cuid())
  designId         String
  design           FurnitureDesign @relation(fields: [designId], references: [id], onDelete: Cascade)
  type             String
  widthCm          Int
  heightCm         Int
  depthCm          Int
  positionX        Int
  positionY        Int
  shelvesCount     Int             @default(1)
  hasDrawers       Boolean         @default(false)
  drawersCount     Int             @default(0)
  hasDoors         Boolean         @default(true)
  doorsCount       Int             @default(1)
  doorStyle        String          @default("swing")
  innerMaterialId  String

  @@index([designId])
}

model CraftsmanQuote {
  id              String          @id @default(cuid())
  designId        String
  design          FurnitureDesign @relation(fields: [designId], references: [id])
  craftsmanId     String
  priceDirams     BigInt
  leadTimeDays    Int
  notes           String          @default("")
  status          String          @default("pending")  // pending|accepted|rejected
  expiresAt       DateTime
  createdAt       DateTime        @default(now())

  @@index([designId])
  @@index([craftsmanId])
}

model Craftsman {
  id            String   @id @default(cuid())
  nameRu        String
  phone         String
  city          String
  specialties   String[] // furniture types
  ratingX10     Int      @default(50) // 0-50 → 0.0-5.0
  reviewCount   Int      @default(0)
  portfolioUrls String[]
  isVerified    Boolean  @default(false)
  isActive      Boolean  @default(true)
  leadTimeDays  Int      @default(21)
}
```

---

## Price Calculator

All quantities in cm → convert to m² for material cost. Integer arithmetic throughout.

```ts
interface PriceResult {
  materialDirams: number;
  laborDirams: number;
  hardwareDirams: number;
  carvingDirams: number;
  deliveryDirams: number;
  totalDirams: number;
  breakdown: PriceLineItem[];
}

interface PriceLineItem {
  label: string;
  areaMm2?: number;
  priceDirams: number;
}

const LABOR_RATE_PER_M2: Record<FurnitureType, number> = {
  kitchen:       45_000_00,  // 45 000 сомонӣ/м² монтажа
  wardrobe:      35_000_00,
  takht:         25_000_00,
  servant:       40_000_00,
  bed:           30_000_00,
  tv_unit:       28_000_00,
  bookcase:      22_000_00,
  dressing_table:32_000_00,
  hallway:       30_000_00,
  custom:        38_000_00,
};

const HARDWARE_COST_PER_MODULE: Record<string, number> = {
  blum:    8_500_00,
  grass:   6_200_00,
  hafele:  5_800_00,
  local:   2_400_00,
};

const DELIVERY_SURCHARGE: Record<string, number> = {
  dushanbe:  0,
  khujand:   0.15,
  kulob:     0.25,
  qurghon:   0.25,
  hissor:    0.05,
  tursunzoda:0.08,
  gbao:      0.50,
};

export function calcFurniturePrice(design: FurnitureDesign): PriceResult {
  const breakdown: PriceLineItem[] = [];
  const mat = (id: string) => WOOD_MATERIALS.find(m => m.id === id)!;

  // Helper: area in m² from cm × cm, returns integer dirams
  const area_dirams = (wCm: number, hCm: number, material: WoodMaterial): number => {
    const m2 = (wCm * hCm) / 10_000;
    return Math.round(m2 * material.priceDiramPerM2);
  };

  let materialDirams = 0;
  let laborDirams = 0;
  let hardwareDirams = 0;
  let carvingDirams = 0;

  // Per-module material + hardware
  for (const mod of design.modules) {
    // Carcass panels: sides × 2, top, bottom, back
    const carcassMat = mat(design.carcassMaterialId);
    const sides  = area_dirams(mod.depthCm, mod.heightCm, carcassMat) * 2;
    const topBot = area_dirams(mod.widthCm, mod.depthCm, carcassMat) * 2;
    const backMat = mat(design.backPanelMaterialId);
    const back   = area_dirams(mod.widthCm, mod.heightCm, backMat);
    materialDirams += sides + topBot + back;
    breakdown.push({ label: `Корпус ${mod.type} ${mod.widthCm}см`, priceDirams: sides + topBot + back });

    // Facade
    if (mod.hasDoors) {
      const facadeMat = mat(design.facadeMaterialId);
      const facadeArea = area_dirams(
        Math.round(mod.widthCm / mod.doorsCount) - 4,  // 4cm gap per door
        mod.heightCm - 4,
        facadeMat
      ) * mod.doorsCount;
      materialDirams += facadeArea;
      breakdown.push({ label: `Фасад ${mod.doorsCount}дв.`, priceDirams: facadeArea });
    }

    // Shelves
    if (mod.shelvesCount > 0) {
      const shelfMat = mat(design.carcassMaterialId);
      const shelvesCost = area_dirams(mod.widthCm - 4, mod.depthCm - 2, shelfMat) * mod.shelvesCount;
      materialDirams += shelvesCost;
    }

    // Hardware per module
    const hwCost = HARDWARE_COST_PER_MODULE[design.hardware.hingeBrand] ?? HARDWARE_COST_PER_MODULE.local;
    hardwareDirams += hwCost * (mod.doorsCount + mod.drawersCount);
  }

  // Worktop (kitchens)
  if (design.worktopMaterialId && design.type === 'kitchen') {
    const wtMat = mat(design.worktopMaterialId);
    // Running length × 60 cm depth
    const runningM = design.totalWidthCm / 100;
    const wtCost = Math.round(runningM * 0.6 * wtMat.priceDiramPerM2);
    materialDirams += wtCost;
    breakdown.push({ label: `Столешница ${runningM.toFixed(1)} п/м`, priceDirams: wtCost });
  }

  // Carving
  if (design.carvingPatternId !== 'plain' && design.carvingCoverage > 0) {
    const pattern = CARVING_PATTERNS.find(p => p.id === design.carvingPatternId)!;
    const facadeTotalM2 = (design.totalWidthCm * design.totalHeightCm) / 10_000 * design.carvingCoverage;
    carvingDirams = Math.round(facadeTotalM2 * pattern.priceDiramPerM2);
    breakdown.push({ label: `Резьба «${pattern.nameRu}»`, priceDirams: carvingDirams });
  }

  // Labour — based on overall m² footprint × rate
  const footprintM2 = (design.totalWidthCm * design.totalDepthCm) / 10_000;
  const rate = LABOR_RATE_PER_M2[design.type] ?? LABOR_RATE_PER_M2.custom;
  laborDirams = Math.round(footprintM2 * rate);
  breakdown.push({ label: 'Работа (сборка + монтаж)', priceDirams: laborDirams });

  const subtotal = materialDirams + laborDirams + hardwareDirams + carvingDirams;

  // Delivery surcharge
  const surcharge = DELIVERY_SURCHARGE[design.deliveryZone] ?? 0;
  const deliveryDirams = Math.round(subtotal * surcharge);
  if (deliveryDirams > 0) {
    breakdown.push({ label: `Доставка в ${design.deliveryZone}`, priceDirams: deliveryDirams });
  }

  const totalDirams = subtotal + deliveryDirams;

  return { materialDirams, laborDirams, hardwareDirams, carvingDirams, deliveryDirams, totalDirams, breakdown };
}
```

---

## Kitchen Layout Engine

```ts
// Standard TJ kitchen module widths (cm)
const KITCHEN_MODULE_WIDTHS = [30, 40, 45, 50, 60, 80, 90, 100] as const;
const LOWER_HEIGHT_CM = 72;   // incl. 10cm leg
const UPPER_HEIGHT_CM = 72;   // standard upper unit height
const UPPER_OFFSET_CM = 60;   // gap between worktop and upper units
const DEPTH_LOWER_CM = 56;
const DEPTH_UPPER_CM = 32;

export type KitchenLayout = 'straight' | 'l_shape' | 'u_shape' | 'peninsula';

export function autoGenerateKitchenModules(
  wallLengthCm: number,         // main wall
  perpWallCm: number,           // L/U only
  layout: KitchenLayout,
  hasDishwasher: boolean,
  hasOven: boolean
): FurnitureModule[] {
  const modules: FurnitureModule[] = [];
  let posX = 0;
  const id = () => crypto.randomUUID();

  // Sink module first (always near window = left by TJ convention)
  modules.push({
    id: id(), type: 'lower_sink', widthCm: 60, heightCm: LOWER_HEIGHT_CM,
    depthCm: DEPTH_LOWER_CM, positionX: 0, positionY: 0,
    shelvesCount: 0, hasDrawers: false, drawersCount: 0,
    hasDoors: true, doorsCount: 2, doorStyle: 'swing', innerMaterialId: 'ldsp_16mm',
  });
  posX += 60;

  // Fridge space (60 cm) if layout allows
  if (wallLengthCm >= 180) {
    modules.push({
      id: id(), type: 'tall_fridge', widthCm: 60, heightCm: 195,
      depthCm: DEPTH_LOWER_CM, positionX: posX, positionY: 0,
      shelvesCount: 0, hasDrawers: false, drawersCount: 0,
      hasDoors: false, doorsCount: 0, doorStyle: 'open', innerMaterialId: 'ldsp_16mm',
    });
    posX += 60;
  }

  // Fill remaining lower with standard 60 cm modules
  while (posX + 60 <= wallLengthCm) {
    modules.push({
      id: id(), type: 'lower_standard', widthCm: 60, heightCm: LOWER_HEIGHT_CM,
      depthCm: DEPTH_LOWER_CM, positionX: posX, positionY: 0,
      shelvesCount: 1, hasDrawers: true, drawersCount: 2,
      hasDoors: true, doorsCount: 2, doorStyle: 'swing', innerMaterialId: 'ldsp_16mm',
    });
    posX += 60;
  }

  // Upper modules (starts from posX=0, offset positionY = LOWER_HEIGHT_CM + UPPER_OFFSET_CM)
  const upperY = LOWER_HEIGHT_CM + UPPER_OFFSET_CM;
  let posXUpper = 0;
  // Skip above sink — open shelf instead
  modules.push({
    id: id(), type: 'open_shelf', widthCm: 60, heightCm: UPPER_HEIGHT_CM,
    depthCm: DEPTH_UPPER_CM, positionX: 0, positionY: upperY,
    shelvesCount: 2, hasDrawers: false, drawersCount: 0,
    hasDoors: false, doorsCount: 0, doorStyle: 'open', innerMaterialId: 'ldsp_16mm',
  });
  posXUpper = 60;

  while (posXUpper + 60 <= wallLengthCm) {
    modules.push({
      id: id(), type: 'upper_standard', widthCm: 60, heightCm: UPPER_HEIGHT_CM,
      depthCm: DEPTH_UPPER_CM, positionX: posXUpper, positionY: upperY,
      shelvesCount: 2, hasDrawers: false, drawersCount: 0,
      hasDoors: true, doorsCount: 2, doorStyle: 'swing', innerMaterialId: 'ldsp_16mm',
    });
    posXUpper += 60;
  }

  return modules;
}
```

---

## Takht (Platform) Builder

Traditional Tajik floor platform — most requested custom piece in traditional homes.

```ts
export interface TakhtSpec {
  widthCm: number;       // typically 200-300 cm
  depthCm: number;       // typically 80-120 cm
  heightCm: number;      // typically 30-45 cm
  woodMaterialId: string;
  carvingPatternId: string;
  hasStorageDrawers: boolean;
  drawersCount: number;
  niche: boolean;        // built-in raised back niche for display
  nicheHeightCm: number;
}

export function buildTakhtModules(spec: TakhtSpec): FurnitureModule[] {
  const id = () => crypto.randomUUID();
  const modules: FurnitureModule[] = [];

  // Main platform
  modules.push({
    id: id(), type: 'takht_platform',
    widthCm: spec.widthCm, heightCm: spec.heightCm, depthCm: spec.depthCm,
    positionX: 0, positionY: 0,
    shelvesCount: 0,
    hasDrawers: spec.hasStorageDrawers, drawersCount: spec.drawersCount,
    hasDoors: false, doorsCount: 0, doorStyle: 'open',
    innerMaterialId: spec.woodMaterialId,
  });

  // Back niche (raised display shelf)
  if (spec.niche) {
    modules.push({
      id: id(), type: 'takht_niche',
      widthCm: spec.widthCm, heightCm: spec.nicheHeightCm, depthCm: 30,
      positionX: 0, positionY: spec.heightCm,
      shelvesCount: 1, hasDrawers: false, drawersCount: 0,
      hasDoors: false, doorsCount: 0, doorStyle: 'open',
      innerMaterialId: spec.woodMaterialId,
    });
  }

  return modules;
}
```

---

## 2D Technical Drawing (SVG Export)

```ts
import { formatSomoni } from '@/lib/pricing';

export function generateTechnicalDrawingSVG(design: FurnitureDesign): string {
  const SCALE = 2;          // 1 cm = 2 px in SVG
  const W = design.totalWidthCm * SCALE;
  const H = design.totalHeightCm * SCALE;
  const PAD = 60;

  const rects = design.modules.map(mod => {
    const x = mod.positionX * SCALE + PAD;
    const y = (design.totalHeightCm - mod.positionY - mod.heightCm) * SCALE + PAD; // flip Y
    const w = mod.widthCm * SCALE;
    const h = mod.heightCm * SCALE;
    return `
      <rect x="${x}" y="${y}" width="${w}" height="${h}"
            fill="#f5f0e8" stroke="#4a3728" stroke-width="1.5" />
      <text x="${x + w / 2}" y="${y + h / 2 + 4}" text-anchor="middle"
            font-size="9" fill="#4a3728">${mod.widthCm}</text>`;
  }).join('');

  // Overall dimension lines
  const dimY = H + PAD + 30;
  const dimX = PAD - 30;

  const priceResult = calcFurniturePrice(design);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W + PAD * 2 + 60}" height="${H + PAD * 2 + 80}">
  <style>text { font-family: Arial, sans-serif; }</style>

  <!-- Border -->
  <rect x="${PAD}" y="${PAD}" width="${W}" height="${H}"
        fill="none" stroke="#2a2a2a" stroke-width="2" />

  <!-- Modules -->
  ${rects}

  <!-- Width dimension -->
  <line x1="${PAD}" y1="${dimY}" x2="${PAD + W}" y2="${dimY}" stroke="#666" stroke-width="1"/>
  <text x="${PAD + W / 2}" y="${dimY + 14}" text-anchor="middle" font-size="11">
    ${design.totalWidthCm} см
  </text>

  <!-- Height dimension -->
  <line x1="${dimX}" y1="${PAD}" x2="${dimX}" y2="${PAD + H}" stroke="#666" stroke-width="1" />
  <text x="${dimX - 8}" y="${PAD + H / 2}" text-anchor="middle" font-size="11"
        transform="rotate(-90 ${dimX - 8} ${PAD + H / 2})">
    ${design.totalHeightCm} см
  </text>

  <!-- Title block -->
  <text x="${PAD}" y="${H + PAD * 2 + 50}" font-size="13" font-weight="bold" fill="#1a1a1a">
    ${design.nameRu}
  </text>
  <text x="${PAD}" y="${H + PAD * 2 + 66}" font-size="10" fill="#555">
    ${design.totalWidthCm} × ${design.totalDepthCm} × ${design.totalHeightCm} см |
    Итого: ${formatSomoni(priceResult.totalDirams)} |
    ${new Date().toLocaleDateString('ru-TJ')}
  </text>
</svg>`;
}

export function exportDrawingToPDF(design: FurnitureDesign): void {
  const svg = generateTechnicalDrawingSVG(design);
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `${design.nameRu.replace(/\s/g, '_')}.svg`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}
```

---

## 3D Configurator Preview (R3F)

Reuses the 3D Planner renderer for a live furniture preview.

```tsx
// components/furniture-designer/FurniturePreview3D.tsx
'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import type { FurnitureDesign, FurnitureModule } from '@/types/furniture-designer';
import { WOOD_MATERIALS } from '@/lib/furniture-materials';

function ModuleBox({ mod, material }: { mod: FurnitureModule; material: THREE.Material }) {
  const CM = 0.01;
  return (
    <mesh
      position={[
        (mod.positionX + mod.widthCm / 2) * CM,
        (mod.positionY + mod.heightCm / 2) * CM,
        mod.depthCm / 2 * CM,
      ]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[mod.widthCm * CM, mod.heightCm * CM, mod.depthCm * CM]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

export function FurniturePreview3D({ design }: { design: FurnitureDesign }) {
  const facadeMat = WOOD_MATERIALS.find(m => m.id === design.facadeMaterialId);
  const material  = new THREE.MeshStandardMaterial({
    color:     facadeMat?.colorHex ?? '#e8d5b7',
    roughness: 0.7,
    metalness: 0,
  });

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [2, 1.5, 2.5], fov: 45 }}
      gl={{ antialias: true }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 5, 3]} intensity={1.5} castShadow />
      <Environment preset="studio" background={false} />

      {design.modules.map(mod => (
        <ModuleBox key={mod.id} mod={mod} material={material} />
      ))}

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#d4c5a9" roughness={0.8} />
      </mesh>

      <OrbitControls
        minDistance={0.5}
        maxDistance={6}
        target={[design.totalWidthCm * 0.005, design.totalHeightCm * 0.005, design.totalDepthCm * 0.005]}
        enableDamping
        dampingFactor={0.08}
      />
    </Canvas>
  );
}
```

---

## Craftsman Quote Flow

```ts
export async function requestCraftsmanQuotes(designId: string): Promise<void> {
  const design = await prisma.furnitureDesign.findUnique({ where: { id: designId } });
  if (!design) return;

  // Find craftsmen matching type + city
  const craftsmen = await prisma.craftsman.findMany({
    where: {
      specialties: { has: design.type },
      city: design.deliveryZone,
      isActive: true,
      isVerified: true,
    },
    take: 5,
    orderBy: { ratingX10: 'desc' },
  });

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  for (const craftsman of craftsmen) {
    await prisma.craftsmanQuote.create({
      data: {
        designId,
        craftsmanId: craftsman.id,
        priceDirams: 0,            // craftsman fills this
        leadTimeDays: craftsman.leadTimeDays,
        status: 'pending',
        expiresAt,
      },
    });

    // Send SMS notification (Beeline TJ)
    await smsQueue.add('send-sms', {
      phone: craftsman.phone,
      message: `Усто, новый заказ на мебель: ${design.nameRu} (${design.totalWidthCm}×${design.totalHeightCm}см). Войдите в кабинет усто для ответа.`,
    });
  }

  await prisma.furnitureDesign.update({
    where: { id: designId },
    data: { status: 'quoted' },
  });
}

export async function acceptQuote(quoteId: string, userId: string): Promise<void> {
  const quote = await prisma.craftsmanQuote.findUnique({
    where: { id: quoteId },
    include: { design: true },
  });
  if (!quote || quote.design.userId !== userId) throw new Error('Not found');

  await prisma.$transaction([
    prisma.craftsmanQuote.update({ where: { id: quoteId }, data: { status: 'accepted' } }),
    prisma.craftsmanQuote.updateMany({
      where: { designId: quote.designId, id: { not: quoteId } },
      data: { status: 'rejected' },
    }),
    prisma.furnitureDesign.update({
      where: { id: quote.designId },
      data: { status: 'in_production', craftsmanId: quote.craftsmanId },
    }),
  ]);
}
```

---

## Publish as Marketplace Product

```ts
export async function publishDesignAsProduct(designId: string): Promise<string> {
  const design = await prisma.furnitureDesign.findUnique({
    where: { id: designId },
    include: { modules: true },
  });
  if (!design) throw new Error('Not found');

  const price = calcFurniturePrice(design);
  const svg   = generateTechnicalDrawingSVG(design);

  // Upload SVG as product image
  const svgBuffer = Buffer.from(svg, 'utf-8');
  const drawingUrl = await uploadFile(
    `furniture/${designId}/drawing.svg`,
    svgBuffer,
    'image/svg+xml'
  );

  const product = await prisma.product.create({
    data: {
      nameRu: design.nameRu,
      descriptionRu: `Мебель на заказ. ${design.totalWidthCm}×${design.totalDepthCm}×${design.totalHeightCm} см.`,
      priceDirams: price.totalDirams,
      category: 'custom_furniture',
      images: [drawingUrl],
      isMadeToOrder: true,
      leadTimeDays: 21,
      customAttributes: {
        furnitureDesignId: designId,
        type: design.type,
        materialId: design.facadeMaterialId,
        carvingPatternId: design.carvingPatternId,
        dimensions: `${design.totalWidthCm}×${design.totalDepthCm}×${design.totalHeightCm}`,
      },
    },
  });

  await prisma.furnitureDesign.update({
    where: { id: designId },
    data: { productId: product.id },
  });

  return product.id;
}
```

---

## API Routes

```
GET  /api/furniture                         — list user's designs
POST /api/furniture                         — create design
GET  /api/furniture/:id                     — load design + modules
PUT  /api/furniture/:id                     — save design
POST /api/furniture/:id/calc-price          — recalculate price
POST /api/furniture/:id/request-quotes      — send to craftsmen
POST /api/furniture/:id/accept-quote/:qid  — accept craftsman quote
POST /api/furniture/:id/publish             — publish as marketplace product
GET  /api/furniture/:id/drawing.svg         — download technical drawing
GET  /api/furniture/templates/:type         — default module set per type
GET  /api/craftsmen?city=:city&type=:type   — list verified craftsmen
GET  /api/materials/wood                    — list WoodMaterial[]
GET  /api/materials/carving                 — list CarvingPattern[]
```

---

## Key Rules

1. **Integer dirams only** — `priceDirams`, `laborPriceDirams`, `materialPriceDirams` all `BigInt` in Prisma.
2. **Такт is top priority** for traditional style — always show it first in type picker.
3. **Carving compatibility check** — block incompatible material+pattern combos before save.
4. **Lead time 21 days minimum** — TJ craftsmen standard; show `isMadeToOrder: true` on product card.
5. **SMS to craftsman** via Beeline TJ queue on quote request — never synchronous HTTP call.
6. **Weight estimate** for delivery: `density (kg/m³) × volume (m³)` per module — warn if > 500 kg.
7. **Regional surcharge** applied last after subtotal, never on partial sums.
8. **SVG drawing** — download as `.svg` not PDF (lighter, vector, mobile-friendly).
9. **Quote expiry 7 days** — auto-reject expired pending quotes via nightly cron.
10. **Publish requires status = 'quoted'** — prevent publishing unpriced drafts to catalog.
