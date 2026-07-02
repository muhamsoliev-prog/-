# BIM Agent

## Trigger
`/bim-agent`

## Role
Building Information Modeling specialist for the Tajikistan marketplace. Covers BIM data structures, IFC file processing, web-based 3D viewer (Three.js/WebGL), automated material takeoff linked to marketplace products, structural compliance with Tajik/Soviet SNiP norms, clash detection, and BIM-driven construction phase tracking.

---

## BIM in Tajikistan Context

- Design professionals use AutoCAD + ZWCAD (Russian alternative) + Revit — all three common
- Soviet-era **СНиП** (СНиП = Строительные нормы и правила) are still the legal baseline, supplemented by Tajik national standards
- Seismic design is governed by **СНиП II-7-81*** (Строительство в сейсмических районах)
- Most buildings are designed by local firms in 2D AutoCAD; BIM adoption is early-stage
- Web BIM viewer strategy: convert IFC → glTF → render with Three.js (no desktop plugin required)
- Primary audience on marketplace: small contractors and self-builders needing takeoff lists, NOT full enterprise BIM

---

## BIM Standards Reference

| Standard | Scope | Relevance |
|----------|-------|-----------|
| IFC 4.x | Open BIM format | Import/export |
| СНиП II-7-81* | Seismic construction | Mandatory for TJ |
| СНиП 2.01.07-85* | Loads and effects | Structural calc |
| СНиП 23-01-99* | Construction climatology | Climate data |
| СНиП 2.08.01-89* | Residential buildings | Floor heights, room sizes |
| ГОСТ 21.201-2011 | Construction drawings | Drawing standard |
| LOD 100–400 | Level of Development | Model maturity |

---

## Database Schema

```prisma
model BimModel {
  id            String   @id @default(cuid())
  projectId     String   // linked to HouseProject
  userId        String
  nameRu        String
  version       Int      @default(1)
  status        String   @default("uploading")
  // uploading → processing → ready | error

  // Source file
  sourceFormat  String   // ifc | dwg | rvt | fbx | gltf
  sourceFileKey String   // S3/CDN object key
  fileSizeMb    Float?

  // Processed outputs
  gltfFileKey   String?  // web viewer format
  thumbnailKey  String?
  boundingBox   Json?    // { minX, minY, minZ, maxX, maxY, maxZ }

  // Building metadata extracted from IFC
  buildingName  String?
  buildingType  String?  // residential | commercial | industrial
  grossAreaM2   Float?
  floors        Int?
  heightM       Float?
  seismicZone   Int?     // 7 | 8 | 9

  elements      BimElement[]
  takeoffs      BimTakeoff[]
  clashReports  ClashReport[]
  phases        BimPhase[]
  project       HouseProject @relation(fields: [projectId], references: [id])
  user          User         @relation(fields: [userId], references: [id])
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  @@index([projectId])
  @@index([userId])
}

model BimElement {
  id            String  @id @default(cuid())
  modelId       String
  ifcGuid       String  // GlobalId from IFC
  ifcType       String  // IfcWall | IfcSlab | IfcColumn | IfcBeam | IfcDoor | IfcWindow...
  nameRu        String?
  floorNo       Int?
  phaseId       String?

  // Geometry (simplified bounding box for quick queries)
  minX Float?; minY Float?; minZ Float?
  maxX Float?; maxY Float?; maxZ Float?
  volumeM3      Float?
  areaM2        Float?
  lengthM       Float?

  // Material assignment
  materialNameRu String?
  linkedProductId String? // marketplace product

  // IFC properties (JSON blob)
  properties    Json?

  model         BimModel   @relation(fields: [modelId], references: [id])
  linkedProduct Product?   @relation(fields: [linkedProductId], references: [id])
  phase         BimPhase?  @relation(fields: [phaseId], references: [id])
  clashItems    ClashItem[]
  @@unique([modelId, ifcGuid])
  @@index([modelId, ifcType])
}

model BimTakeoff {
  id            String  @id @default(cuid())
  modelId       String
  ifcType       String
  nameRu        String
  unit          String  // м² | м³ | шт | п.м | кг
  quantity      Float
  wasteCoeff    Float   @default(1.1)
  netQuantity   Float
  linkedProductId String?
  priceAmount   Int?    // dirams
  totalAmount   Int?    // dirams
  model         BimModel @relation(fields: [modelId], references: [id])
  linkedProduct Product? @relation(fields: [linkedProductId], references: [id])
  @@index([modelId])
}

model ClashReport {
  id          String   @id @default(cuid())
  modelId     String
  totalClashes Int     @default(0)
  hardClashes  Int     @default(0)  // solid geometry overlap
  softClashes  Int     @default(0)  // clearance violation
  status       String  @default("open")  // open | in_review | resolved
  model        BimModel  @relation(fields: [modelId], references: [id])
  items        ClashItem[]
  createdAt    DateTime @default(now())
}

model ClashItem {
  id            String  @id @default(cuid())
  reportId      String
  element1Id    String
  element2Id    String
  type          String  // hard | soft
  severity      String  // critical | major | minor
  descriptionRu String
  status        String  @default("open")
  resolvedById  String?
  report        ClashReport @relation(fields: [reportId], references: [id])
  element1      BimElement  @relation("Clash1", fields: [element1Id], references: [id])
  element2      BimElement  @relation("Clash2", fields: [element2Id], references: [id])
}

model BimPhase {
  id          String   @id @default(cuid())
  modelId     String
  nameRu      String   // "Фундамент" | "Каркас" | "Кровля" | "Отделка"
  orderNo     Int
  plannedStart DateTime?
  plannedEnd   DateTime?
  actualStart  DateTime?
  actualEnd    DateTime?
  status       String   @default("pending")
  // pending → in_progress → completed | blocked
  completionPct Float   @default(0)
  elements     BimElement[]
  model        BimModel @relation(fields: [modelId], references: [id])
}
```

