# 3D Planner Agent

## Trigger
`/planner-3d`

## Role
Build and maintain the 3D visualisation layer of the Tajikistan marketplace construction module. Syncs from the 2D Planner floor plan, extrudes walls into full 3D geometry, applies locally-relevant materials, simulates Dushanbe solar position, and enables first-person walkthrough — all in the browser with React Three Fiber.

---

## Stack

| Layer | Library |
|---|---|
| 3D renderer | `@react-three/fiber` (R3F) + `three` |
| Helpers | `@react-three/drei` (OrbitControls, PerspectiveCamera, Environment, useGLTF, Stats) |
| First-person | `PointerLockControls` from drei |
| Sun simulation | `three/examples/jsm/lights/RectAreaLightHelper` + custom solar calc |
| GUI controls | `leva` (runtime panel) |
| Export | `three/examples/jsm/exporters/GLTFExporter` |
| Screenshot | `gl.domElement.toDataURL()` |
| State | Zustand (shared with 2D Planner store) |
| Async jobs | BullMQ `planner-3d` queue (server-side thumbnail renders) |

---

## Coordinate System

- **Same logical cm units as 2D Planner** — all `x/y` coords from `FloorPlan` are cm integers.
- In Three.js: `x → X`, `y → Z` (ground plane), `elevation → Y`.
- Scale: divide cm by 100 → metres (Three.js world units = metres).
- Wall height default: **280 cm** (2.8 m). Ceiling slab: **20 cm**.
- Floor slab offset: **0 Y**. Ground plane at **−20 cm Y** (slab thickness).

```ts
const CM_TO_M = 0.01;

function cmToThree(x: number, y: number): [number, number] {
  return [x * CM_TO_M, y * CM_TO_M]; // returns [threeX, threeZ]
}
```

---

## Data Interfaces

```ts
// Extends 2D Planner types
import type { FloorPlan, Wall, Opening, FurnitureItem } from '@/types/planner-2d';

interface Scene3D {
  id: string;
  projectId: string;
  floorPlanId: string;           // source FloorPlan
  wallHeightCm: number;          // default 280
  floorMaterial: MaterialPreset;
  ceilingMaterial: MaterialPreset;
  exteriorMaterial: MaterialPreset;
  roomOverrides: Record<string, RoomMaterial>; // roomId → per-room material
  furniture3d: Furniture3DItem[];
  lightingPreset: 'day' | 'sunset' | 'night' | 'overcast';
  sunHour: number;               // 0-23, for solar simulation
  enableShadows: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface MaterialPreset {
  id: string;
  nameRu: string;
  nameTj: string;
  category: 'wall' | 'floor' | 'ceiling' | 'exterior';
  colorHex: string;              // fallback when no texture
  textureUrl?: string;           // CDN URL to 512×512 PBR albedo
  roughness: number;             // 0-1
  metalness: number;             // 0-1
  repeatU: number;               // texture tiling
  repeatV: number;
  priceDirams?: number;          // per m² cost for estimate
}

interface RoomMaterial {
  roomId: string;
  floorMaterial: MaterialPreset;
  wallMaterial: MaterialPreset;
  ceilingMaterial: MaterialPreset;
}

interface Furniture3DItem {
  id: string;
  catalogKey: string;            // matches FurnitureItem.type from 2D
  gltfUrl: string;               // CDN URL to .glb model
  positionX: number;             // cm
  positionZ: number;             // cm (= 2D planner Y)
  rotationY: number;             // radians
  scale: number;                 // default 1.0
}

interface RenderJob {
  id: string;
  scene3dId: string;
  type: 'thumbnail' | 'highres';
  status: 'pending' | 'processing' | 'done' | 'failed';
  outputUrl?: string;
  createdAt: Date;
}
```

---

## Prisma Schema

```prisma
model Scene3D {
  id                String          @id @default(cuid())
  projectId         String
  floorPlanId       String
  wallHeightCm      Int             @default(280)
  floorMaterialId   String?
  ceilingMaterialId String?
  exteriorMaterialId String?
  roomOverrides     Json            @default("{}")
  furniture3d       Json            @default("[]")
  lightingPreset    String          @default("day")
  sunHour           Int             @default(12)
  enableShadows     Boolean         @default(true)
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt
  renderJobs        RenderJob[]

  @@index([projectId])
  @@index([floorPlanId])
}

model MaterialPreset {
  id          String   @id @default(cuid())
  nameRu      String
  nameTj      String
  category    String
  colorHex    String
  textureUrl  String?
  roughness   Float    @default(0.8)
  metalness   Float    @default(0.0)
  repeatU     Float    @default(1.0)
  repeatV     Float    @default(1.0)
  priceDirams Int?
  isBuiltin   Boolean  @default(false)
}

model RenderJob {
  id         String   @id @default(cuid())
  scene3dId  String
  scene3d    Scene3D  @relation(fields: [scene3dId], references: [id])
  type       String   @default("thumbnail")
  status     String   @default("pending")
  outputUrl  String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([scene3dId])
}
```

