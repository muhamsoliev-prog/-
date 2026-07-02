# Landscape Designer Agent

## Trigger
`/landscape-designer`

## Role
2D top-down garden and site plan editor for Tajikistan residential plots. Covers plant placement, хавз (traditional pool) and фаввора (fountain), drip irrigation routing, hardscape (paths, walls, pergola), lighting zones, and a plant care calendar — all adapted to TJ climate zones and local nursery availability.

---

## Tajikistan Landscape Context

| Context | Detail |
|---|---|
| Climate | Hot-dry continental: Dushanbe avg 37°C July, −2°C Jan; GBAO alpine |
| Water scarcity | Drip irrigation default; ariq (арык) channels in rural areas |
| Traditional elements | Хавз (reflecting pool), чилхона (summer pavilion), тор (grape trellis) |
| Most common fruit trees | Гранат (pomegranate), анжир (fig), тут (mulberry), ток (grape vine) |
| Common ornamentals | Роза (rose), магнолия, платан (oriental plane), кипарис (cypress) |
| Hardscape materials | Local limestone, river pebble, fired brick, concrete pavers |
| Plot sizes | Urban Dushanbe: 3–8 sotka (300–800 m²); rural: 10–30 sotka |
| Area unit | 1 sotka = 100 m²; display in sotka + m² |
| Seismic note | Garden walls > 80 cm need footings to -80 cm (zone 8) |
| Nurseries | Botanical Garden Dushanbe, Гулзор nursery, seasonal bazaar plants |

---

## Coordinate System

Same logical **cm units** as 2D Planner. All element positions are integer cm.

```ts
const CM_TO_M  = 0.01;
const M2_TO_SOTKA = 0.01; // 1 sotka = 100 m²

function areaCm2ToSotka(cm2: number): number {
  return cm2 / 1_000_000; // cm² → m² → sotka
}
```

---

## Data Interfaces

```ts
interface SitePlan {
  id: string;
  projectId: string;
  houseProjectId?: string;    // linked HouseProject for building footprint
  plotWidthCm: number;
  plotDepthCm: number;
  north: number;              // degrees from top (0 = north up)
  climateZone: ClimateZone;
  elements: LandscapeElement[];
  irrigationLines: IrrigationLine[];
  lightingZones: LightingZone[];
  createdAt: Date;
  updatedAt: Date;
}

type ClimateZone = 'dushanbe' | 'khatlon' | 'sugd' | 'rasht' | 'gbao';

type ElementType =
  // Plants
  | 'tree_fruit' | 'tree_ornamental' | 'shrub' | 'rose' | 'vine'
  | 'grass_lawn' | 'grass_ornamental' | 'ground_cover' | 'annual' | 'perennial'
  // Hardscape
  | 'path' | 'patio' | 'steps' | 'wall' | 'fence'
  // Water features
  | 'havz' | 'fountain' | 'ariq' | 'well'
  // Structures
  | 'chilhona' | 'pergola' | 'greenhouse' | 'shed'
  // Utilities
  | 'gate' | 'garage' | 'parking'
  // Building
  | 'building_footprint';

interface LandscapeElement {
  id: string;
  type: ElementType;
  plantKey?: string;           // key into PLANT_CATALOG
  hardscapeKey?: string;       // key into HARDSCAPE_CATALOG
  x: number;                   // cm, centre of element
  y: number;
  widthCm: number;             // bounding box
  depthCm: number;
  rotationDeg: number;
  canopyRadiusCm?: number;     // trees: display circle
  materialId?: string;
  colorHex: string;
  labelRu: string;
  quantity: number;            // for batch-placed identical elements
  priceDirams: number;         // per unit purchase price
  notes: string;
}

interface IrrigationLine {
  id: string;
  points: { x: number; y: number }[]; // polyline in cm
  type: 'main' | 'drip' | 'sprinkler' | 'ariq';
  diameterMm: number;
  flowLitresPerHour: number;
  zoneId: string;
}

interface LightingZone {
  id: string;
  nameRu: string;
  fixtures: LightingFixture[];
  scheduleOn: string;          // "20:00"
  scheduleOff: string;         // "23:00"
}

interface LightingFixture {
  id: string;
  x: number; y: number;
  type: 'path_light' | 'spot' | 'bollard' | 'string_lights' | 'underwater';
  wattage: number;
  colorTemp: 2700 | 3000 | 4000;
  priceDirams: number;
}
```

---

## Prisma Schema

```prisma
model SitePlan {
  id             String              @id @default(cuid())
  projectId      String
  houseProjectId String?
  plotWidthCm    Int
  plotDepthCm    Int
  north          Int                 @default(0)
  climateZone    String              @default("dushanbe")
  elements       LandscapeElement[]
  irrigationLines Json               @default("[]")
  lightingZones   Json               @default("[]")
  createdAt      DateTime            @default(now())
  updatedAt      DateTime            @updatedAt

  @@index([projectId])
}

model LandscapeElement {
  id             String   @id @default(cuid())
  sitePlanId     String
  sitePlan       SitePlan @relation(fields: [sitePlanId], references: [id], onDelete: Cascade)
  type           String
  plantKey       String?
  hardscapeKey   String?
  x              Int
  y              Int
  widthCm        Int
  depthCm        Int
  rotationDeg    Int      @default(0)
  canopyRadiusCm Int?
  colorHex       String   @default("#4a7c3f")
  labelRu        String
  quantity       Int      @default(1)
  priceDirams    BigInt   @default(0)
  notes          String   @default("")

  @@index([sitePlanId])
}
```