---

## IFC Processing Pipeline

```typescript
// src/services/bim/ifc-processor.ts
// Runs as BullMQ worker after file upload

import * as WebIFC from 'web-ifc';

interface ProcessedIFC {
  metadata: BuildingMetadata;
  elements: ExtractedElement[];
  takeoffs: TakeoffItem[];
}

interface BuildingMetadata {
  name: string;
  type: string;
  grossAreaM2: number;
  floors: number;
  heightM: number;
}

interface ExtractedElement {
  ifcGuid: string;
  ifcType: string;
  nameRu: string;
  floorNo: number;
  volumeM3?: number;
  areaM2?: number;
  lengthM?: number;
  materialName?: string;
  properties: Record<string, unknown>;
}

async function processIFCFile(filePath: string): Promise<ProcessedIFC> {
  const ifcApi = new WebIFC.IfcAPI();
  await ifcApi.Init();

  const buffer = await fs.readFile(filePath);
  const modelId = ifcApi.OpenModel(new Uint8Array(buffer));

  const metadata = extractBuildingMetadata(ifcApi, modelId);
  const elements = extractElements(ifcApi, modelId);
  const takeoffs = generateTakeoffs(elements);

  ifcApi.CloseModel(modelId);

  return { metadata, elements, takeoffs };
}

function extractElements(ifcApi: WebIFC.IfcAPI, modelId: number): ExtractedElement[] {
  const TARGET_TYPES = [
    WebIFC.IFCWALL, WebIFC.IFCWALLSTANDARDCASE,
    WebIFC.IFCSLAB, WebIFC.IFCCOLUMN, WebIFC.IFCBEAM,
    WebIFC.IFCDOOR, WebIFC.IFCWINDOW, WebIFC.IFCROOF,
    WebIFC.IFCSTAIR, WebIFC.IFCFURNISHINGELEMENT,
    WebIFC.IFCPIPESEGMENT, WebIFC.IFCCABLESEGMENT,
  ];

  const elements: ExtractedElement[] = [];

  for (const ifcType of TARGET_TYPES) {
    const ids = ifcApi.GetAllItemsOfType(modelId, ifcType, false);
    for (const id of ids) {
      const element = ifcApi.GetLine(modelId, id);
      const geometry = extractGeometry(ifcApi, modelId, id);
      const props = extractProperties(ifcApi, modelId, id);

      elements.push({
        ifcGuid: element.GlobalId?.value ?? '',
        ifcType: ifcType.toString(),
        nameRu: translateIfcType(ifcType),
        floorNo: extractFloorNumber(ifcApi, modelId, id),
        volumeM3: geometry.volumeM3,
        areaM2: geometry.areaM2,
        lengthM: geometry.lengthM,
        materialName: extractMaterialName(ifcApi, modelId, id),
        properties: props,
      });
    }
  }

  return elements;
}

const IFC_TYPE_NAMES_RU: Record<number, string> = {
  [WebIFC.IFCWALL]:               'Стена',
  [WebIFC.IFCWALLSTANDARDCASE]:   'Стена (стандарт)',
  [WebIFC.IFCSLAB]:               'Перекрытие/плита',
  [WebIFC.IFCCOLUMN]:             'Колонна',
  [WebIFC.IFCBEAM]:               'Балка',
  [WebIFC.IFCDOOR]:               'Дверь',
  [WebIFC.IFCWINDOW]:             'Окно',
  [WebIFC.IFCROOF]:               'Кровля',
  [WebIFC.IFCSTAIR]:              'Лестница',
  [WebIFC.IFCFURNISHINGELEMENT]:  'Мебель',
  [WebIFC.IFCPIPESEGMENT]:        'Труба',
  [WebIFC.IFCCABLESEGMENT]:       'Кабель',
};
const translateIfcType = (t: number) => IFC_TYPE_NAMES_RU[t] ?? 'Элемент';
```