---

## Built-in Material Catalog (TJ-relevant)

```ts
const BUILTIN_MATERIALS: MaterialPreset[] = [
  // Wall materials
  { id: 'brick_red',        nameRu: 'Красный кирпич',    nameTj: 'Хишти сурх',      category: 'wall',     colorHex: '#b5471b', roughness: 0.9, metalness: 0, repeatU: 2, repeatV: 2 },
  { id: 'brick_white',      nameRu: 'Белый кирпич',      nameTj: 'Хишти сафед',     category: 'wall',     colorHex: '#e8e0d5', roughness: 0.85,metalness: 0, repeatU: 2, repeatV: 2 },
  { id: 'plaster_white',    nameRu: 'Белая штукатурка',  nameTj: 'Гач сафед',       category: 'wall',     colorHex: '#f5f3ef', roughness: 0.7, metalness: 0, repeatU: 1, repeatV: 1 },
  { id: 'ganch',            nameRu: 'Ганч (алебастр)',   nameTj: 'Ганч',            category: 'wall',     colorHex: '#f0ece4', roughness: 0.6, metalness: 0, repeatU: 1, repeatV: 1 },
  { id: 'concrete_raw',     nameRu: 'Сырой бетон',       nameTj: 'Бетони хом',      category: 'wall',     colorHex: '#9e9e9e', roughness: 0.95,metalness: 0, repeatU: 1, repeatV: 1 },
  { id: 'tile_wall_white',  nameRu: 'Белая плитка (стена)',nameTj: 'Кошинаи сафед', category: 'wall',     colorHex: '#f8f8f8', roughness: 0.3, metalness: 0.05,repeatU:3, repeatV: 3 },

  // Floor materials
  { id: 'tile_beige',       nameRu: 'Бежевая плитка',    nameTj: 'Кошинаи бежӣ',   category: 'floor',    colorHex: '#d4c5a9', roughness: 0.4, metalness: 0, repeatU: 4, repeatV: 4 },
  { id: 'tile_dark',        nameRu: 'Тёмная плитка',     nameTj: 'Кошинаи торик',   category: 'floor',    colorHex: '#4a4036', roughness: 0.4, metalness: 0, repeatU: 4, repeatV: 4 },
  { id: 'marble_white',     nameRu: 'Белый мрамор',      nameTj: 'Мармари сафед',   category: 'floor',    colorHex: '#f0eeea', roughness: 0.2, metalness: 0, repeatU: 2, repeatV: 2 },
  { id: 'parquet_oak',      nameRu: 'Паркет дуб',        nameTj: 'Паркети дуб',     category: 'floor',    colorHex: '#a0724a', roughness: 0.6, metalness: 0, repeatU: 3, repeatV: 3 },
  { id: 'concrete_floor',   nameRu: 'Бетонный пол',      nameTj: 'Фарши бетонӣ',   category: 'floor',    colorHex: '#b0b0b0', roughness: 0.9, metalness: 0, repeatU: 1, repeatV: 1 },
  { id: 'carpet_grey',      nameRu: 'Серый ковёр',       nameTj: 'Қолини хокистар', category: 'floor',    colorHex: '#9e9e9e', roughness: 1.0, metalness: 0, repeatU: 2, repeatV: 2 },

  // Ceiling
  { id: 'ceiling_white',    nameRu: 'Белый потолок',     nameTj: 'Шифти сафед',     category: 'ceiling',  colorHex: '#ffffff', roughness: 0.7, metalness: 0, repeatU: 1, repeatV: 1 },
  { id: 'ceiling_plaster',  nameRu: 'Штукатурный потолок',nameTj: 'Шифти гачӣ',    category: 'ceiling',  colorHex: '#f5f2ed', roughness: 0.65,metalness: 0, repeatU: 1, repeatV: 1 },

  // Exterior
  { id: 'ext_brick_red',    nameRu: 'Фасад красный кирпич',nameTj: 'Хишти сурх берун',category:'exterior',colorHex: '#b5471b', roughness: 0.9, metalness: 0, repeatU: 3, repeatV: 3 },
  { id: 'ext_plaster_cream',nameRu: 'Кремовая штукатурка',nameTj: 'Гачи кремӣ',    category: 'exterior', colorHex: '#efe0c8', roughness: 0.75,metalness: 0, repeatU: 1, repeatV: 1 },
  { id: 'ext_concrete',     nameRu: 'Бетон фасад',       nameTj: 'Бетони берунӣ',  category: 'exterior', colorHex: '#8a8a8a', roughness: 0.9, metalness: 0, repeatU: 1, repeatV: 1 },
];
```

---

## Wall Geometry Builder

Extrudes each `Wall` from the 2D floor plan into a 3D box, then cuts openings (doors/windows) using CSG subtraction via `three-bvh-csg`.

