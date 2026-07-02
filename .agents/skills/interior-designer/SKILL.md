# Interior Designer Agent

## Trigger
`/interior-designer`

## Role
Generate room-by-room interior design plans for Tajikistan residential projects. Produces style presets, color palettes, moodboards, furniture placement recommendations, material specs, and budget estimates in TJS — then pushes selections directly into the 3D Planner and product catalog cart.

---

## Tajikistan Design Context

| Context | Detail |
|---|---|
| Most important room | Меҳмонхона (guest room) — always highest budget, most formal |
| Traditional seating | Курпача (floor cushions) on takht (low platform) |
| Signature ornament | Ганч (ганч резьба) — carved plaster ceilings and niches |
| Wood carving | Дарвоза / нақш — carved wooden door frames and panels |
| Textiles | Қолин (hand-woven carpet), абровый шёлк (ikat silk) |
| Traditional colors | Royal blue (#1a3a8f), deep red (#8b1c1c), gold (#c9a227) |
| Modern Dushanbe | White/grey walls + walnut/oak wood accents, European influence |
| Climate note | Hot summers → cool tile/marble floors, ceiling fans, deep window recesses |
| Seismic context | No heavy hung items on walls without anchor bolts (зона 8-9) |
| Mobile users | 80%+ Android — all UI mobile-first, collapsible panels |

---

## Design Styles

```ts
export const DESIGN_STYLES = {
  TRADITIONAL_TJ: {
    id: 'traditional_tj',
    nameRu: 'Традиционный таджикский',
    nameTj: 'Тоҷикии анъанавӣ',
    description: 'Ганч, курпача, қолин, резьба по дереву. Красный, синий, золотой.',
    palette: ['#1a3a8f', '#8b1c1c', '#c9a227', '#f5e6c8', '#2d5a1b'],
    wallMaterial: 'ganch',
    floorMaterial: 'carpet_grey',  // replaced with qolin
    ceilingStyle: 'ganch_carved',
    furnitureSets: ['takht_set', 'kurpacha_set', 'carved_wardrobe'],
    accentElements: ['ganch_niche', 'carved_door_frame', 'ikat_curtains'],
  },

  MODERN_DUSHANBE: {
    id: 'modern_dushanbe',
    nameRu: 'Современный душанбинский',
    nameTj: 'Муосири Душанбе',
    description: 'Белые стены, дерево, нейтральные тона. Европейский стиль.',
    palette: ['#ffffff', '#f5f0e8', '#a07850', '#3c3c3c', '#6aab9f'],
    wallMaterial: 'plaster_white',
    floorMaterial: 'tile_beige',
    ceilingStyle: 'stretch_white',
    furnitureSets: ['sofa_set_modern', 'dining_modern', 'kitchen_modern'],
    accentElements: ['indoor_plants', 'geometric_rug', 'led_strip'],
  },

  ISLAMIC_GEOMETRIC: {
    id: 'islamic_geometric',
    nameRu: 'Исламский геометрический',
    nameTj: 'Ҳандасаи исломӣ',
    description: 'Геометрические узоры, арки, сдержанные тона, металлические акценты.',
    palette: ['#f0e8d8', '#2c5f5a', '#c9a227', '#1a1a2e', '#8b6914'],
    wallMaterial: 'tile_wall_white',
    floorMaterial: 'marble_white',
    ceilingStyle: 'muqarnas',
    furnitureSets: ['arch_sofa_set', 'mosaic_coffee_table', 'brass_lanterns'],
    accentElements: ['mashrabiya_screen', 'geometric_tiles', 'brass_accents'],
  },

  MINIMALIST: {
    id: 'minimalist',
    nameRu: 'Минимализм',
    nameTj: 'Минимализм',
    description: 'Чисто, функционально, светло. Скандинавское влияние.',
    palette: ['#ffffff', '#f4f4f0', '#d0c8b8', '#8c8c8c', '#2b2b2b'],
    wallMaterial: 'plaster_white',
    floorMaterial: 'parquet_oak',
    ceilingStyle: 'plain_white',
    furnitureSets: ['sofa_set_minimal', 'open_shelf', 'minimal_bed'],
    accentElements: ['potted_plant', 'linen_curtains', 'floor_lamp'],
  },

  ECLECTIC_TJ: {
    id: 'eclectic_tj',
    nameRu: 'Эклектика (восток + запад)',
    nameTj: 'Омехта (шарқу ғарб)',
    description: 'Иkat-принты + современная мебель. Лучшее из двух миров.',
    palette: ['#f8f0e0', '#3d5a80', '#e07b39', '#264653', '#e9c46a'],
    wallMaterial: 'plaster_white',
    floorMaterial: 'tile_beige',
    ceilingStyle: 'coffered',
    furnitureSets: ['sofa_set_modern', 'ikat_accents', 'carved_sideboard'],
    accentElements: ['ikat_cushions', 'suzani_throw', 'brass_vases'],
  },
} as const;

export type DesignStyleKey = keyof typeof DESIGN_STYLES;
```

---

## Data Interfaces

```ts
interface DesignProject {
  id: string;
  projectId: string;         // HouseProject FK
  scene3dId?: string;        // Scene3D FK
  nameRu: string;
  styleKey: DesignStyleKey;
  budgetDirams: number;      // total budget, integer dirams
  rooms: DesignRoom[];
  moodboard?: Moodboard;
  createdAt: Date;
  updatedAt: Date;
}

interface DesignRoom {
  id: string;
  designProjectId: string;
  roomId: string;            // Room2D FK
  nameRu: string;
  styleKey: DesignStyleKey;
  area: number;              // m², float for display only
  palette: ColorPalette;
  wallMaterialId: string;
  floorMaterialId: string;
  ceilingStyleId: string;
  furniture: DesignItem[];
  lighting: LightingScheme;
  budgetDirams: number;
  notes: string;             // designer notes in Russian
}

interface DesignItem {
  id: string;
  designRoomId: string;
  productId?: string;        // marketplace product FK (nullable if custom)
  nameRu: string;
  category: DesignItemCategory;
  widthCm: number;
  depthCm: number;
  heightCm: number;
  positionX: number;         // cm in 2D plan
  positionY: number;
  rotationDeg: number;
  priceDirams: number;
  imageUrl?: string;
  quantity: number;
  isKeypiece: boolean;       // highlight in moodboard
}

type DesignItemCategory =
  | 'seating' | 'bed' | 'storage' | 'table' | 'lighting'
  | 'textile' | 'decor' | 'appliance' | 'kitchen' | 'bathroom'
  | 'traditional';            // курпача, такт, ганч элементы

interface ColorPalette {
  primary: string;     // hex
  secondary: string;
  accent: string;
  neutral: string;
  background: string;
  textOnBg: string;    // auto-computed for contrast
}

interface LightingScheme {
  mainType: 'chandelier' | 'ceiling_spots' | 'led_strip' | 'pendant' | 'traditional_lantern';
  colorTemp: 2700 | 3000 | 4000 | 6500; // Kelvin
  luxTarget: number;   // living: 200, kitchen: 500, bedroom: 100, bathroom: 300
  accentLights: boolean;
  dimmer: boolean;
}

interface Moodboard {
  id: string;
  designProjectId: string;
  imageUrls: string[];    // 6-9 product/material images
  colorSwatches: string[]; // hex colors
  styleTagsRu: string[];
  generatedAt: Date;
}
```

---

## Prisma Schema

```prisma
model DesignProject {
  id          String       @id @default(cuid())
  projectId   String
  scene3dId   String?
  nameRu      String
  styleKey    String
  budgetDirams BigInt      @default(0)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  rooms       DesignRoom[]
  moodboard   Moodboard?

  @@index([projectId])
}

model DesignRoom {
  id               String       @id @default(cuid())
  designProjectId  String
  designProject    DesignProject @relation(fields: [designProjectId], references: [id])
  roomId           String
  nameRu           String
  styleKey         String
  areaSqm          Float
  palette          Json
  wallMaterialId   String?
  floorMaterialId  String?
  ceilingStyleId   String?
  furniture        DesignItem[]
  lighting         Json
  budgetDirams     BigInt       @default(0)
  notes            String       @default("")

  @@index([designProjectId])
}

model DesignItem {
  id            String     @id @default(cuid())
  designRoomId  String
  designRoom    DesignRoom @relation(fields: [designRoomId], references: [id])
  productId     String?
  nameRu        String
  category      String
  widthCm       Int
  depthCm       Int
  heightCm      Int
  positionX     Int        @default(0)
  positionY     Int        @default(0)
  rotationDeg   Int        @default(0)
  priceDirams   BigInt
  imageUrl      String?
  quantity      Int        @default(1)
  isKeypiece    Boolean    @default(false)

  @@index([designRoomId])
  @@index([productId])
}

model Moodboard {
  id              String        @id @default(cuid())
  designProjectId String        @unique
  designProject   DesignProject @relation(fields: [designProjectId], references: [id])
  imageUrls       String[]
  colorSwatches   String[]
  styleTagsRu     String[]
  generatedAt     DateTime      @default(now())
}
```

---

## Room Budget Allocations (% of total)

Standard TJ residential project:

```ts
const ROOM_BUDGET_SHARE: Record<string, number> = {
  mehmonhona:  0.30,  // Меҳмонхона — всегда максимум
  master_bed:  0.20,
  kitchen:     0.18,
  living:      0.12,
  bathroom:    0.08,
  bed_2:       0.07,
  bed_3:       0.05,
  default:     0.05,  // остальные комнаты поровну
};

export function allocateBudget(
  totalDirams: number,
  rooms: { id: string; type: string }[]
): Record<string, number> {
  const result: Record<string, number> = {};
  let remaining = totalDirams;
  let remainingRooms = [...rooms];

  for (const room of rooms) {
    const share = ROOM_BUDGET_SHARE[room.type] ?? ROOM_BUDGET_SHARE.default;
    const amt = Math.round(totalDirams * share);
    result[room.id] = amt;
    remaining -= amt;
  }

  // Round-off goes to mehmonhona
  const meh = rooms.find(r => r.type === 'mehmonhona');
  if (meh) result[meh.id] += remaining;

  return result;
}
```

---

## Color Palette Generator

```ts
import { oklch, formatHex, wcagContrast } from 'culori';

export function generatePalette(baseHex: string, style: DesignStyleKey): ColorPalette {
  const base = oklch(baseHex)!;

  // Complementary accent (hue +180)
  const accentHue = ((base.h ?? 0) + 180) % 360;
  const accent = formatHex({ mode: 'oklch', l: base.l * 0.9, c: base.c * 1.1, h: accentHue })!;

  // Secondary (hue +60, muted)
  const secHue = ((base.h ?? 0) + 60) % 360;
  const secondary = formatHex({ mode: 'oklch', l: 0.65, c: 0.08, h: secHue })!;

  // Neutral (very low chroma)
  const neutral = formatHex({ mode: 'oklch', l: 0.80, c: 0.02, h: base.h ?? 0 })!;

  // Background (near white for modern, warm cream for traditional)
  const bg = style === 'TRADITIONAL_TJ'
    ? '#f5e6c8'
    : formatHex({ mode: 'oklch', l: 0.97, c: 0.01, h: base.h ?? 0 })!;

  // Text: pick white or dark based on WCAG contrast
  const textOnBg = wcagContrast(bg, '#ffffff') >= 4.5 ? '#ffffff' : '#1a1a1a';

  return { primary: baseHex, secondary, accent, neutral, background: bg, textOnBg };
}

export function paletteFromStyle(style: DesignStyleKey): ColorPalette {
  const colors = DESIGN_STYLES[style].palette;
  return generatePalette(colors[0], style);
}
```

---

## Furniture Layout Engine

Places furniture respecting room polygon, clearances, and Tajik conventions.

```ts
interface PlacementRule {
  category: DesignItemCategory;
  wall: 'any' | 'main' | 'opposite_window' | 'corner' | 'center';
  clearanceFrontCm: number;   // min free space in front
  clearanceSideCm: number;
  requiresOutlet: boolean;
  forbidWall: boolean;        // floating placement
}

const PLACEMENT_RULES: PlacementRule[] = [
  { category: 'seating',    wall: 'main',            clearanceFrontCm: 100, clearanceSideCm: 30, requiresOutlet: false, forbidWall: false },
  { category: 'bed',        wall: 'opposite_window', clearanceFrontCm: 80,  clearanceSideCm: 50, requiresOutlet: false, forbidWall: false },
  { category: 'table',      wall: 'center',          clearanceFrontCm: 80,  clearanceSideCm: 60, requiresOutlet: false, forbidWall: true },
  { category: 'kitchen',    wall: 'any',             clearanceFrontCm: 120, clearanceSideCm: 0,  requiresOutlet: true,  forbidWall: false },
  { category: 'appliance',  wall: 'any',             clearanceFrontCm: 60,  clearanceSideCm: 5,  requiresOutlet: true,  forbidWall: false },
  { category: 'traditional',wall: 'main',            clearanceFrontCm: 30,  clearanceSideCm: 10, requiresOutlet: false, forbidWall: false },
];

export function autoLayoutRoom(
  room: DesignRoom,
  polygon: { x: number; y: number }[],
  items: DesignItem[]
): DesignItem[] {
  // Compute bounding box from polygon
  const xs = polygon.map(p => p.x);
  const ys = polygon.map(p => p.y);
  const minX = Math.min(...xs); const maxX = Math.max(...xs);
  const minY = Math.min(...ys); const maxY = Math.max(...ys);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  return items.map(item => {
    const rule = PLACEMENT_RULES.find(r => r.category === item.category)
      ?? PLACEMENT_RULES[0];

    let x = cx, y = cy;

    switch (rule.wall) {
      case 'main':
        // Place against the longest wall (south-facing preferred in TJ)
        x = cx;
        y = maxY - item.depthCm / 2 - 5;
        break;
      case 'opposite_window':
        x = cx;
        y = minY + item.depthCm / 2 + 10;
        break;
      case 'center':
        x = cx;
        y = cy;
        break;
      case 'corner':
        x = minX + item.widthCm / 2 + 5;
        y = minY + item.depthCm / 2 + 5;
        break;
    }

    return { ...item, positionX: Math.round(x), positionY: Math.round(y) };
  });
}
```

---

## Tajik Room Templates

Pre-built furniture lists per room type × style:

```ts
export const ROOM_TEMPLATES: Record<string, Record<DesignStyleKey, DesignItem[]>> = {

  mehmonhona: {
    TRADITIONAL_TJ: [
      { nameRu: 'Такт (ширина 240см)',          category: 'traditional', widthCm: 240, depthCm: 100, heightCm: 35,  priceDirams: 350_000_00, quantity: 1, isKeypiece: true },
      { nameRu: 'Курпача × 10',                 category: 'traditional', widthCm: 60,  depthCm: 60,  heightCm: 10,  priceDirams: 15_000_00,  quantity: 10 },
      { nameRu: 'Қолин (3×4м)',                 category: 'textile',     widthCm: 300, depthCm: 400, heightCm: 1,   priceDirams: 280_000_00, quantity: 1, isKeypiece: true },
      { nameRu: 'Шкаф резной (ганч)',            category: 'storage',     widthCm: 180, depthCm: 50,  heightCm: 220, priceDirams: 420_000_00, quantity: 1 },
      { nameRu: 'Люстра традиционная',           category: 'lighting',    widthCm: 80,  depthCm: 80,  heightCm: 60,  priceDirams: 95_000_00,  quantity: 1 },
      { nameRu: 'Занавески абровые',             category: 'textile',     widthCm: 150, depthCm: 5,   heightCm: 270, priceDirams: 45_000_00,  quantity: 4 },
    ],
    MODERN_DUSHANBE: [
      { nameRu: 'Диван угловой',                category: 'seating',     widthCm: 280, depthCm: 165, heightCm: 85,  priceDirams: 580_000_00, quantity: 1, isKeypiece: true },
      { nameRu: 'Кресло',                        category: 'seating',     widthCm: 90,  depthCm: 90,  heightCm: 85,  priceDirams: 120_000_00, quantity: 2 },
      { nameRu: 'Журнальный стол',               category: 'table',       widthCm: 120, depthCm: 60,  heightCm: 42,  priceDirams: 85_000_00,  quantity: 1 },
      { nameRu: 'ТВ-тумба 180см',               category: 'storage',     widthCm: 180, depthCm: 40,  heightCm: 50,  priceDirams: 145_000_00, quantity: 1 },
      { nameRu: 'Ковёр геометрический 2×3м',    category: 'textile',     widthCm: 200, depthCm: 300, heightCm: 1,   priceDirams: 95_000_00,  quantity: 1 },
      { nameRu: 'Светодиодная люстра',           category: 'lighting',    widthCm: 60,  depthCm: 60,  heightCm: 30,  priceDirams: 65_000_00,  quantity: 1 },
    ],
    ISLAMIC_GEOMETRIC: [
      { nameRu: 'Диван с аркой (мусульм.)',      category: 'seating',     widthCm: 260, depthCm: 100, heightCm: 95,  priceDirams: 640_000_00, quantity: 1, isKeypiece: true },
      { nameRu: 'Мозаичный стол (зелян/синий)',  category: 'table',       widthCm: 80,  depthCm: 80,  heightCm: 50,  priceDirams: 180_000_00, quantity: 1, isKeypiece: true },
      { nameRu: 'Ширма машрабия',               category: 'decor',       widthCm: 120, depthCm: 5,   heightCm: 200, priceDirams: 95_000_00,  quantity: 1 },
      { nameRu: 'Латунный фонарь × 3',          category: 'lighting',    widthCm: 30,  depthCm: 30,  heightCm: 50,  priceDirams: 42_000_00,  quantity: 3 },
      { nameRu: 'Ковёр с медальоном',           category: 'textile',     widthCm: 240, depthCm: 340, heightCm: 1,   priceDirams: 320_000_00, quantity: 1 },
    ],
    MINIMALIST: [
      { nameRu: 'Диван 3-мест. (серый)',         category: 'seating',     widthCm: 220, depthCm: 90,  heightCm: 75,  priceDirams: 420_000_00, quantity: 1, isKeypiece: true },
      { nameRu: 'Кофейный стол (дерево)',        category: 'table',       widthCm: 100, depthCm: 50,  heightCm: 40,  priceDirams: 68_000_00,  quantity: 1 },
      { nameRu: 'Открытый стеллаж',             category: 'storage',     widthCm: 120, depthCm: 30,  heightCm: 180, priceDirams: 95_000_00,  quantity: 1 },
      { nameRu: 'Торшер напольный',             category: 'lighting',    widthCm: 35,  depthCm: 35,  heightCm: 160, priceDirams: 48_000_00,  quantity: 1 },
    ],
    ECLECTIC_TJ: [
      { nameRu: 'Диван (ткань икат)',            category: 'seating',     widthCm: 240, depthCm: 95,  heightCm: 85,  priceDirams: 560_000_00, quantity: 1, isKeypiece: true },
      { nameRu: 'Резная тумба-сайдборд',        category: 'storage',     widthCm: 160, depthCm: 45,  heightCm: 90,  priceDirams: 245_000_00, quantity: 1 },
      { nameRu: 'Кувшины латунные × 2',         category: 'decor',       widthCm: 25,  depthCm: 25,  heightCm: 50,  priceDirams: 28_000_00,  quantity: 2 },
      { nameRu: 'Подушки сюзане × 4',          category: 'textile',     widthCm: 45,  depthCm: 45,  heightCm: 10,  priceDirams: 18_000_00,  quantity: 4 },
    ],
  },

  // Other room types abbreviated — use same pattern
  bedroom: {
    TRADITIONAL_TJ: [
      { nameRu: 'Кровать 2-сп. с резьбой',   category: 'bed',     widthCm: 180, depthCm: 200, heightCm: 120, priceDirams: 480_000_00, quantity: 1, isKeypiece: true },
      { nameRu: 'Шкаф-купе',                 category: 'storage', widthCm: 200, depthCm: 60,  heightCm: 220, priceDirams: 320_000_00, quantity: 1 },
      { nameRu: 'Тумбочка × 2',              category: 'storage', widthCm: 50,  depthCm: 40,  heightCm: 55,  priceDirams: 35_000_00,  quantity: 2 },
      { nameRu: 'Қолин прикроватный',        category: 'textile', widthCm: 80,  depthCm: 150, heightCm: 1,   priceDirams: 45_000_00,  quantity: 2 },
    ],
    MODERN_DUSHANBE: [
      { nameRu: 'Кровать с мягким изголовьем',category: 'bed',     widthCm: 180, depthCm: 200, heightCm: 100, priceDirams: 380_000_00, quantity: 1, isKeypiece: true },
      { nameRu: 'Шкаф-купе с зеркалом',      category: 'storage', widthCm: 240, depthCm: 60,  heightCm: 220, priceDirams: 280_000_00, quantity: 1 },
      { nameRu: 'Тумбочка × 2',              category: 'storage', widthCm: 50,  depthCm: 40,  heightCm: 55,  priceDirams: 28_000_00,  quantity: 2 },
      { nameRu: 'Комод 6 ящиков',            category: 'storage', widthCm: 100, depthCm: 45,  heightCm: 90,  priceDirams: 95_000_00,  quantity: 1 },
    ],
    MINIMALIST: [
      { nameRu: 'Кровать платформа (дуб)',    category: 'bed',     widthCm: 180, depthCm: 200, heightCm: 35,  priceDirams: 290_000_00, quantity: 1, isKeypiece: true },
      { nameRu: 'Тумбочка × 2',              category: 'storage', widthCm: 45,  depthCm: 35,  heightCm: 50,  priceDirams: 22_000_00,  quantity: 2 },
    ],
    ISLAMIC_GEOMETRIC: [
      { nameRu: 'Кровать с мозаич. изголовьем',category:'bed',    widthCm: 180, depthCm: 200, heightCm: 120, priceDirams: 520_000_00, quantity: 1, isKeypiece: true },
      { nameRu: 'Шкаф с арочными дверьми',   category: 'storage', widthCm: 180, depthCm: 55,  heightCm: 220, priceDirams: 380_000_00, quantity: 1 },
    ],
    ECLECTIC_TJ: [
      { nameRu: 'Кровать с иkat-изголовьем', category: 'bed',     widthCm: 180, depthCm: 200, heightCm: 110, priceDirams: 450_000_00, quantity: 1, isKeypiece: true },
      { nameRu: 'Шкаф с резным карнизом',    category: 'storage', widthCm: 200, depthCm: 60,  heightCm: 220, priceDirams: 310_000_00, quantity: 1 },
    ],
  },
};
```

---

## Product Matching (Meilisearch)

```ts
import { meili } from '@/lib/meilisearch';

interface MatchedProduct {
  productId: string;
  nameRu: string;
  priceDirams: number;
  imageUrl: string;
  score: number;
  inStock: boolean;
}

export async function matchItemToProduct(
  item: DesignItem,
  styleKey: DesignStyleKey,
  maxBudgetDirams: number
): Promise<MatchedProduct[]> {
  const query = `${item.nameRu} ${item.category}`;

  const filters: string[] = [
    `priceDirams <= ${maxBudgetDirams}`,
    `inStock = true`,
  ];

  // Style-specific category filter
  if (styleKey === 'TRADITIONAL_TJ') {
    filters.push(`tags IN [традиционный, деревянный, ганч, резьба]`);
  }

  const result = await meili.index('products').search(query, {
    limit: 5,
    filter: filters,
    sort: ['priceDirams:asc'],
  });

  return result.hits.map(h => ({
    productId: h.id,
    nameRu: h.nameRu,
    priceDirams: h.priceDirams,
    imageUrl: h.images?.[0] ?? '',
    score: h._rankingScore ?? 1,
    inStock: h.inStock,
  }));
}
```

---

## Budget Calculator

```ts
import { formatSomoni } from '@/lib/pricing';

export interface BudgetBreakdown {
  furniture: number;
  textiles: number;
  lighting: number;
  decor: number;
  installation: number;
  contingency: number;      // 10% buffer
  total: number;
}

export function calcRoomBudget(items: DesignItem[]): BudgetBreakdown {
  const sum = (cat: DesignItemCategory[]) =>
    items
      .filter(i => cat.includes(i.category))
      .reduce((acc, i) => acc + Number(i.priceDirams) * i.quantity, 0);

  const furniture    = sum(['seating', 'bed', 'storage', 'table', 'kitchen', 'bathroom', 'traditional']);
  const textiles     = sum(['textile']);
  const lighting     = sum(['lighting']);
  const decor        = sum(['decor', 'appliance']);
  const subtotal     = furniture + textiles + lighting + decor;
  const installation = Math.round(subtotal * 0.12); // 12% монтаж
  const contingency  = Math.round(subtotal * 0.10); // 10% резерв
  const total        = subtotal + installation + contingency;

  return { furniture, textiles, lighting, decor, installation, contingency, total };
}

export function formatBudget(dirams: number): string {
  if (dirams >= 100_000_000) {
    return `${(dirams / 100_000_00).toFixed(1)} тыс. сом.`;
  }
  return formatSomoni(dirams);
}
```

---

## Moodboard Generator

```tsx
// components/interior-designer/Moodboard.tsx
'use client';

import Image from 'next/image';
import type { DesignRoom, ColorPalette } from '@/types/interior-designer';

interface MoodboardProps {
  room: DesignRoom;
  items: { nameRu: string; imageUrl: string; isKeypiece: boolean }[];
  palette: ColorPalette;
}

export function Moodboard({ room, items, palette }: MoodboardProps) {
  const keypieces = items.filter(i => i.isKeypiece);
  const supporting = items.filter(i => !i.isKeypiece).slice(0, 6);

  return (
    <div className="rounded-2xl overflow-hidden bg-white shadow-lg">
      {/* Header */}
      <div
        className="px-6 py-4"
        style={{ backgroundColor: palette.primary, color: palette.textOnBg }}
      >
        <h2 className="text-xl font-semibold">{room.nameRu}</h2>
        <p className="text-sm opacity-80">{DESIGN_STYLES[room.styleKey as DesignStyleKey]?.nameRu}</p>
      </div>

      {/* Color swatches */}
      <div className="flex h-8">
        {[palette.primary, palette.secondary, palette.accent, palette.neutral, palette.background]
          .map((c, i) => (
            <div key={i} className="flex-1" style={{ backgroundColor: c }} title={c} />
          ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-neutral-100">
        {/* Keypiece(s) take 2/3 width */}
        {keypieces[0] && (
          <div className="col-span-2 row-span-2 relative aspect-square">
            <Image src={keypieces[0].imageUrl} alt={keypieces[0].nameRu} fill className="object-cover rounded-md" />
            <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
              {keypieces[0].nameRu}
            </span>
          </div>
        )}

        {/* Supporting items */}
        {supporting.map(item => (
          <div key={item.nameRu} className="relative aspect-square">
            <Image src={item.imageUrl} alt={item.nameRu} fill className="object-cover rounded-md" />
          </div>
        ))}
      </div>

      {/* Budget summary */}
      <div className="px-4 py-3 flex items-center justify-between text-sm">
        <span className="text-neutral-500">Бюджет комнаты</span>
        <span className="font-bold text-neutral-900">{formatBudget(room.budgetDirams)}</span>
      </div>
    </div>
  );
}
```

---

## Design Wizard (3-Step)

```tsx
// Step 1: Style + Budget
// Step 2: Room priorities
// Step 3: Moodboard + Shop the look

const WIZARD_STEPS = [
  {
    id: 'style',
    titleRu: 'Выберите стиль',
    component: 'StylePicker',
  },
  {
    id: 'budget',
    titleRu: 'Бюджет и приоритеты',
    component: 'BudgetAllocator',
  },
  {
    id: 'moodboard',
    titleRu: 'Ваш дизайн',
    component: 'MoodboardResult',
  },
];

// StylePicker — cards with palette preview + TJ style name
// BudgetAllocator — slider for total, sliders per room (pre-filled by allocateBudget())
// MoodboardResult — Moodboard grid + "Добавить всё в корзину" button
```

---

## "Shop the Look" — Add All to Cart

```ts
export async function shopTheLook(designProjectId: string, userId: string): Promise<{
  added: number;
  totalDirams: number;
  unavailable: string[];
}> {
  const project = await prisma.designProject.findUnique({
    where: { id: designProjectId },
    include: { rooms: { include: { furniture: true } } },
  });
  if (!project) throw new Error('Design project not found');

  const allItems = project.rooms.flatMap(r => r.furniture).filter(i => i.productId);
  const unavailable: string[] = [];
  let added = 0;
  let totalDirams = 0n;

  await prisma.$transaction(async tx => {
    for (const item of allItems) {
      if (!item.productId) continue;

      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: { id: true, priceDirams: true, inventory: true },
      });

      if (!product || product.inventory.available < item.quantity) {
        unavailable.push(item.nameRu);
        continue;
      }

      await tx.cartItem.upsert({
        where: { userId_productId: { userId, productId: item.productId } },
        update: { quantity: { increment: item.quantity } },
        create: { userId, productId: item.productId, quantity: item.quantity },
      });

      added++;
      totalDirams += product.priceDirams * BigInt(item.quantity);
    }
  });

  return { added, totalDirams: Number(totalDirams), unavailable };
}
```

---

## Push to 3D Planner

```ts
export async function applyDesignToScene3D(
  designProjectId: string,
  scene3dId: string
): Promise<void> {
  const project = await prisma.designProject.findUnique({
    where: { id: designProjectId },
    include: { rooms: { include: { furniture: true } } },
  });
  if (!project) return;

  // Build furniture3d items for Scene3D store
  const furniture3d = project.rooms.flatMap(room =>
    room.furniture
      .filter(i => FURNITURE_3D_CATALOG[i.category])
      .map(i => ({
        id: i.id,
        catalogKey: i.category,
        gltfUrl: FURNITURE_3D_CATALOG[i.category]?.gltfUrl ?? '',
        positionX: i.positionX,
        positionZ: i.positionY,
        rotationY: (i.rotationDeg * Math.PI) / 180,
        scale: 1.0,
      }))
  );

  // Build room material overrides
  const roomOverrides: Record<string, any> = {};
  for (const room of project.rooms) {
    roomOverrides[room.roomId] = {
      roomId: room.roomId,
      floorMaterialId: room.floorMaterialId,
      wallMaterialId: room.wallMaterialId,
      ceilingStyleId: room.ceilingStyleId,
    };
  }

  await prisma.scene3D.update({
    where: { id: scene3dId },
    data: { furniture3d: furniture3d as any, roomOverrides: roomOverrides as any },
  });
}
```

---

## API Routes

```
GET  /api/design?projectId=:id         — list design projects
POST /api/design                        — create design project
GET  /api/design/:id                    — load full project with rooms
PUT  /api/design/:id                    — save project
POST /api/design/:id/generate           — auto-generate all rooms from style + budget
POST /api/design/:id/shop-the-look      — add all items to cart
POST /api/design/:id/apply-to-3d        — push materials + furniture to Scene3D
GET  /api/design/styles                 — list DESIGN_STYLES
GET  /api/design/templates/:roomType    — list furniture templates for room type
```

---

## Key Rules

1. **Меҳмонхона first** — always allocate 30%+ budget and render it first in the wizard.
2. **Integer dirams only** — `priceDirams` is `BigInt` in Prisma, never store as float.
3. **Contingency +10%** always added — TJ projects routinely run over budget (import delays, customs).
4. **Installation +12%** line item — most buyers need full-service delivery + assembly.
5. **Seismic anchoring note** in every design report: "Тяжёлые предметы закрепить на анкерных болтах (сейсм. зона 8)".
6. **Mobile moodboard** — `grid-cols-2` on screens < 640px, `grid-cols-3` on desktop.
7. **Currency display** — always in сомонӣ (сом), never dirams to end user; use `formatSomoni()`.
8. **Stock check before** "Shop the Look" — skip unavailable items, report them to user.
9. **WCAG AA** — `textOnBg` auto-computed with `wcagContrast ≥ 4.5` for all palette variants.
10. **Sync direction** — Design → 3D Planner (push materials/furniture); 2D Planner → Design (pull room areas for budget calc).