---

## Automated Material Takeoff

```typescript
// Generate takeoff quantities from IFC elements
function generateTakeoffs(elements: ExtractedElement[]): TakeoffItem[] {
  const groups = new Map<string, { name: string; unit: string; qty: number }>();

  for (const el of elements) {
    switch (el.ifcType) {
      case 'IFCWALL':
      case 'IFCWALLSTANDARDCASE':
        if (el.areaM2) {
          // Brick walls: calculate bricks from volume
          if (el.materialName?.toLowerCase().includes('кирпич')) {
            const bricksPerM2 = 51; // standard 1.5-brick wall
            acc(groups, 'brick', 'Кирпич красный рядовой', 'шт', el.areaM2 * bricksPerM2);
          }
          // Plaster both sides
          acc(groups, 'plaster', 'Штукатурная смесь', 'мешок', el.areaM2 * 2 * 0.15);
        }
        break;

      case 'IFCSLAB':
        if (el.areaM2) {
          acc(groups, 'concrete_slab', 'Бетон М250 (перекрытие)', 'м³', el.areaM2 * 0.2);
          acc(groups, 'rebar_slab', 'Арматура ø12мм', 'кг', el.areaM2 * 12);
        }
        break;

      case 'IFCCOLUMN':
        if (el.volumeM3) {
          acc(groups, 'concrete_col', 'Бетон М300 (колонны)', 'м³', el.volumeM3);
          acc(groups, 'rebar_col', 'Арматура ø14мм (колонны)', 'кг', el.volumeM3 * 120);
        }
        break;

      case 'IFCDOOR':
        acc(groups, 'door', 'Дверь межкомнатная', 'шт', 1);
        break;

      case 'IFCWINDOW':
        acc(groups, 'window', 'Окно ПВХ двухкамерное', 'шт', 1);
        break;

      case 'IFCROOF':
        if (el.areaM2) {
          acc(groups, 'waterproof', 'Гидроизоляция кровельная', 'м²', el.areaM2);
          acc(groups, 'insulation', 'Утеплитель пенопласт 100мм', 'м²', el.areaM2);
        }
        break;

      case 'IFCPIPESEGMENT':
        if (el.lengthM) {
          acc(groups, 'pipe_ppr', 'Труба ПП-Р 25мм', 'п.м', el.lengthM);
        }
        break;
    }
  }

  // Apply waste coefficients
  const WASTE: Record<string, number> = {
    brick: 1.08, plaster: 1.10, concrete_slab: 1.05,
    rebar_slab: 1.05, concrete_col: 1.03, rebar_col: 1.05,
    waterproof: 1.15, insulation: 1.10, pipe_ppr: 1.12,
    door: 1.0, window: 1.0,
  };

  return Array.from(groups.entries()).map(([key, v]) => ({
    key,
    nameRu: v.name,
    unit: v.unit,
    quantity: Math.round(v.qty * 10) / 10,
    wasteCoeff: WASTE[key] ?? 1.10,
    netQuantity: Math.ceil(v.qty * (WASTE[key] ?? 1.10)),
  }));
}

function acc(
  map: Map<string, { name: string; unit: string; qty: number }>,
  key: string, name: string, unit: string, qty: number
) {
  const existing = map.get(key);
  if (existing) existing.qty += qty;
  else map.set(key, { name, unit, qty });
}
```