```ts
import * as THREE from 'three';
import { ADDITION, SUBTRACTION, Evaluator, MeshBVH } from 'three-bvh-csg';

interface WallGeomOptions {
  wall: Wall;
  openings: Opening[];
  heightCm: number;
  material: THREE.Material;
  exteriorMaterial: THREE.Material;
}

function buildWallMesh(opts: WallGeomOptions): THREE.Mesh {
  const { wall, openings, heightCm } = opts;

  const dx = (wall.x2 - wall.x1) * CM_TO_M;
  const dz = (wall.y2 - wall.y1) * CM_TO_M;
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dz, dx);
  const thick = wall.thicknessCm * CM_TO_M;
  const height = heightCm * CM_TO_M;

  // Base wall box
  let wallGeom: THREE.BufferGeometry = new THREE.BoxGeometry(length, height, thick);
  let wallMesh = new THREE.Mesh(wallGeom, opts.material);

  const evaluator = new Evaluator();

  // Cut each opening
  for (const op of openings.filter(o => o.wallId === wall.id)) {
    const opWidth  = op.widthCm  * CM_TO_M;
    const opHeight = op.heightCm * CM_TO_M;
    const opSill   = (op.sillHeightCm ?? 0) * CM_TO_M;
    const opOffset = op.offsetFromStartCm * CM_TO_M;

    const cutGeom = new THREE.BoxGeometry(opWidth + 0.01, opHeight + 0.01, thick + 0.01);
    const cutMesh = new THREE.Mesh(cutGeom);
    cutMesh.position.set(
      opOffset - length / 2 + opWidth / 2,
      opSill + opHeight / 2 - height / 2,
      0
    );
    cutMesh.updateMatrixWorld();
    wallMesh = evaluator.evaluate(wallMesh, cutMesh, SUBTRACTION);
  }

  // Position and rotate in world space
  const cx = ((wall.x1 + wall.x2) / 2) * CM_TO_M;
  const cz = ((wall.y1 + wall.y2) / 2) * CM_TO_M;
  wallMesh.position.set(cx, height / 2, cz);
  wallMesh.rotation.y = -angle;
  wallMesh.castShadow = true;
  wallMesh.receiveShadow = true;

  return wallMesh;
}
```

---

## Floor & Ceiling Planes

```ts
function buildFloorMesh(rooms: Room2D[], material: THREE.Material): THREE.Mesh {
  // One plane per room using ShapeGeometry from room polygon
  const group = new THREE.Group();
  for (const room of rooms) {
    const shape = new THREE.Shape();
    const pts = room.polygon; // { x, y }[] in cm
    shape.moveTo(pts[0].x * CM_TO_M, pts[0].y * CM_TO_M);
    for (let i = 1; i < pts.length; i++) {
      shape.lineTo(pts[i].x * CM_TO_M, pts[i].y * CM_TO_M);
    }
    shape.closePath();

    const geom = new THREE.ShapeGeometry(shape);
    const mesh = new THREE.Mesh(geom, material);
    mesh.rotation.x = -Math.PI / 2; // lay flat on XZ plane
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group as unknown as THREE.Mesh;
}

function buildCeilingMesh(rooms: Room2D[], wallHeightCm: number, material: THREE.Material) {
  const h = wallHeightCm * CM_TO_M;
  const floor = buildFloorMesh(rooms, material);
  floor.position.y = h;
  floor.rotation.x = Math.PI / 2; // flip to face down
  return floor;
}
```

---

## Solar Position — Dushanbe

Dushanbe: latitude **38.56° N**, longitude **68.77° E**.

```ts
const DUSHANBE_LAT_RAD = 38.56 * (Math.PI / 180);
const DUSHANBE_LON_DEG = 68.77;

function sunPosition(dayOfYear: number, hourUTC: number): { azimuth: number; elevation: number } {
  // Simplified solar calculation (Spencer 1971)
  const B = (2 * Math.PI * (dayOfYear - 1)) / 365;
  const decl = 0.006918
    - 0.399912 * Math.cos(B)
    + 0.070257 * Math.sin(B)
    - 0.006758 * Math.cos(2 * B)
    + 0.000907 * Math.sin(2 * B);

  const solarNoon = 12 - DUSHANBE_LON_DEG / 15;
  const H = (hourUTC - solarNoon) * (Math.PI / 12); // hour angle

  const sinAlt =
    Math.sin(DUSHANBE_LAT_RAD) * Math.sin(decl) +
    Math.cos(DUSHANBE_LAT_RAD) * Math.cos(decl) * Math.cos(H);
  const elevation = Math.asin(Math.max(0, sinAlt));

  const cosAz =
    (Math.sin(decl) - Math.sin(DUSHANBE_LAT_RAD) * sinAlt) /
    (Math.cos(DUSHANBE_LAT_RAD) * Math.cos(elevation));
  const azimuth = Math.acos(Math.max(-1, Math.min(1, cosAz)));

  return { azimuth: H > 0 ? 2 * Math.PI - azimuth : azimuth, elevation };
}

function applySunToScene(scene: THREE.Scene, sun: THREE.DirectionalLight, hour: number) {
  const doy = new Date().getMonth() < 6 ? 90 : 270; // rough summer/winter
  const { azimuth, elevation } = sunPosition(doy, hour - 5); // UTC+5

  const dist = 50;
  sun.position.set(
    dist * Math.cos(elevation) * Math.sin(azimuth),
    dist * Math.sin(elevation),
    dist * Math.cos(elevation) * Math.cos(azimuth)
  );
  sun.intensity = elevation > 0 ? Math.sin(elevation) * 2.5 : 0;
}
```