---

## Plant Catalog (TJ-relevant)

```ts
export interface Plant {
  key: string;
  nameRu: string;
  nameTj: string;
  nameLatin: string;
  type: ElementType;
  matureHeightM: number;
  matureSpreadM: number;       // canopy diameter at maturity
  spacingM: number;            // min spacing between plants
  waterNeedLDay: number;       // litres/day in summer peak
  sunRequirement: 'full' | 'partial' | 'shade';
  soilPH: [number, number];    // acceptable range
  bloomMonths: number[];       // 1–12
  fruitMonths: number[];
  droughtTolerant: boolean;
  seismicNote?: string;
  climateZones: ClimateZone[];
  colorHex: string;            // top-down plan symbol colour
  symbolShape: 'circle' | 'star' | 'oval';
  priceDirams: number;         // typical nursery price per plant
  careCalendar: CareTask[];
}

export interface CareTask {
  month: number;
  taskRu: string;
}

export const PLANT_CATALOG: Record<string, Plant> = {

  // Fruit trees
  pomegranate: {
    key: 'pomegranate', nameRu: 'Гранат',       nameTj: 'Анор',      nameLatin: 'Punica granatum',
    type: 'tree_fruit', matureHeightM: 4, matureSpreadM: 3, spacingM: 3,
    waterNeedLDay: 12, sunRequirement: 'full', soilPH: [5.5, 7.0],
    bloomMonths: [5,6], fruitMonths: [9,10,11], droughtTolerant: true,
    climateZones: ['dushanbe','khatlon','sugd'],
    colorHex: '#8b0000', symbolShape: 'circle', priceDirams: 25_000_00,
    careCalendar: [
      { month: 2,  taskRu: 'Обрезка до набухания почек' },
      { month: 3,  taskRu: 'Подкормка аммиачной селитрой (20г/куст)' },
      { month: 5,  taskRu: 'Полив 2×/неделю, мульчирование' },
      { month: 9,  taskRu: 'Сбор урожая при растрескивании кожуры' },
      { month: 11, taskRu: 'Побелка ствола известью' },
    ],
  },

  fig: {
    key: 'fig', nameRu: 'Инжир (анжир)',  nameTj: 'Анҷир',    nameLatin: 'Ficus carica',
    type: 'tree_fruit', matureHeightM: 5, matureSpreadM: 4, spacingM: 4,
    waterNeedLDay: 15, sunRequirement: 'full', soilPH: [6.0, 7.5],
    bloomMonths: [], fruitMonths: [7,8,9], droughtTolerant: true,
    climateZones: ['dushanbe','khatlon'],
    colorHex: '#5a7a3a', symbolShape: 'circle', priceDirams: 18_000_00,
    careCalendar: [
      { month: 3,  taskRu: 'Санитарная обрезка' },
      { month: 6,  taskRu: 'Полив 3×/неделю, плодоношение' },
      { month: 8,  taskRu: 'Сбор урожая 2-й волны' },
      { month: 12, taskRu: 'Укрытие молодых растений от мороза' },
    ],
  },

  mulberry_white: {
    key: 'mulberry_white', nameRu: 'Тут белый',  nameTj: 'Тути сафед', nameLatin: 'Morus alba',
    type: 'tree_fruit', matureHeightM: 8, matureSpreadM: 6, spacingM: 5,
    waterNeedLDay: 20, sunRequirement: 'full', soilPH: [5.5, 7.0],
    bloomMonths: [4], fruitMonths: [6,7], droughtTolerant: false,
    climateZones: ['dushanbe','khatlon','sugd','rasht'],
    colorHex: '#2d6a2d', symbolShape: 'circle', priceDirams: 15_000_00,
    careCalendar: [
      { month: 2,  taskRu: 'Формирующая обрезка' },
      { month: 6,  taskRu: 'Сбор урожая (постилать ткань под деревом)' },
      { month: 9,  taskRu: 'Подкормка фосфором' },
    ],
  },

  grape_vine: {
    key: 'grape_vine', nameRu: 'Виноград (ток)', nameTj: 'Ток',       nameLatin: 'Vitis vinifera',
    type: 'vine', matureHeightM: 3, matureSpreadM: 5, spacingM: 2,
    waterNeedLDay: 10, sunRequirement: 'full', soilPH: [6.0, 7.0],
    bloomMonths: [5], fruitMonths: [8,9,10], droughtTolerant: false,
    climateZones: ['dushanbe','khatlon','sugd'],
    colorHex: '#6b3a9c', symbolShape: 'oval', priceDirams: 8_000_00,
    careCalendar: [
      { month: 2,  taskRu: 'Обрезка до набухания почек — главное мероприятие' },
      { month: 4,  taskRu: 'Подвязка молодых побегов на шпалеру' },
      { month: 6,  taskRu: 'Нормировка гроздей, удаление пасынков' },
      { month: 8,  taskRu: 'Сбор урожая столовых сортов' },
      { month: 11, taskRu: 'Снятие с шпалеры, укрытие лозы в траншею' },
    ],
  },

  apricot: {
    key: 'apricot', nameRu: 'Абрикос (зардолу)', nameTj: 'Зардолу', nameLatin: 'Prunus armeniaca',
    type: 'tree_fruit', matureHeightM: 6, matureSpreadM: 5, spacingM: 5,
    waterNeedLDay: 18, sunRequirement: 'full', soilPH: [6.0, 7.5],
    bloomMonths: [3,4], fruitMonths: [6,7], droughtTolerant: false,
    climateZones: ['dushanbe','khatlon','sugd','gbao'],
    colorHex: '#c47c3a', symbolShape: 'circle', priceDirams: 12_000_00,
    careCalendar: [
      { month: 3,  taskRu: 'Цветение — НЕ обрезать в это время' },
      { month: 4,  taskRu: 'Обработка от монилиоза после цветения' },
      { month: 6,  taskRu: 'Сбор урожая, не тяните — осыплется' },
      { month: 8,  taskRu: 'Подкормка калием после сбора' },
    ],
  },

  // Ornamental trees
  plane_tree: {
    key: 'plane_tree', nameRu: 'Платан восточный', nameTj: 'Чинор', nameLatin: 'Platanus orientalis',
    type: 'tree_ornamental', matureHeightM: 20, matureSpreadM: 15, spacingM: 8,
    waterNeedLDay: 40, sunRequirement: 'full', soilPH: [5.0, 7.5],
    bloomMonths: [4], fruitMonths: [], droughtTolerant: false,
    climateZones: ['dushanbe','khatlon','sugd'],
    colorHex: '#3d6b3d', symbolShape: 'circle', priceDirams: 45_000_00,
    careCalendar: [
      { month: 2, taskRu: 'Формирующая обрезка молодых деревьев' },
      { month: 5, taskRu: 'Полив 2×/неделю — влаголюбив' },
    ],
  },

  cypress: {
    key: 'cypress', nameRu: 'Кипарис пирамидальный', nameTj: 'Сарв', nameLatin: 'Cupressus sempervirens',
    type: 'tree_ornamental', matureHeightM: 15, matureSpreadM: 2, spacingM: 2,
    waterNeedLDay: 8, sunRequirement: 'full', soilPH: [6.0, 8.0],
    bloomMonths: [], fruitMonths: [], droughtTolerant: true,
    climateZones: ['dushanbe','khatlon'],
    colorHex: '#1a4a1a', symbolShape: 'oval', priceDirams: 22_000_00,
    careCalendar: [
      { month: 3, taskRu: 'Стрижка для поддержания формы' },
      { month: 7, taskRu: 'Полив 1×/неделю в жару' },
    ],
  },

  // Shrubs & flowers
  rose: {
    key: 'rose', nameRu: 'Роза чайно-гибридная', nameTj: 'Гули садбарг', nameLatin: 'Rosa hybrida',
    type: 'rose', matureHeightM: 1.2, matureSpreadM: 0.8, spacingM: 0.6,
    waterNeedLDay: 3, sunRequirement: 'full', soilPH: [6.0, 6.5],
    bloomMonths: [5,6,7,8,9,10], fruitMonths: [], droughtTolerant: false,
    climateZones: ['dushanbe','khatlon','sugd'],
    colorHex: '#c0392b', symbolShape: 'circle', priceDirams: 4_500_00,
    careCalendar: [
      { month: 3,  taskRu: 'Весенняя обрезка на 3–5 почку' },
      { month: 4,  taskRu: 'Подкормка азотом, первая обработка от тли' },
      { month: 6,  taskRu: 'Дедхединг после первой волны цветения' },
      { month: 11, taskRu: 'Укрытие лапником или агроволокном' },
    ],
  },

  oleander: {
    key: 'oleander', nameRu: 'Олеандр', nameTj: 'Хандарон', nameLatin: 'Nerium oleander',
    type: 'shrub', matureHeightM: 3, matureSpreadM: 2, spacingM: 1.5,
    waterNeedLDay: 5, sunRequirement: 'full', soilPH: [6.0, 7.5],
    bloomMonths: [6,7,8,9], fruitMonths: [], droughtTolerant: true,
    climateZones: ['dushanbe','khatlon'],
    colorHex: '#e74c8b', symbolShape: 'circle', priceDirams: 6_000_00,
    careCalendar: [
      { month: 3,  taskRu: 'Обрезка на треть после зимы' },
      { month: 7,  taskRu: 'Цветение — полив умеренный (яд! не есть)' },
    ],
  },

  // Ground covers
  lawn_tall_fescue: {
    key: 'lawn_tall_fescue', nameRu: 'Газон (овсяница высокая)', nameTj: 'Алаф',
    nameLatin: 'Festuca arundinacea',
    type: 'grass_lawn', matureHeightM: 0.05, matureSpreadM: 0, spacingM: 0,
    waterNeedLDay: 4, sunRequirement: 'full', soilPH: [5.5, 7.0], // per m²
    bloomMonths: [], fruitMonths: [], droughtTolerant: false,
    climateZones: ['dushanbe','khatlon','sugd'],
    colorHex: '#4caf50', symbolShape: 'circle', priceDirams: 2_500_00, // per m² seeding
    careCalendar: [
      { month: 3,  taskRu: 'Посев / вертикуттирование' },
      { month: 4,  taskRu: 'Первый покос при 8 см' },
      { month: 6,  taskRu: 'Полив 1×/день в жару (рано утром)' },
      { month: 9,  taskRu: 'Подкормка фосфором, аэрация' },
      { month: 11, taskRu: 'Последний покос перед зимой' },
    ],
  },
};
```