---

## Marketplace Product Matching

```typescript
// Auto-match BIM takeoff items to marketplace products
async function matchTakeoffToProducts(modelId: string): Promise<void> {
  const takeoffs = await prisma.bimTakeoff.findMany({
    where: { modelId, linkedProductId: null },
  });

  for (const takeoff of takeoffs) {
    // Search Meilisearch for best matching product
    const results = await meili.index('products').search(takeoff.nameRu, {
      limit: 1,
      filter: ['status = active', 'stockQty > 0'],
      attributesToRetrieve: ['id', 'name', 'priceAmount', 'unit'],
    });

    if (results.hits.length === 0) continue;

    const product = results.hits[0];
    const totalAmount = Math.round(takeoff.netQuantity * (product.priceAmount ?? 0));

    await prisma.bimTakeoff.update({
      where: { id: takeoff.id },
      data: {
        linkedProductId: product.id,
        priceAmount: product.priceAmount,
        totalAmount,
      },
    });
  }
}

// Add entire BIM takeoff to cart
async function addBimTakeoffToCart(modelId: string, userId: string): Promise<void> {
  const takeoffs = await prisma.bimTakeoff.findMany({
    where: { modelId, linkedProductId: { not: null } },
    include: { linkedProduct: true },
  });

  for (const t of takeoffs) {
    if (!t.linkedProductId) continue;

    // Check stock
    const stock = await prisma.product.findUnique({
      where: { id: t.linkedProductId },
      select: { physicalStock: true, reservedQty: true },
    });
    const available = (stock?.physicalStock ?? 0) - (stock?.reservedQty ?? 0);
    const qty = Math.min(t.netQuantity, available);
    if (qty <= 0) continue;

    await cartService.upsertItem(userId, t.linkedProductId, Math.ceil(qty));
  }
}
```

---

## Clash Detection (Simple AABB)