---

## Lighting Presets

```ts
interface LightingPreset {
  ambientIntensity: number;
  ambientColor: string;
  sunIntensity: number;
  sunColor: string;
  fogColor: string;
  fogNear: number;
  fogFar: number;
}

const LIGHTING_PRESETS: Record<string, LightingPreset> = {
  day: {
    ambientIntensity: 0.6, ambientColor: '#fff5e0',
    sunIntensity: 2.5,     sunColor: '#fffbe6',
    fogColor: '#e8f4ff',   fogNear: 40, fogFar: 200,
  },
  sunset: {
    ambientIntensity: 0.3, ambientColor: '#ff9955',
    sunIntensity: 1.5,     sunColor: '#ff6622',
    fogColor: '#ffcc88',   fogNear: 20, fogFar: 80,
  },
  night: {
    ambientIntensity: 0.05,ambientColor: '#1a2040',
    sunIntensity: 0,       sunColor: '#000000',
    fogColor: '#0a0a1a',   fogNear: 10, fogFar: 50,
  },
  overcast: {
    ambientIntensity: 1.2, ambientColor: '#c0d0e0',
    sunIntensity: 0.3,     sunColor: '#ffffff',
    fogColor: '#d0dce8',   fogNear: 30, fogFar: 100,
  },
};
```

---

## Main Scene Component

```tsx
// components/planner-3d/Scene3DCanvas.tsx
'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  OrbitControls, PointerLockControls,
  PerspectiveCamera, Environment, Stats, useGLTF,
} from '@react-three/drei';
import { useControls } from 'leva';
import { Suspense, useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { usePlannerStore } from '@/stores/planner-2d-store';
import { useScene3DStore } from '@/stores/scene-3d-store';
import { buildWallMesh, buildFloorMesh, buildCeilingMesh } from './geometry';
import { applySunToScene, LIGHTING_PRESETS } from './lighting';
import { FurnitureModel } from './FurnitureModel';

function SceneContent() {
  const { scene, gl, camera } = useThree();
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const plan = usePlannerStore(s => s.plan);
  const scene3d = useScene3DStore(s => s.scene3d);
  const mode = useScene3DStore(s => s.viewMode); // 'orbit' | 'walk'

  const { lightingPreset, sunHour } = useControls('Освещение', {
    lightingPreset: { value: scene3d?.lightingPreset ?? 'day', options: ['day', 'sunset', 'night', 'overcast'] },
    sunHour: { value: scene3d?.sunHour ?? 12, min: 0, max: 23, step: 1 },
  });

  const preset = LIGHTING_PRESETS[lightingPreset];

  // Update sun every frame (cheap)
  useFrame(() => {
    if (sunRef.current) {
      applySunToScene(scene, sunRef.current, sunHour);
    }
  });

  // Wall meshes
  const wallMeshes = useMemo(() => {
    if (!plan) return [];
    return plan.walls.map(wall =>
      buildWallMesh({
        wall,
        openings: plan.openings.filter(o => o.wallId === wall.id),
        heightCm: scene3d?.wallHeightCm ?? 280,
        material: new THREE.MeshStandardMaterial({ color: '#e8e0d5', roughness: 0.85 }),
        exteriorMaterial: new THREE.MeshStandardMaterial({ color: '#b5471b', roughness: 0.9 }),
      })
    );
  }, [plan, scene3d?.wallHeightCm]);

  useEffect(() => {
    gl.shadowMap.enabled = scene3d?.enableShadows ?? true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    scene.fog = new THREE.Fog(preset.fogColor, preset.fogNear, preset.fogFar);
  }, [lightingPreset, scene3d?.enableShadows]);

  return (
    <>
      {/* Ambient */}
      <ambientLight intensity={preset.ambientIntensity} color={preset.ambientColor} />

      {/* Sun directional */}
      <directionalLight
        ref={sunRef}
        color={preset.sunColor}
        intensity={preset.sunIntensity}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={100}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />

      {/* Point lights for interior night */}
      {lightingPreset === 'night' && plan?.rooms.map(room => (
        <pointLight
          key={room.id}
          position={[
            ((room.polygon[0].x + room.polygon[2]?.x) / 2 || room.polygon[0].x) * CM_TO_M,
            2.2,
            ((room.polygon[0].y + room.polygon[2]?.y) / 2 || room.polygon[0].y) * CM_TO_M,
          ]}
          intensity={0.8}
          distance={6}
          color="#ffe8b0"
        />
      ))}

      {/* Geometry */}
      {wallMeshes.map((mesh, i) => (
        <primitive key={i} object={mesh} />
      ))}

      {plan && (
        <>
          <primitive object={buildFloorMesh(plan.rooms, new THREE.MeshStandardMaterial({ color: '#d4c5a9', roughness: 0.4 }))} />
          <primitive object={buildCeilingMesh(plan.rooms, scene3d?.wallHeightCm ?? 280, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 }))} />
        </>
      )}

      {/* Flat roof (exterior box) */}
      {plan && <FlatRoof plan={plan} wallHeightCm={scene3d?.wallHeightCm ?? 280} />}

      {/* Furniture */}
      {scene3d?.furniture3d.map(item => (
        <FurnitureModel key={item.id} item={item} />
      ))}

      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#8fae6e" roughness={1} />
      </mesh>

      {/* Controls */}
      {mode === 'orbit' ? (
        <OrbitControls
          target={[0, 1.2, 0]}
          minDistance={1}
          maxDistance={80}
          maxPolarAngle={Math.PI / 2 - 0.05}
          enableDamping
          dampingFactor={0.08}
        />
      ) : (
        <PointerLockControls />
      )}
    </>
  );
}

function FlatRoof({ plan, wallHeightCm }: { plan: FloorPlan; wallHeightCm: number }) {
  // Flat concrete roof 20 cm thick above walls
  const roofY = (wallHeightCm + 10) * CM_TO_M;
  if (!plan.rooms.length) return null;
  // Bounding box of all walls
  const xs = plan.walls.flatMap(w => [w.x1, w.x2]);
  const ys = plan.walls.flatMap(w => [w.y1, w.y2]);
  const minX = Math.min(...xs); const maxX = Math.max(...xs);
  const minY = Math.min(...ys); const maxY = Math.max(...ys);
  const W = (maxX - minX) * CM_TO_M;
  const D = (maxY - minY) * CM_TO_M;

  return (
    <mesh position={[(minX + maxX) / 2 * CM_TO_M, roofY, (minY + maxY) / 2 * CM_TO_M]} castShadow receiveShadow>
      <boxGeometry args={[W + 0.4, 0.20, D + 0.4]} />
      <meshStandardMaterial color="#9e9e9e" roughness={0.95} />
    </mesh>
  );
}

export function Scene3DCanvas() {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 5, 15], fov: 55, near: 0.1, far: 500 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
    >
      <Suspense fallback={null}>
        <SceneContent />
        <Environment preset="city" background={false} />
      </Suspense>
      {process.env.NODE_ENV === 'development' && <Stats />}
    </Canvas>
  );
}
```