---

## Hardscape Catalog

```ts
export const HARDSCAPE_CATALOG = {
  // Paving
  limestone_path: {
    key: 'limestone_path', nameRu: 'Известняк местный (дорожка)',
    priceDiramPerM2: 28_000_00, colorHex: '#d4c5a9', thicknessCm: 5,
    notes: 'Местный таджикский известняк, нескользкий',
  },
  concrete_paver: {
    key: 'concrete_paver', nameRu: 'Тротуарная плитка бетонная',
    priceDiramPerM2: 18_000_00, colorHex: '#b0b0b0', thicknessCm: 6,
  },
  river_pebble: {
    key: 'river_pebble', nameRu: 'Галька речная (декор)',
    priceDiramPerM2: 12_000_00, colorHex: '#8a8a8a', thicknessCm: 8,
  },
  fired_brick: {
    key: 'fired_brick', nameRu: 'Кирпич обожжённый (дорожка)',
    priceDiramPerM2: 22_000_00, colorHex: '#b5471b', thicknessCm: 6,
  },

  // Structures
  havz: {
    key: 'havz', nameRu: 'Хавз (бассейн-отражатель)',
    priceDiramPerM2: 95_000_00, colorHex: '#1a6ea0', thicknessCm: 0,
    notes: 'Традиционный квадратный хавз. Глубина 60 см. Облицовка плиткой.',
  },
  fountain: {
    key: 'fountain', nameRu: 'Фаввора (фонтан)',
    priceDiramPerM2: 0, colorHex: '#5ba0d0', thicknessCm: 0,
    priceDiramPerUnit: 180_000_00,
    notes: 'Насос + чаша + форсунки. Минимальный диаметр 100 см.',
  },
  chilhona: {
    key: 'chilhona', nameRu: 'Чилхона (летняя беседка)',
    priceDiramPerM2: 55_000_00, colorHex: '#8b7355', thicknessCm: 0,
    notes: 'Традиционная низкая платформа с крышей от солнца. Такт внутри.',
  },
  pergola: {
    key: 'pergola', nameRu: 'Перголя (под виноград)',
    priceDiramPerM2: 32_000_00, colorHex: '#a0784a', thicknessCm: 0,
    notes: 'Деревянная перголя для ток (виноградная лоза). Стандарт: 3×4 м.',
  },
  garden_wall: {
    key: 'garden_wall', nameRu: 'Садовая стена (кирпич)',
    priceDiramPerM2: 45_000_00, colorHex: '#b5471b', thicknessCm: 25,
    notes: 'Высота > 80 см — требует фундамента -80 см (сейсм. зона 8)',
  },
} as const;
```