```typescript
// Axis-Aligned Bounding Box clash detection
// Runs server-side after IFC processing

interface BBox {
  minX: number; minY: number; minZ: number;
  maxX: number; maxY: number; maxZ: number;
}

function boxesOverlap(a: BBox, b: BBox): boolean {
  return (
    a.minX < b.maxX && a.maxX > b.minX &&
    a.minY < b.maxY && a.maxY > b.minY &&
    a.minZ < b.maxZ && a.maxZ > b.minZ
  );
}

function clearanceViolation(a: BBox, b: BBox, minGapM: number): boolean {
  const expanded: BBox = {
    minX: a.minX - minGapM, minY: a.minY - minGapM, minZ: a.minZ - minGapM,
    maxX: a.maxX + minGapM, maxY: a.maxY + minGapM, maxZ: a.maxZ + minGapM,
  };
  return boxesOverlap(expanded, b) && !boxesOverlap(a, b);
}

async function runClashDetection(modelId: string): Promise<ClashReport> {
  const elements = await prisma.bimElement.findMany({
    where: { modelId },
    select: {
      id: true, ifcType: true,
      minX: true, minY: true, minZ: true,
      maxX: true, maxY: true, maxZ: true,
    },
  });

  // Filter out elements without geometry
  const withGeom = elements.filter(
    e => e.minX != null && e.maxX != null
  ) as (typeof elements[0] & BBox)[];

  const clashes: { e1: string; e2: string; type: 'hard' | 'soft'; severity: string; desc: string }[] = [];

  for (let i = 0; i < withGeom.length; i++) {
    for (let j = i + 1; j < withGeom.length; j++) {
      const a = withGeom[i], b = withGeom[j];

      if (boxesOverlap(a, b)) {
        // Hard clash: structural vs. MEP is critical
        const isCritical =
          (isStructural(a.ifcType) && isMEP(b.ifcType)) ||
          (isStructural(b.ifcType) && isMEP(a.ifcType));
        clashes.push({
          e1: a.id, e2: b.id,
          type: 'hard',
          severity: isCritical ? 'critical' : 'major',
          desc: `Пересечение: ${translateIfcTypeStr(a.ifcType)} и ${translateIfcTypeStr(b.ifcType)}`,
        });
      } else if (clearanceViolation(a, b, 0.05)) {
        // Soft clash: 50mm clearance
        clashes.push({
          e1: a.id, e2: b.id,
          type: 'soft',
          severity: 'minor',
          desc: `Нарушение зазора 50мм: ${translateIfcTypeStr(a.ifcType)} и ${translateIfcTypeStr(b.ifcType)}`,
        });
      }
    }
  }

  const report = await prisma.clashReport.create({
    data: {
      modelId,
      totalClashes: clashes.length,
      hardClashes: clashes.filter(c => c.type === 'hard').length,
      softClashes: clashes.filter(c => c.type === 'soft').length,
      items: {
        create: clashes.map(c => ({
          element1Id: c.e1, element2Id: c.e2,
          type: c.type, severity: c.severity,
          descriptionRu: c.desc,
        })),
      },
    },
  });

  return report;
}

function isStructural(ifcType: string) {
  return ['IFCWALL', 'IFCCOLUMN', 'IFCBEAM', 'IFCSLAB'].some(t => ifcType.includes(t));
}
function isMEP(ifcType: string) {
  return ['IFCPIPE', 'IFCCABLE', 'IFCDUCT', 'IFCFLOWSEGMENT'].some(t => ifcType.includes(t));
}
function translateIfcTypeStr(t: string) {
  const m: Record<string, string> = {
    IFCWALL: 'Стена', IFCCOLUMN: 'Колонна', IFCBEAM: 'Балка',
    IFCSLAB: 'Перекрытие', IFCDOOR: 'Дверь', IFCWINDOW: 'Окно',
    IFCPIPESEGMENT: 'Труба', IFCCABLESEGMENT: 'Кабель',
  };
  return m[t] ?? t;
}
```

---

## SNiP Compliance Checks