---

## Furniture 3D Models

```tsx
// components/planner-3d/FurnitureModel.tsx
import { useGLTF } from '@react-three/drei';
import type { Furniture3DItem } from '@/types/planner-3d';

// Fallback box if GLB not loaded
function FallbackBox({ item }: { item: Furniture3DItem }) {
  return (
    <mesh position={[item.positionX * CM_TO_M, 0.4, item.positionZ * CM_TO_M]}>
      <boxGeometry args={[0.8, 0.8, 0.8]} />
      <meshStandardMaterial color="#aaccee" wireframe />
    </mesh>
  );
}

export function FurnitureModel({ item }: { item: Furniture3DItem }) {
  const { scene } = useGLTF(item.gltfUrl);
  const cloned = scene.clone();

  return (
    <primitive
      object={cloned}
      position={[item.positionX * CM_TO_M, 0, item.positionZ * CM_TO_M]}
      rotation={[0, item.rotationY, 0]}
      scale={item.scale}
    />
  );
}

// 3D furniture catalog — GLB URLs (CDN-hosted low-poly models)
export const FURNITURE_3D_CATALOG: Record<string, { gltfUrl: string; nameRu: string }> = {
  sofa_3:      { nameRu: 'Диван 3-х мест.',  gltfUrl: '/models/furniture/sofa_3.glb' },
  sofa_2:      { nameRu: 'Диван 2-х мест.',  gltfUrl: '/models/furniture/sofa_2.glb' },
  armchair:    { nameRu: 'Кресло',            gltfUrl: '/models/furniture/armchair.glb' },
  tv_unit:     { nameRu: 'Тумба под ТВ',     gltfUrl: '/models/furniture/tv_unit.glb' },
  coffee_table:{ nameRu: 'Журн. стол',       gltfUrl: '/models/furniture/coffee_table.glb' },
  bed_double:  { nameRu: 'Кровать 2-сп.',    gltfUrl: '/models/furniture/bed_double.glb' },
  bed_single:  { nameRu: 'Кровать 1-сп.',    gltfUrl: '/models/furniture/bed_single.glb' },
  wardrobe:    { nameRu: 'Шкаф-купе',        gltfUrl: '/models/furniture/wardrobe.glb' },
  dresser:     { nameRu: 'Комод',            gltfUrl: '/models/furniture/dresser.glb' },
  nightstand:  { nameRu: 'Тумбочка',         gltfUrl: '/models/furniture/nightstand.glb' },
  kitchen_set: { nameRu: 'Кухонный гарнитур',gltfUrl: '/models/furniture/kitchen_set.glb' },
  fridge:      { nameRu: 'Холодильник',      gltfUrl: '/models/furniture/fridge.glb' },
  dining_4:    { nameRu: 'Стол+4 стула',     gltfUrl: '/models/furniture/dining_4.glb' },
  dining_6:    { nameRu: 'Стол+6 стульев',   gltfUrl: '/models/furniture/dining_6.glb' },
  bathtub:     { nameRu: 'Ванна',            gltfUrl: '/models/furniture/bathtub.glb' },
  shower:      { nameRu: 'Душевая',          gltfUrl: '/models/furniture/shower.glb' },
  toilet:      { nameRu: 'Унитаз',           gltfUrl: '/models/furniture/toilet.glb' },
  washbasin:   { nameRu: 'Раковина',         gltfUrl: '/models/furniture/washbasin.glb' },
};
```