---

## Irrigation System

```ts
export interface IrrigationZone {
  id: string;
  nameRu: string;
  type: 'drip' | 'sprinkler' | 'ariq' | 'manual';
  elements: string[];          // LandscapeElement IDs covered
  dailyWaterLitres: number;    // auto-computed from plant needs
  scheduleTimes: string[];     // e.g. ['06:00', '20:00']
  pipesDiameterMm: number;
}

export function calcIrrigationNeeds(elements: LandscapeElement[]): {
  totalDailyLitres: number;
  byZone: { type: ElementType; litres: number; count: number }[];
} {
  const byType = new Map<ElementType, { litres: number; count: number }>();

  for (const el of elements) {
    if (!el.plantKey) continue;
    const plant = PLANT_CATALOG[el.plantKey];
    if (!plant) continue;

    const current = byType.get(el.type) ?? { litres: 0, count: 0 };
    byType.set(el.type, {
      litres: current.litres + plant.waterNeedLDay * el.quantity,
      count:  current.count + el.quantity,
    });
  }

  const byZone = Array.from(byType.entries()).map(([type, v]) => ({ type, ...v }));
  const totalDailyLitres = byZone.reduce((s, z) => s + z.litres, 0);
  return { totalDailyLitres, byZone };
}

// Drip emitter spacing rules
export const DRIP_SPACING: Record<string, number> = {
  tree_fruit:       80,  // cm between emitters
  tree_ornamental:  80,
  shrub:            40,
  rose:             30,
  vine:             50,
  grass_lawn:       30,  // micro-sprinklers
  ground_cover:     25,
};
```