```typescript
// Automated checks against Tajikistan-applicable SNiP norms
interface ComplianceIssue {
  rule: string;
  severity: 'error' | 'warning';
  element?: string;
  messageRu: string;
}

async function runSnipCompliance(modelId: string): Promise<ComplianceIssue[]> {
  const model = await prisma.bimModel.findUnique({
    where: { id: modelId },
    include: { elements: true },
  });
  if (!model) return [];

  const issues: ComplianceIssue[] = [];

  // СНиП 2.08.01-89: Minimum room heights
  const FLOOR_HEIGHT_MIN_M = 2.7; // residential minimum
  for (const el of model.elements.filter(e => e.ifcType === 'IFCSLAB')) {
    const height = (el.maxZ ?? 0) - (el.minZ ?? 0);
    if (height > 0 && height < FLOOR_HEIGHT_MIN_M) {
      issues.push({
        rule: 'СНиП 2.08.01-89 п.1.1',
        severity: 'error',
        element: el.ifcGuid,
        messageRu: `Высота этажа ${height.toFixed(2)} м меньше минимальной ${FLOOR_HEIGHT_MIN_M} м`,
      });
    }
  }

  // СНиП II-7-81*: Seismic zone foundation depth
  if (model.seismicZone && model.seismicZone >= 8) {
    const foundationSlabs = model.elements.filter(e =>
      e.ifcType === 'IFCSLAB' && (e.minZ ?? 0) < -0.5
    );
    if (foundationSlabs.length === 0) {
      issues.push({
        rule: 'СНиП II-7-81* п.4.2',
        severity: 'warning',
        messageRu: `Сейсмозона ${model.seismicZone}: необходим непрерывный фундамент (рекомендована монолитная плита)`,
      });
    }
  }

  // СНиП 23-01-99*: Climate-based insulation (GBAO)
  if (model.seismicZone === 9) {
    const wallInsulation = model.elements.find(e =>
      e.materialName?.toLowerCase().includes('утеплитель')
    );
    if (!wallInsulation) {
      issues.push({
        rule: 'СНиП 23-02-2003 п.5.1',
        severity: 'warning',
        messageRu: 'Горный климат: необходимо предусмотреть утепление стен (λ ≤ 0.05 Вт/(м·К))',
      });
    }
  }

  // Minimum room areas (СНиП 2.08.01-89)
  const ROOM_MIN_AREA: Record<string, number> = {
    IFCSPACE_LIVING:   12, // гостиная
    IFCSPACE_BEDROOM:   8, // спальня
    IFCSPACE_KITCHEN:   6, // кухня
    IFCSPACE_BATHROOM:  2.7,
  };
  for (const el of model.elements.filter(e => e.ifcType.startsWith('IFCSPACE'))) {
    const minArea = ROOM_MIN_AREA[el.ifcType];
    if (minArea && el.areaM2 && el.areaM2 < minArea) {
      issues.push({
        rule: 'СНиП 2.08.01-89 Приложение 3',
        severity: 'error',
        element: el.ifcGuid,
        messageRu: `Площадь помещения (${el.areaM2.toFixed(1)} м²) меньше нормативной ${minArea} м²`,
      });
    }
  }

  return issues;
}
```

---

## Web 3D Viewer (Three.js)

```tsx
// components/bim/BimViewer.tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

interface BimViewerProps {
  gltfUrl: string;
  onElementSelect?: (ifcGuid: string) => void;
  highlightGuids?: string[];  // for clash visualization
}

export function BimViewer({ gltfUrl, onElementSelect, highlightGuids = [] }: BimViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(10, 20, 10);
    sun.castShadow = true;
    scene.add(ambient, sun);

    // Grid helper
    const grid = new THREE.GridHelper(50, 50, 0xbbbbbb, 0xdddddd);
    scene.add(grid);

    const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    camera.position.set(20, 15, 20);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Load model
    const loader = new GLTFLoader();
    loader.load(gltfUrl, (gltf) => {
      const model = gltf.scene;

      // Apply highlight to clashing elements
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const guid = child.userData.ifcGuid as string | undefined;
          if (guid && highlightGuids.includes(guid)) {
            child.material = new THREE.MeshStandardMaterial({
              color: 0xff3333, transparent: true, opacity: 0.8,
            });
          }
        }
      });

      scene.add(model);
      setLoading(false);

      // Center camera on model
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      controls.target.copy(center);
      camera.position.set(center.x + size.x, center.y + size.y, center.z + size.z);
    });

    // Click to select element
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(scene.children, true);
      if (hits.length > 0) {
        const guid = hits[0].object.userData.ifcGuid as string | undefined;
        if (guid) onElementSelect?.(guid);
      }
    });

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const resizeObs = new ResizeObserver(() => {
      renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    });
    resizeObs.observe(canvas);

    return () => {
      cancelAnimationFrame(animId);
      resizeObs.disconnect();
      renderer.dispose();
    };
  }, [gltfUrl, highlightGuids]);

  return (
    <div className="relative h-[500px] w-full overflow-hidden rounded-xl border bg-gray-50">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-sm text-muted-foreground">Загрузка модели...</div>
        </div>
      )}
      <canvas ref={canvasRef} className="h-full w-full" />
      <ViewerToolbar />
    </div>
  );
}

function ViewerToolbar() {
  return (
    <div className="absolute right-3 top-3 flex flex-col gap-1">
      {[
        { title: 'Сверху', icon: '⬆' },
        { title: 'Спереди', icon: '▶' },
        { title: 'Изометрия', icon: '◆' },
      ].map(btn => (
        <button key={btn.title} title={btn.title}
          className="flex h-8 w-8 items-center justify-center rounded border bg-white text-xs shadow hover:bg-gray-50">
          {btn.icon}
        </button>
      ))}
    </div>
  );
}
```