---

## Zustand Scene3D Store

```ts
// stores/scene-3d-store.ts
import { create } from 'zustand';
import type { Scene3D, MaterialPreset, Furniture3DItem } from '@/types/planner-3d';

interface Scene3DStore {
  scene3d: Scene3D | null;
  viewMode: 'orbit' | 'walk';
  selectedObjectId: string | null;
  isLoading: boolean;

  // Actions
  loadScene: (floorPlanId: string) => Promise<void>;
  setWallHeight: (cm: number) => void;
  setFloorMaterial: (mat: MaterialPreset) => void;
  setRoomMaterial: (roomId: string, type: 'floor'|'wall'|'ceiling', mat: MaterialPreset) => void;
  setExteriorMaterial: (mat: MaterialPreset) => void;
  setLightingPreset: (p: Scene3D['lightingPreset']) => void;
  setSunHour: (h: number) => void;
  toggleShadows: () => void;
  addFurniture: (item: Furniture3DItem) => void;
  moveFurniture: (id: string, x: number, z: number, ry: number) => void;
  removeFurniture: (id: string) => void;
  setViewMode: (m: 'orbit' | 'walk') => void;
  setSelectedObject: (id: string | null) => void;
  saveScene: () => Promise<void>;
  requestRender: (type: 'thumbnail' | 'highres') => Promise<string>;
}

export const useScene3DStore = create<Scene3DStore>((set, get) => ({
  scene3d: null,
  viewMode: 'orbit',
  selectedObjectId: null,
  isLoading: false,

  loadScene: async (floorPlanId) => {
    set({ isLoading: true });
    const res = await fetch(`/api/scene3d?floorPlanId=${floorPlanId}`);
    const data = await res.json();
    set({ scene3d: data, isLoading: false });
  },

  setWallHeight: (cm) => set(s => ({
    scene3d: s.scene3d ? { ...s.scene3d, wallHeightCm: cm } : null,
  })),

  setFloorMaterial: (mat) => set(s => ({
    scene3d: s.scene3d ? { ...s.scene3d, floorMaterial: mat } : null,
  })),

  setRoomMaterial: (roomId, type, mat) => set(s => {
    if (!s.scene3d) return {};
    const overrides = { ...s.scene3d.roomOverrides };
    overrides[roomId] = {
      ...(overrides[roomId] ?? {}),
      roomId,
      [`${type}Material`]: mat,
    } as any;
    return { scene3d: { ...s.scene3d, roomOverrides: overrides } };
  }),

  setExteriorMaterial: (mat) => set(s => ({
    scene3d: s.scene3d ? { ...s.scene3d, exteriorMaterial: mat } : null,
  })),

  setLightingPreset: (p) => set(s => ({
    scene3d: s.scene3d ? { ...s.scene3d, lightingPreset: p } : null,
  })),

  setSunHour: (h) => set(s => ({
    scene3d: s.scene3d ? { ...s.scene3d, sunHour: h } : null,
  })),

  toggleShadows: () => set(s => ({
    scene3d: s.scene3d ? { ...s.scene3d, enableShadows: !s.scene3d.enableShadows } : null,
  })),

  addFurniture: (item) => set(s => ({
    scene3d: s.scene3d ? { ...s.scene3d, furniture3d: [...s.scene3d.furniture3d, item] } : null,
  })),

  moveFurniture: (id, x, z, ry) => set(s => ({
    scene3d: s.scene3d ? {
      ...s.scene3d,
      furniture3d: s.scene3d.furniture3d.map(f => f.id === id ? { ...f, positionX: x, positionZ: z, rotationY: ry } : f),
    } : null,
  })),

  removeFurniture: (id) => set(s => ({
    scene3d: s.scene3d ? {
      ...s.scene3d,
      furniture3d: s.scene3d.furniture3d.filter(f => f.id !== id),
    } : null,
  })),

  setViewMode: (m) => set({ viewMode: m }),
  setSelectedObject: (id) => set({ selectedObjectId: id }),

  saveScene: async () => {
    const { scene3d } = get();
    if (!scene3d) return;
    await fetch('/api/scene3d', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scene3d),
    });
  },

  requestRender: async (type) => {
    const { scene3d } = get();
    if (!scene3d) throw new Error('No scene');
    const res = await fetch('/api/scene3d/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scene3dId: scene3d.id, type }),
    });
    const { jobId } = await res.json();
    return jobId;
  },
}));
```