---

## Site Plan Canvas (Konva.js)

```tsx
// components/landscape-designer/SitePlanCanvas.tsx
'use client';

import { Stage, Layer, Rect, Circle, Ellipse, Line, Text, Group } from 'react-konva';
import { useRef, useState, useCallback } from 'react';
import { useSitePlanStore } from '@/stores/site-plan-store';
import { PLANT_CATALOG } from '@/lib/plant-catalog';
import type { LandscapeElement, IrrigationLine } from '@/types/landscape-designer';

const SCALE_PX_PER_CM = 0.35;   // default: 1 cm = 0.35 px (fits 20×30m plot)

function PlantSymbol({ el, scale }: { el: LandscapeElement; scale: number }) {
  const plant = el.plantKey ? PLANT_CATALOG[el.plantKey] : null;
  const rx = (el.widthCm / 2) * scale;
  const ry = (el.depthCm / 2) * scale;
  const canopyR = el.canopyRadiusCm ? el.canopyRadiusCm * scale : rx;

  return (
    <Group x={el.x * scale} y={el.y * scale} rotation={el.rotationDeg}>
      {/* Canopy shadow */}
      {canopyR > 0 && (
        <Circle radius={canopyR} fill={el.colorHex + '33'} stroke={el.colorHex} strokeWidth={1} />
      )}
      {/* Trunk / body */}
      {plant?.symbolShape === 'oval' ? (
        <Ellipse radiusX={rx} radiusY={ry} fill={el.colorHex} />
      ) : (
        <Circle radius={rx} fill={el.colorHex} />
      )}
      {/* Label */}
      <Text
        text={el.labelRu}
        fontSize={Math.max(8, rx * 0.6)}
        fill="#fff"
        align="center"
        offsetX={rx * 0.6}
        offsetY={4}
      />
    </Group>
  );
}

function HardscapeShape({ el, scale }: { el: LandscapeElement; scale: number }) {
  return (
    <Group x={el.x * scale} y={el.y * scale} rotation={el.rotationDeg}>
      <Rect
        x={-el.widthCm / 2 * scale}
        y={-el.depthCm / 2 * scale}
        width={el.widthCm * scale}
        height={el.depthCm * scale}
        fill={el.colorHex + 'cc'}
        stroke={el.colorHex}
        strokeWidth={1.5}
        cornerRadius={el.type === 'havz' ? 4 : 2}
      />
      <Text
        text={el.labelRu}
        fontSize={9}
        fill="#1a1a1a"
        align="center"
        offsetX={20}
        offsetY={4}
      />
    </Group>
  );
}

function IrrigationLayer({ lines, scale }: { lines: IrrigationLine[]; scale: number }) {
  const COLORS = { main: '#1565c0', drip: '#42a5f5', sprinkler: '#81d4fa', ariq: '#4db6ac' };
  return (
    <>
      {lines.map(line => (
        <Line
          key={line.id}
          points={line.points.flatMap(p => [p.x * scale, p.y * scale])}
          stroke={COLORS[line.type] ?? '#1565c0'}
          strokeWidth={line.type === 'main' ? 3 : 1.5}
          dash={line.type === 'drip' ? [4, 4] : undefined}
          opacity={0.7}
        />
      ))}
    </>
  );
}

export function SitePlanCanvas() {
  const plan   = useSitePlanStore(s => s.plan);
  const tool   = useSitePlanStore(s => s.tool);
  const scale  = useSitePlanStore(s => s.scale);
  const [zoom, setZoom] = useState(1);
  const stageRef = useRef<any>(null);

  const W = (plan?.plotWidthCm ?? 2000) * scale * zoom;
  const H = (plan?.plotDepthCm ?? 3000) * scale * zoom;

  if (!plan) return <div className="flex-1 flex items-center justify-center text-neutral-400">Загрузка плана…</div>;

  return (
    <Stage
      ref={stageRef}
      width={W + 80}
      height={H + 80}
      onWheel={e => {
        e.evt.preventDefault();
        setZoom(z => Math.max(0.3, Math.min(4, z - e.evt.deltaY * 0.001)));
      }}
    >
      {/* Grid layer */}
      <Layer>
        <GridLayer widthCm={plan.plotWidthCm} depthCm={plan.plotDepthCm} scale={scale * zoom} />
      </Layer>

      {/* Plot boundary */}
      <Layer>
        <Rect
          x={40} y={40}
          width={plan.plotWidthCm * scale * zoom}
          height={plan.plotDepthCm * scale * zoom}
          fill="#e8f5e9"
          stroke="#2e7d32"
          strokeWidth={2}
        />
      </Layer>

      {/* Irrigation */}
      <Layer opacity={0.6}>
        <IrrigationLayer lines={plan.irrigationLines} scale={scale * zoom} />
      </Layer>

      {/* Hardscape */}
      <Layer>
        {plan.elements
          .filter(el => !['tree_fruit','tree_ornamental','shrub','rose','vine','grass_lawn','grass_ornamental','ground_cover','annual','perennial'].includes(el.type))
          .map(el => <HardscapeShape key={el.id} el={{ ...el, x: el.x + 40 / (scale * zoom), y: el.y + 40 / (scale * zoom) }} scale={scale * zoom} />)}
      </Layer>

      {/* Plants */}
      <Layer>
        {plan.elements
          .filter(el => !!el.plantKey)
          .map(el => <PlantSymbol key={el.id} el={{ ...el, x: el.x + 40 / (scale * zoom), y: el.y + 40 / (scale * zoom) }} scale={scale * zoom} />)}
      </Layer>

      {/* North arrow */}
      <Layer>
        <NorthArrow x={W + 20} y={60} angle={plan.north} />
      </Layer>
    </Stage>
  );
}

function NorthArrow({ x, y, angle }: { x: number; y: number; angle: number }) {
  return (
    <Group x={x} y={y} rotation={angle}>
      <Line points={[0, -18, 0, 18]} stroke="#c62828" strokeWidth={2} />
      <Line points={[0, -18, -6, -6]} stroke="#c62828" strokeWidth={2} />
      <Line points={[0, -18,  6, -6]} stroke="#c62828" strokeWidth={2} />
      <Text text="С" x={-5} y={-30} fontSize={11} fill="#c62828" />
    </Group>
  );
}
```