---

## BIM Upload Flow (IFC → glTF)

```typescript
// BullMQ worker: src/workers/bim-processor.worker.ts
import { Worker } from 'bullmq';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const worker = new Worker('bim-processing', async (job) => {
  const { modelId, sourceFileKey } = job.data;

  await prisma.bimModel.update({ where: { id: modelId }, data: { status: 'processing' } });

  try {
    // 1. Download IFC from S3
    const localIfc = `/tmp/${modelId}.ifc`;
    await downloadFromS3(sourceFileKey, localIfc);

    // 2. Convert IFC → glTF using IfcConvert (IfcOpenShell)
    // IfcConvert is a C++ CLI tool — pre-installed on worker server
    const localGltf = `/tmp/${modelId}.gltf`;
    await execAsync(
      `IfcConvert "${localIfc}" "${localGltf}" --use-element-guids --unicode escape`,
      { timeout: 120_000 }
    );

    // 3. Extract metadata & elements from IFC using web-ifc
    const { metadata, elements, takeoffs } = await processIFCFile(localIfc);

    // 4. Upload glTF to CDN
    const gltfKey = `bim/${modelId}/model.gltf`;
    await uploadToS3(localGltf, gltfKey);

    // 5. Generate thumbnail (headless Chromium screenshot of viewer)
    const thumbKey = await generateThumbnail(modelId, gltfKey);

    // 6. Save everything to DB
    await prisma.$transaction([
      prisma.bimModel.update({
        where: { id: modelId },
        data: {
          status: 'ready',
          gltfFileKey: gltfKey,
          thumbnailKey: thumbKey,
          grossAreaM2: metadata.grossAreaM2,
          floors: metadata.floors,
          heightM: metadata.heightM,
          buildingName: metadata.name,
        },
      }),
      ...elements.map(el =>
        prisma.bimElement.create({
          data: { modelId, ...el },
        })
      ),
      ...takeoffs.map(t =>
        prisma.bimTakeoff.create({
          data: { modelId, ...t },
        })
      ),
    ]);

    // 7. Auto-match takeoff to marketplace products
    await matchTakeoffToProducts(modelId);

    // 8. Run clash detection
    await runClashDetection(modelId);

    // 9. Run SNiP compliance
    const issues = await runSnipCompliance(modelId);
    if (issues.filter(i => i.severity === 'error').length > 0) {
      // notify user
      await notificationQueue.add('bim-compliance', { modelId, issues });
    }

  } catch (err) {
    await prisma.bimModel.update({
      where: { id: modelId },
      data: { status: 'error' },
    });
    throw err;
  }
}, { connection: redis, concurrency: 2 });
```

---

## Construction Phase Tracker