---

## Screenshot / Export

```ts
// utils/scene3d-export.ts
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';
import jsPDF from 'jspdf';
import type * as THREE from 'three';

export function takeScreenshot(canvas: HTMLCanvasElement, filename = 'view-3d.png'): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export async function exportGLTF(scene: THREE.Scene, filename = 'plan-3d.glb'): Promise<void> {
  const exporter = new GLTFExporter();
  const binary = await new Promise<ArrayBuffer>((resolve, reject) => {
    exporter.parse(scene, resolve as any, reject, { binary: true });
  });
  const blob = new Blob([binary], { type: 'model/gltf-binary' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportRenderToPDF(
  imageDataUrl: string,
  projectName: string,
  floorName: string,
  scaleNote: string
): void {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();

  pdf.addImage(imageDataUrl, 'PNG', 10, 20, pw - 20, ph - 40);
  pdf.setFontSize(14);
  pdf.text(projectName, 10, 12);
  pdf.setFontSize(9);
  pdf.text(floorName, pw / 2, 12, { align: 'center' });
  pdf.text(new Date().toLocaleDateString('ru-TJ'), pw - 10, 12, { align: 'right' });
  pdf.text(scaleNote, 10, ph - 6);
  pdf.save(`${projectName}-3d.pdf`);
}
```

---

## Walk Mode (First-Person)

```tsx
// components/planner-3d/WalkController.tsx
'use client';

import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const SPEED = 3; // m/s
const keys: Record<string, boolean> = {};

export function WalkController() {
  const { camera, gl } = useThree();
  const vel = useRef(new THREE.Vector3());
  const dir = useRef(new THREE.Vector3());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { keys[e.code] = e.type === 'keydown'; };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); };
  }, []);

  useFrame((_, delta) => {
    camera.position.y = 1.7; // eye height 170 cm

    dir.current.set(0, 0, 0);
    if (keys['KeyW'] || keys['ArrowUp'])    dir.current.z -= 1;
    if (keys['KeyS'] || keys['ArrowDown'])  dir.current.z += 1;
    if (keys['KeyA'] || keys['ArrowLeft'])  dir.current.x -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) dir.current.x += 1;
    dir.current.normalize().multiplyScalar(SPEED * delta);
    dir.current.applyEuler(camera.rotation);
    dir.current.y = 0; // no flying
    camera.position.add(dir.current);
  });

  return null;
}
```

---

## Server-Side Thumbnail (BullMQ Worker)

```ts
// workers/planner-3d-worker.ts
import { Worker, Job } from 'bullmq';
import puppeteer from 'puppeteer';
import { prisma } from '@/lib/prisma';
import { uploadFile } from '@/lib/storage';
import { redis } from '@/lib/redis';

interface RenderJobData {
  scene3dId: string;
  type: 'thumbnail' | 'highres';
  renderJobId: string;
}

const worker = new Worker<RenderJobData>(
  'planner-3d',
  async (job: Job<RenderJobData>) => {
    const { scene3dId, type, renderJobId } = job.data;

    await prisma.renderJob.update({ where: { id: renderJobId }, data: { status: 'processing' } });

    const width  = type === 'highres' ? 1920 : 400;
    const height = type === 'highres' ? 1080 : 225;

    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width, height });

    // Headless render page — passes scene3dId as query param
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
    await page.goto(`${baseUrl}/planner/3d/render?id=${scene3dId}&headless=1`, {
      waitUntil: 'networkidle0',
      timeout: 30_000,
    });

    await page.waitForSelector('[data-render-ready="true"]', { timeout: 15_000 });

    const screenshot = await page.screenshot({ type: 'png' });
    await browser.close();

    const key = `renders/${scene3dId}/${type}-${Date.now()}.png`;
    const url = await uploadFile(key, screenshot as Buffer, 'image/png');

    await prisma.renderJob.update({
      where: { id: renderJobId },
      data: { status: 'done', outputUrl: url },
    });

    // Notify via Socket.io
    const io = (global as any).__io;
    if (io) {
      io.to(`scene3d:${scene3dId}`).emit('render:done', { renderJobId, url, type });
    }
  },
  { connection: redis, concurrency: 1 }
);

worker.on('failed', async (job, err) => {
  if (job) {
    await prisma.renderJob.update({
      where: { id: job.data.renderJobId },
      data: { status: 'failed' },
    });
  }
});
```

---

## API Routes

```
GET  /api/scene3d?floorPlanId=:id   — load or create scene for floor plan
PUT  /api/scene3d                   — save scene3d (full replace)
POST /api/scene3d/render            — enqueue render job
GET  /api/scene3d/render/:jobId     — poll render job status
GET  /api/materials                 — list builtin + user material presets
POST /api/materials                 — create custom material preset
```

### GET/PUT `/api/scene3d`