---

## Zustand Store

```ts
// stores/site-plan-store.ts
import { create } from 'zustand';
import { temporal } from 'zundo';
import type { SitePlan, LandscapeElement, IrrigationLine } from '@/types/landscape-designer';

type Tool = 'select' | 'plant' | 'hardscape' | 'irrigation' | 'lighting' | 'delete' | 'measure';

interface SitePlanStore {
  plan: SitePlan | null;
  tool: Tool;
  selectedElementId: string | null;
  scale: number;               // px per cm
  activePlantKey: string | null;
  activeHardscapeKey: string | null;
  showIrrigation: boolean;
  showLighting: boolean;

  loadPlan: (projectId: string) => Promise<void>;
  addElement: (el: Omit<LandscapeElement, 'id'>) => void;
  moveElement: (id: string, x: number, y: number) => void;
  rotateElement: (id: string, deg: number) => void;
  removeElement: (id: string) => void;
  addIrrigationLine: (line: Omit<IrrigationLine, 'id'>) => void;
  removeIrrigationLine: (id: string) => void;
  setTool: (t: Tool) => void;
  setActivePlant: (key: string | null) => void;
  setActiveHardscape: (key: string | null) => void;
  setScale: (s: number) => void;
  toggleLayer: (layer: 'irrigation' | 'lighting') => void;
  savePlan: () => Promise<void>;
}

export const useSitePlanStore = create<SitePlanStore>()(
  temporal(
    (set, get) => ({
      plan: null,
      tool: 'select',
      selectedElementId: null,
      scale: SCALE_PX_PER_CM,
      activePlantKey: null,
      activeHardscapeKey: null,
      showIrrigation: true,
      showLighting: false,

      loadPlan: async (projectId) => {
        const res = await fetch(`/api/site-plan?projectId=${projectId}`);
        set({ plan: await res.json() });
      },

      addElement: (el) => set(s => ({
        plan: s.plan ? {
          ...s.plan,
          elements: [...s.plan.elements, { ...el, id: crypto.randomUUID() }],
        } : null,
      })),

      moveElement: (id, x, y) => set(s => ({
        plan: s.plan ? {
          ...s.plan,
          elements: s.plan.elements.map(e => e.id === id ? { ...e, x, y } : e),
        } : null,
      })),

      rotateElement: (id, deg) => set(s => ({
        plan: s.plan ? {
          ...s.plan,
          elements: s.plan.elements.map(e => e.id === id ? { ...e, rotationDeg: deg } : e),
        } : null,
      })),

      removeElement: (id) => set(s => ({
        plan: s.plan ? { ...s.plan, elements: s.plan.elements.filter(e => e.id !== id) } : null,
      })),

      addIrrigationLine: (line) => set(s => ({
        plan: s.plan ? {
          ...s.plan,
          irrigationLines: [...s.plan.irrigationLines, { ...line, id: crypto.randomUUID() }],
        } : null,
      })),

      removeIrrigationLine: (id) => set(s => ({
        plan: s.plan ? {
          ...s.plan,
          irrigationLines: s.plan.irrigationLines.filter(l => l.id !== id),
        } : null,
      })),

      setTool: (t) => set({ tool: t }),
      setActivePlant: (key) => set({ activePlantKey: key }),
      setActiveHardscape: (key) => set({ activeHardscapeKey: key }),
      setScale: (s) => set({ scale: s }),
      toggleLayer: (layer) => set(s => ({
        showIrrigation: layer === 'irrigation' ? !s.showIrrigation : s.showIrrigation,
        showLighting:   layer === 'lighting'   ? !s.showLighting   : s.showLighting,
      })),

      savePlan: async () => {
        const { plan } = get();
        if (!plan) return;
        await fetch('/api/site-plan', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(plan),
        });
      },
    }),
    { limit: 50 }
  )
);
```