```tsx
// components/bim/PhaseTracker.tsx
const PHASE_ORDER = [
  { key: 'site_prep',    nameRu: 'Подготовка площадки' },
  { key: 'foundation',   nameRu: 'Фундамент' },
  { key: 'frame',        nameRu: 'Каркас и стены' },
  { key: 'roof',         nameRu: 'Кровля' },
  { key: 'mep_rough',    nameRu: 'Сети (черновые)' },
  { key: 'insulation',   nameRu: 'Утепление' },
  { key: 'finishing',    nameRu: 'Отделка' },
  { key: 'mep_finish',   nameRu: 'Сети (чистовые)' },
  { key: 'landscaping',  nameRu: 'Благоустройство' },
];

function PhaseTracker({ phases }: { phases: BimPhase[] }) {
  return (
    <ol className="space-y-2">
      {PHASE_ORDER.map((def, i) => {
        const phase = phases.find(p => p.nameRu === def.nameRu);
        const status = phase?.status ?? 'pending';
        const pct = phase?.completionPct ?? 0;

        return (
          <li key={def.key} className="flex items-center gap-3">
            <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold
              ${status === 'completed'   ? 'bg-green-500 text-white' :
                status === 'in_progress' ? 'bg-blue-500 text-white' :
                status === 'blocked'     ? 'bg-red-400 text-white' :
                'bg-gray-200 text-gray-500'}`}>
              {i + 1}
            </span>
            <div className="flex-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{def.nameRu}</span>
                <span className="text-muted-foreground">{pct}%</span>
              </div>
              <div className="mt-0.5 h-1.5 rounded-full bg-gray-100">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    status === 'completed' ? 'bg-green-500' :
                    status === 'blocked'   ? 'bg-red-400' : 'bg-blue-500'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
```

---

## API Routes

```typescript
// src/api/v1/bim/routes.ts
const router = Router();

// Models
router.post('/models/upload-url', requireAuth, bimController.getUploadUrl);
router.post('/models', requireAuth, bimController.createModel);
router.get('/models/:id', requireAuth, bimController.getModel);
router.get('/models/:id/elements', requireAuth, bimController.listElements);
router.get('/models/:id/takeoff', requireAuth, bimController.getTakeoff);
router.post('/models/:id/takeoff/add-to-cart', requireAuth, bimController.addTakeoffToCart);
router.get('/models/:id/clashes', requireAuth, bimController.getClashReport);
router.patch('/models/:id/clashes/:clashId/resolve', requireAuth, bimController.resolveClash);
router.get('/models/:id/compliance', requireAuth, bimController.getComplianceReport);
router.get('/models/:id/phases', requireAuth, bimController.getPhases);
router.patch('/models/:id/phases/:phaseId', requireAuth, bimController.updatePhase);

// Link marketplace products to BIM elements
router.patch('/models/:id/elements/:elementId/link-product', requireAuth, bimController.linkProduct);

export default router;
```

---

## Checklist

- [ ] IFC processing runs in BullMQ worker (never in HTTP request — files are large)
- [ ] glTF stored on CDN (S3), not DB — only `gltfFileKey` in DB
- [ ] IfcConvert CLI must be pre-installed on worker server (`apt install ifcopenshell` or build from source)
- [ ] Clash detection uses AABB — acceptable for takeoff/coordination, not a replacement for full BIM tools
- [ ] SNiP checks are advisory, not blocking — user can override
- [ ] Seismic zone field drives rebar specs AND SNiP compliance rule selection
- [ ] Three.js viewer uses `userData.ifcGuid` on each mesh for click-to-select
- [ ] `matchTakeoffToProducts()` uses Meilisearch, not DB LIKE query (fuzzy matching needed for Russian names)
- [ ] Phase tracker is decoupled from BIM model — can be used even without IFC upload
- [ ] `addBimTakeoffToCart()` respects available stock — never adds more than available
- [ ] Worker concurrency = 2 (IFC processing is CPU-heavy)
- [ ] Thumbnails generated via headless Chromium — screenshot of Three.js scene
- [ ] glTF file size target: < 10MB after Draco compression for web loading