```ts
// app/api/scene3d/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const floorPlanId = req.nextUrl.searchParams.get('floorPlanId');
  if (!floorPlanId) return NextResponse.json({ error: 'Missing floorPlanId' }, { status: 400 });

  let scene = await prisma.scene3D.findFirst({ where: { floorPlanId } });
  if (!scene) {
    scene = await prisma.scene3D.create({
      data: { floorPlanId, projectId: '', wallHeightCm: 280 },
    });
  }

  return NextResponse.json(scene);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, ...data } = body;

  const scene = await prisma.scene3D.update({ where: { id }, data });
  return NextResponse.json(scene);
}
```

### POST `/api/scene3d/render`

```ts
// app/api/scene3d/render/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Queue } from 'bullmq';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

const renderQueue = new Queue('planner-3d', { connection: redis });

export async function POST(req: NextRequest) {
  const { scene3dId, type = 'thumbnail' } = await req.json();

  const renderJob = await prisma.renderJob.create({
    data: { scene3dId, type, status: 'pending' },
  });

  await renderQueue.add('render', {
    scene3dId,
    type,
    renderJobId: renderJob.id,
  }, { attempts: 2 });

  return NextResponse.json({ jobId: renderJob.id });
}
```

---

## Full Page Layout

```tsx
// app/planner/3d/[planId]/page.tsx
import { Scene3DCanvas } from '@/components/planner-3d/Scene3DCanvas';
import { MaterialPanel }  from '@/components/planner-3d/MaterialPanel';
import { LightingPanel }  from '@/components/planner-3d/LightingPanel';
import { Toolbar3D }      from '@/components/planner-3d/Toolbar3D';

export default function Page3D({ params }: { params: { planId: string } }) {
  return (
    <div className="flex h-screen bg-neutral-950">
      {/* Left sidebar */}
      <aside className="w-64 flex-shrink-0 bg-neutral-900 border-r border-neutral-800 overflow-y-auto">
        <MaterialPanel />
        <LightingPanel />
      </aside>

      {/* 3D canvas */}
      <main className="flex-1 relative">
        <Toolbar3D />
        <Scene3DCanvas />
      </main>
    </div>
  );
}
```

---

## Toolbar3D Controls

```tsx
// components/planner-3d/Toolbar3D.tsx
'use client';
import { useScene3DStore } from '@/stores/scene-3d-store';
import { takeScreenshot, exportGLTF } from '@/utils/scene3d-export';
import { useThree } from '@react-three/fiber';

const ACTIONS = [
  { key: 'orbit',     icon: '⟳', label: 'Обзор',      shortcut: 'O' },
  { key: 'walk',      icon: '🚶', label: 'Прогулка',   shortcut: 'W' },
  { key: 'screenshot',icon: '📷', label: 'Скриншот',   shortcut: 'P' },
  { key: 'gltf',      icon: '📦', label: 'Экспорт GLB', shortcut: '' },
  { key: 'render',    icon: '🖼', label: 'Рендер',     shortcut: '' },
];
```

---

## Sync from 2D Planner

When `floorPlanId` changes or the user clicks "Обновить 3D", the scene rebuilds geometry from the current 2D plan store without losing material settings:

```ts
export function syncFrom2D(plan: FloorPlan, scene3d: Scene3D): Scene3D {
  // Keep all material + lighting settings, just mark plan updated
  return { ...scene3d, floorPlanId: plan.id, updatedAt: new Date() };
  // Geometry is rebuilt reactively in SceneContent via usePlannerStore()
}
```

---

## Integration Points

| Target | Method |
|---|---|
| **2D Planner** | Reads `usePlannerStore` live; `syncFrom2D()` after plan edit |
| **BIM Agent** | `exportGLTF()` → upload → trigger BIM pipeline via `/api/bim/upload` |
| **House Designer** | Wall height + material presets fed back to `generateMaterialList()` |
| **Product Catalog** | `scene3d.furniture3d` items linked to marketplace `productId` for "Купить" CTA |

---

## Key Rules

1. **All geometry in metres** in Three.js world — convert with `CM_TO_M = 0.01`.
2. **Never store floats for prices** — `priceDirams` is always an integer.
3. **CSG openings** require `three-bvh-csg`; only apply to walls with openings to avoid performance cost.
4. **PointerLockControls** require a user gesture to activate — wrap in a "Click to walk" overlay.
5. **Flat roof by default** — TJ residential is almost always flat concrete (сборный железобетон).
6. **Dushanbe sun** uses UTC+5 offset and latitude 38.56°N — solar noon around 12:00 local.
7. **GLB models** must be precompressed with `gltf-pipeline -i input.glb -o output.glb --draco.compressMeshes` for mobile (80%+ Android users).
8. **Shadow map 2048×2048** max — larger causes GPU OOM on mid-range Android.
9. **`dpr={[1, 2]}`** — cap pixel ratio at 2 to balance quality vs. performance on mobile.
10. **Auto-save** scene3d on `beforeunload` via `window.addEventListener('beforeunload', saveScene)`.