---

## Budget Calculator

```ts
import { formatSomoni } from '@/lib/pricing';

export interface LandscapeBudget {
  plants: number;
  hardscape: number;
  irrigation: number;
  lighting: number;
  labour: number;
  contingency: number;
  total: number;
}

export function calcLandscapeBudget(plan: SitePlan): LandscapeBudget {
  let plants = 0, hardscape = 0, irrigation = 0, lighting = 0;

  for (const el of plan.elements) {
    const cost = Number(el.priceDirams) * el.quantity;
    if (el.plantKey) plants += cost;
    else hardscape += cost;
  }

  // Irrigation estimate: 200 TJS per m² of planted area
  const plantedAreaCm2 = plan.elements
    .filter(e => e.plantKey)
    .reduce((s, e) => s + e.widthCm * e.depthCm, 0);
  irrigation = Math.round((plantedAreaCm2 / 10_000) * 200_00_00); // 200 TJS/m²

  // Lighting
  for (const zone of plan.lightingZones) {
    for (const fx of zone.fixtures) {
      lighting += Number(fx.priceDirams);
    }
  }

  const subtotal = plants + hardscape + irrigation + lighting;
  const labour = Math.round(subtotal * 0.20);         // 20% монтаж/посадка
  const contingency = Math.round(subtotal * 0.10);    // 10% резерв
  const total = subtotal + labour + contingency;

  return { plants, hardscape, irrigation, lighting, labour, contingency, total };
}
```

---

## Plant Care Calendar

```tsx
// components/landscape-designer/CareCalendar.tsx
'use client';

import type { SitePlan } from '@/types/landscape-designer';
import { PLANT_CATALOG } from '@/lib/plant-catalog';

const MONTHS_RU = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];

export function CareCalendar({ plan }: { plan: SitePlan }) {
  // Gather all tasks by month
  const byMonth: Record<number, { plantNameRu: string; taskRu: string }[]> = {};

  for (const el of plan.elements) {
    if (!el.plantKey) continue;
    const plant = PLANT_CATALOG[el.plantKey];
    if (!plant) continue;
    for (const task of plant.careCalendar) {
      byMonth[task.month] ??= [];
      byMonth[task.month].push({ plantNameRu: plant.nameRu, taskRu: task.taskRu });
    }
  }

  const currentMonth = new Date().getMonth() + 1;

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-2 min-w-max pb-2">
        {MONTHS_RU.map((name, i) => {
          const month = i + 1;
          const tasks = byMonth[month] ?? [];
          const isCurrent = month === currentMonth;
          return (
            <div
              key={month}
              className={`w-40 rounded-lg border p-2 flex-shrink-0 text-xs
                ${isCurrent ? 'border-green-500 bg-green-50' : 'border-neutral-200 bg-white'}`}
            >
              <div className={`font-semibold mb-1 ${isCurrent ? 'text-green-700' : 'text-neutral-600'}`}>
                {name}
              </div>
              {tasks.length === 0 ? (
                <span className="text-neutral-300">—</span>
              ) : (
                <ul className="space-y-1">
                  {tasks.map((t, j) => (
                    <li key={j} className="text-neutral-700">
                      <span className="text-green-600 font-medium">{t.plantNameRu}:</span>{' '}
                      {t.taskRu}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## PDF Export

```ts
import jsPDF from 'jspdf';
import { formatSomoni } from '@/lib/pricing';

export async function exportSitePlanPDF(
  plan: SitePlan,
  stageDataUrl: string,
  projectName: string
): Promise<void> {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();

  // Title
  pdf.setFontSize(16);
  pdf.text(`${projectName} — Ландшафтный план`, 15, 15);
  pdf.setFontSize(9);
  pdf.text(`Участок: ${(plan.plotWidthCm / 100).toFixed(1)}×${(plan.plotDepthCm / 100).toFixed(1)} м  |  ` +
           `${areaCm2ToSotka(plan.plotWidthCm * plan.plotDepthCm).toFixed(2)} соток`, 15, 22);
  pdf.text(new Date().toLocaleDateString('ru-TJ'), pw - 15, 22, { align: 'right' });

  // Site plan image (80% width)
  pdf.addImage(stageDataUrl, 'PNG', 15, 28, pw * 0.65, ph - 45);

  // Plant legend
  const plants = plan.elements.filter(e => e.plantKey);
  const unique = [...new Map(plants.map(p => [p.plantKey, p])).values()];
  const legendX = pw * 0.68;
  pdf.setFontSize(10);
  pdf.text('Список растений', legendX, 32);
  unique.forEach((el, i) => {
    const plant = PLANT_CATALOG[el.plantKey!];
    const qty = plants.filter(p => p.plantKey === el.plantKey).reduce((s, p) => s + p.quantity, 0);
    pdf.setFontSize(8);
    pdf.setFillColor(el.colorHex);
    pdf.circle(legendX + 2, 39 + i * 7, 2, 'F');
    pdf.text(`${plant?.nameRu ?? el.labelRu} × ${qty}`, legendX + 6, 40 + i * 7);
  });

  // Budget
  const budget = calcLandscapeBudget(plan);
  const bY = ph - 40;
  pdf.setFontSize(9);
  pdf.text(`Смета: растения ${formatSomoni(budget.plants)} + благоустройство ${formatSomoni(budget.hardscape)} + монтаж ${formatSomoni(budget.labour)} = ИТОГО ${formatSomoni(budget.total)}`, 15, bY);

  pdf.save(`${projectName}-landscape.pdf`);
}
```

---

## Traditional TJ Garden Templates

```ts
export const TJ_GARDEN_TEMPLATES = {
  classic_dushanbe: {
    nameRu: 'Классический душанбинский двор',
    description: 'Хавз по центру, виноград на перголе, гранат + цветы по периметру',
    elements: [
      { type: 'havz',        widthCm: 300, depthCm: 300, x: 800, y: 800, colorHex: '#1a6ea0', labelRu: 'Хавз' },
      { type: 'pergola',     widthCm: 400, depthCm: 300, x: 400, y: 400, colorHex: '#8b7355', labelRu: 'Перголя (ток)' },
      { type: 'chilhona',    widthCm: 400, depthCm: 300, x: 1400, y: 300, colorHex: '#a07850', labelRu: 'Чилхона' },
      { plantKey: 'grape_vine', quantity: 4, widthCm: 40, depthCm: 40, colorHex: '#6b3a9c', labelRu: 'Ток' },
      { plantKey: 'pomegranate', quantity: 4, widthCm: 60, depthCm: 60, colorHex: '#8b0000', labelRu: 'Анор' },
      { plantKey: 'rose', quantity: 20, widthCm: 25, depthCm: 25, colorHex: '#c0392b', labelRu: 'Роза' },
    ],
  },

  fruit_garden: {
    nameRu: 'Плодовый сад (максимум урожая)',
    description: 'Абрикос, инжир, тут, гранат, виноград на 8 сотках',
    elements: [
      { plantKey: 'apricot',      quantity: 3, widthCm: 70, depthCm: 70 },
      { plantKey: 'fig',          quantity: 2, widthCm: 80, depthCm: 80 },
      { plantKey: 'mulberry_white', quantity: 2, widthCm: 100, depthCm: 100 },
      { plantKey: 'pomegranate',  quantity: 4, widthCm: 60, depthCm: 60 },
      { plantKey: 'grape_vine',   quantity: 8, widthCm: 40, depthCm: 40 },
    ],
  },

  modern_minimal: {
    nameRu: 'Современный минималистичный',
    description: 'Кипарисы-аллея, газон, фонтан, мощёная терраса',
    elements: [
      { type: 'fountain',    widthCm: 150, depthCm: 150, colorHex: '#5ba0d0', labelRu: 'Фаввора' },
      { type: 'concrete_paver', widthCm: 600, depthCm: 300, colorHex: '#b0b0b0', labelRu: 'Терраса' },
      { plantKey: 'cypress',    quantity: 6, widthCm: 30, depthCm: 30 },
      { plantKey: 'lawn_tall_fescue', quantity: 1, widthCm: 1200, depthCm: 1500 },
    ],
  },
};
```

---

## API Routes

```
GET  /api/site-plan?projectId=:id    — load or create site plan
PUT  /api/site-plan                  — save site plan
GET  /api/plants                     — list PLANT_CATALOG
GET  /api/plants/:key                — single plant detail
GET  /api/hardscape                  — list HARDSCAPE_CATALOG
POST /api/site-plan/calc-budget      — calc LandscapeBudget from plan
POST /api/site-plan/calc-irrigation  — calc daily water needs
GET  /api/site-plan/templates        — list TJ_GARDEN_TEMPLATES
POST /api/site-plan/:id/export-pdf   — server-side PDF (returns URL)
POST /api/site-plan/add-to-cart      — add all plants to marketplace cart
```

---

## Key Rules

1. **Хавз центральный** in traditional templates — always a square reflective pool, not round.
2. **Grape vine mandatory** on pergola — виноградная лоза + тор is the most requested TJ garden feature.
3. **Water calc in litres/day** — display to user during drought season (June–August in Dushanbe).
4. **Seismic wall warning** — any `garden_wall` element > 80 cm triggers a UI banner: "Требуется фундамент -80 см".
5. **Plot unit = сотка** — always show m² and sotka together; locals use сотка, not m².
6. **Undo/redo via zundo** — same 50-step limit as 2D/3D planners.
7. **Drip irrigation default** — auto-suggest drip for all non-lawn plants; sprinkler only for lawn areas.
8. **Care calendar highlights current month** in green — mobile users check this most.
9. **North arrow rotatable** — TJ plots often oriented to maximise sun on fruit trees (south-facing).
10. **Integer dirams only** — `priceDirams` always `BigInt` in Prisma; never floats.
