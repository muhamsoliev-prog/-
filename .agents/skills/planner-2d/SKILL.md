---
name: planner-2d
description: |-
  2D floor plan editor — Konva.js canvas, room drawing, door/window placement, furniture library, dimension annotations, PDF export, and material quantity auto-calc.
---

# 2D Planner Agent

## Trigger
`/planner-2d`

## Role
2D floor plan editor specialist for the Tajikistan marketplace. Covers interactive canvas-based room drawing (Konva.js), wall/door/window placement, furniture library, dimension annotations, scale grid, PDF/PNG export, auto material quantity calculation from the drawn plan, and integration with House Designer and BIM Agent.

---

## Tech Stack

| Concern | Choice | Why |
|---------|--------|-----|
| Canvas engine | **Konva.js + react-konva** | Best React/Canvas integration, touch support |
| State | **Zustand** | Undo/redo history stack |
| PDF export | **jsPDF + html2canvas** | No server needed |
| PNG export | `konva.Stage.toDataURL()` | Direct canvas export |
| Measurements | Custom SVG overlay | Pixel-perfect dimension lines |
| Snap-to-grid | Konva transformer + custom grid | 10cm grid cells |

---

## Core Data Model

```typescript
// All coordinates in centimeters (cm) in logical space
// Canvas pixels = cm × scale (default scale = 1px per 2cm at zoom 1.0)

interface FloorPlan {
  id: string;
  projectId: string;    // linked to HouseProject
  nameRu: string;
  floorNo: number;
  widthCm: number;      // plan bounding box
  heightCm: number;
  scalePxPerCm: number; // default 0.5 (1px = 2cm) for typical 10m room on 500px canvas
  walls: Wall[];
  rooms: Room2D[];
  openings: Opening[];  // doors & windows cut into walls
  furniture: FurnitureItem[];
  dimensions: DimensionLine[];
  snapGridCm: number;   // 10cm default
}

interface Wall {
  id: string;
  x1: number; y1: number; // start point in cm
  x2: number; y2: number; // end point in cm
  thicknessCm: number;    // default 38cm (1.5 brick), 51cm (2 brick), 12cm (partition)
  material: 'brick_1' | 'brick_1_5' | 'brick_2' | 'partition_block' | 'partition_gypsum';
  isExterior: boolean;
}

interface Room2D {
  id: string;
  nameRu: string;
  type: 'living' | 'bedroom' | 'kitchen' | 'bathroom' | 'hallway' | 'balcony' | 'garage' | 'other';
  // Polygon defined by connected wall segments (derived, not stored separately)
  areaM2: number;       // auto-calculated from wall polygon
  perimeterM: number;
  floorNo: number;
  fillColor: string;    // room color for visualization
}

interface Opening {
  id: string;
  wallId: string;
  type: 'door' | 'window' | 'sliding_door' | 'archway';
  positionOnWall: number; // 0.0 – 1.0 along the wall length
  widthCm: number;
  heightCm: number;       // for windows: sill height from floor
  swingDirection?: 'left' | 'right' | 'both'; // for doors
}

interface FurnitureItem {
  id: string;
  catalogId: string;      // from furniture library
  nameRu: string;
  x: number; y: number;   // center position in cm
  widthCm: number;
  depthCm: number;
  rotation: number;        // degrees
  linkedProductId?: string; // marketplace product
}

interface DimensionLine {
  id: string;
  x1: number; y1: number;
  x2: number; y2: number;
  offsetCm: number;       // perpendicular offset from the measured line
  labelOverride?: string; // custom label, otherwise auto-calculated
}
```

---

## Zustand Store with Undo/Redo

```typescript
// store/planner.store.ts
import { create } from 'zustand';
import { temporal } from 'zundo';

interface PlannerState {
  plan: FloorPlan | null;
  selectedIds: string[];
  activeTool: 'select' | 'wall' | 'door' | 'window' | 'furniture' | 'dimension' | 'room_label' | 'erase';
  zoom: number;
  panX: number;
  panY: number;
  showGrid: boolean;
  showDimensions: boolean;
  showFurniture: boolean;

  // Actions
  setPlan: (plan: FloorPlan) => void;
  setActiveTool: (tool: PlannerState['activeTool']) => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  setSelected: (ids: string[]) => void;

  addWall: (wall: Wall) => void;
  updateWall: (id: string, updates: Partial<Wall>) => void;
  deleteWall: (id: string) => void;

  addOpening: (opening: Opening) => void;
  updateOpening: (id: string, updates: Partial<Opening>) => void;
  deleteOpening: (id: string) => void;

  addFurniture: (item: FurnitureItem) => void;
  updateFurniture: (id: string, updates: Partial<FurnitureItem>) => void;
  deleteFurniture: (id: string) => void;

  addDimension: (dim: DimensionLine) => void;
  deleteDimension: (id: string) => void;

  updateRoomLabels: () => void; // recalculate room areas from wall polygons
}

// Wrap with temporal for undo/redo (zundo library)
export const usePlannerStore = create<PlannerState>()(
  temporal(
    (set, get) => ({
      plan: null,
      selectedIds: [],
      activeTool: 'select',
      zoom: 1.0,
      panX: 0,
      panY: 0,
      showGrid: true,
      showDimensions: true,
      showFurniture: true,

      setPlan: (plan) => set({ plan }),
      setActiveTool: (tool) => set({ activeTool: tool }),
      setZoom: (zoom) => set({ zoom: Math.max(0.2, Math.min(5, zoom)) }),
      setPan: (panX, panY) => set({ panX, panY }),
      setSelected: (selectedIds) => set({ selectedIds }),

      addWall: (wall) => set(s => ({
        plan: s.plan ? { ...s.plan, walls: [...s.plan.walls, wall] } : s.plan,
      })),
      updateWall: (id, updates) => set(s => ({
        plan: s.plan ? {
          ...s.plan,
          walls: s.plan.walls.map(w => w.id === id ? { ...w, ...updates } : w),
        } : s.plan,
      })),
      deleteWall: (id) => set(s => ({
        plan: s.plan ? {
          ...s.plan,
          walls: s.plan.walls.filter(w => w.id !== id),
          openings: s.plan.openings.filter(o => o.wallId !== id),
        } : s.plan,
      })),

      addOpening: (opening) => set(s => ({
        plan: s.plan ? { ...s.plan, openings: [...s.plan.openings, opening] } : s.plan,
      })),
      updateOpening: (id, updates) => set(s => ({
        plan: s.plan ? {
          ...s.plan,
          openings: s.plan.openings.map(o => o.id === id ? { ...o, ...updates } : o),
        } : s.plan,
      })),
      deleteOpening: (id) => set(s => ({
        plan: s.plan ? { ...s.plan, openings: s.plan.openings.filter(o => o.id !== id) } : s.plan,
      })),

      addFurniture: (item) => set(s => ({
        plan: s.plan ? { ...s.plan, furniture: [...s.plan.furniture, item] } : s.plan,
      })),
      updateFurniture: (id, updates) => set(s => ({
        plan: s.plan ? {
          ...s.plan,
          furniture: s.plan.furniture.map(f => f.id === id ? { ...f, ...updates } : f),
        } : s.plan,
      })),
      deleteFurniture: (id) => set(s => ({
        plan: s.plan ? { ...s.plan, furniture: s.plan.furniture.filter(f => f.id !== id) } : s.plan,
      })),

      addDimension: (dim) => set(s => ({
        plan: s.plan ? { ...s.plan, dimensions: [...s.plan.dimensions, dim] } : s.plan,
      })),
      deleteDimension: (id) => set(s => ({
        plan: s.plan ? { ...s.plan, dimensions: s.plan.dimensions.filter(d => d.id !== id) } : s.plan,
      })),

      updateRoomLabels: () => {
        const plan = get().plan;
        if (!plan) return;
        const rooms = detectRoomsFromWalls(plan.walls);
        set(s => ({ plan: s.plan ? { ...s.plan, rooms } : s.plan }));
      },
    }),
    { limit: 50 } // 50-step undo history
  )
);

// Undo/redo shortcuts
export const useUndo = () => usePlannerStore.temporal.getState().undo;
export const useRedo = () => usePlannerStore.temporal.getState().redo;
```

---

## Snap-to-Grid & Wall Connection

```typescript
// utils/snap.ts
export function snapToGrid(valueCm: number, gridCm: number): number {
  return Math.round(valueCm / gridCm) * gridCm;
}

export function snapPoint(
  x: number, y: number,
  gridCm: number,
  walls: Wall[],
  snapRadiusCm = 20
): { x: number; y: number; snappedToWall: boolean } {
  // 1. Snap to existing wall endpoints
  for (const wall of walls) {
    for (const [wx, wy] of [[wall.x1, wall.y1], [wall.x2, wall.y2]]) {
      if (Math.hypot(x - wx, y - wy) < snapRadiusCm) {
        return { x: wx, y: wy, snappedToWall: true };
      }
    }
  }
  // 2. Snap to wall midpoints and perpendicular intersections
  // (simplified: just grid snap for now)
  return {
    x: snapToGrid(x, gridCm),
    y: snapToGrid(y, gridCm),
    snappedToWall: false,
  };
}

// Compute wall length for display
export function wallLengthCm(wall: Wall): number {
  return Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1);
}

// Convert canvas px to cm
export function pxToCm(px: number, scalePxPerCm: number, zoom: number): number {
  return px / (scalePxPerCm * zoom);
}

export function cmToPx(cm: number, scalePxPerCm: number, zoom: number): number {
  return cm * scalePxPerCm * zoom;
}
```

---

## Konva Canvas Components

```tsx
// components/planner/PlanCanvas.tsx
'use client';
import { Stage, Layer, Line, Group, Text, Circle } from 'react-konva';
import Konva from 'konva';
import { useRef, useCallback } from 'react';

export function PlanCanvas() {
  const stageRef = useRef<Konva.Stage>(null);
  const {
    plan, activeTool, zoom, panX, panY,
    showGrid, showDimensions, showFurniture,
    addWall, setSelected, setPan,
  } = usePlannerStore();

  const [drawingWall, setDrawingWall] = useState<{ x1: number; y1: number } | null>(null);
  const [pointerCm, setPointerCm] = useState({ x: 0, y: 0 });

  const stageToCanvas = (stageX: number, stageY: number) => ({
    x: pxToCm((stageX - panX), plan?.scalePxPerCm ?? 0.5, zoom),
    y: pxToCm((stageY - panY), plan?.scalePxPerCm ?? 0.5, zoom),
  });

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const pos = e.target.getStage()!.getPointerPosition()!;
    const cm = stageToCanvas(pos.x, pos.y);
    const snapped = snapPoint(cm.x, cm.y, plan?.snapGridCm ?? 10, plan?.walls ?? []);
    setPointerCm({ x: snapped.x, y: snapped.y });
  }, [plan, zoom, panX, panY]);

  const handleClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!plan) return;
    const pos = e.target.getStage()!.getPointerPosition()!;
    const cm = stageToCanvas(pos.x, pos.y);
    const snapped = snapPoint(cm.x, cm.y, plan.snapGridCm, plan.walls);

    if (activeTool === 'wall') {
      if (!drawingWall) {
        setDrawingWall({ x1: snapped.x, y1: snapped.y });
      } else {
        addWall({
          id: crypto.randomUUID(),
          x1: drawingWall.x1, y1: drawingWall.y1,
          x2: snapped.x, y2: snapped.y,
          thicknessCm: 38,
          material: 'brick_1_5',
          isExterior: true,
        });
        setDrawingWall(null);
        usePlannerStore.getState().updateRoomLabels();
      }
    }
  }, [plan, activeTool, drawingWall, zoom, panX, panY]);

  // Wheel zoom
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const delta = e.evt.deltaY > 0 ? 0.9 : 1.1;
    usePlannerStore.getState().setZoom(zoom * delta);
  }, [zoom]);

  if (!plan) return <div className="flex h-full items-center justify-center text-muted-foreground">Загрузка плана...</div>;

  const scale = plan.scalePxPerCm * zoom;

  return (
    <Stage
      ref={stageRef}
      width={window.innerWidth - 320} // subtract sidebar
      height={window.innerHeight - 60}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      onWheel={handleWheel}
      draggable={activeTool === 'select'}
      onDragEnd={(e) => setPan(e.target.x(), e.target.y())}
      x={panX} y={panY}
    >
      {/* Grid layer */}
      {showGrid && (
        <Layer>
          <GridLayer
            gridCm={plan.snapGridCm}
            scale={scale}
            widthCm={plan.widthCm}
            heightCm={plan.heightCm}
          />
        </Layer>
      )}

      {/* Walls layer */}
      <Layer>
        {plan.walls.map(wall => (
          <WallShape key={wall.id} wall={wall} scale={scale} />
        ))}
        {/* Ghost wall while drawing */}
        {drawingWall && activeTool === 'wall' && (
          <Line
            points={[
              drawingWall.x1 * scale, drawingWall.y1 * scale,
              pointerCm.x * scale, pointerCm.y * scale,
            ]}
            stroke="#2563eb"
            strokeWidth={38 * scale}
            opacity={0.4}
          />
        )}
      </Layer>

      {/* Openings layer */}
      <Layer>
        {plan.openings.map(op => (
          <OpeningShape key={op.id} opening={op} wall={plan.walls.find(w => w.id === op.wallId)!} scale={scale} />
        ))}
      </Layer>

      {/* Room labels layer */}
      <Layer>
        {plan.rooms.map(room => (
          <RoomLabel key={room.id} room={room} scale={scale} />
        ))}
      </Layer>

      {/* Furniture layer */}
      {showFurniture && (
        <Layer>
          {plan.furniture.map(item => (
            <FurnitureShape key={item.id} item={item} scale={scale} />
          ))}
        </Layer>
      )}

      {/* Dimensions layer */}
      {showDimensions && (
        <Layer>
          {plan.dimensions.map(dim => (
            <DimensionShape key={dim.id} dim={dim} scale={scale} />
          ))}
        </Layer>
      )}

      {/* Cursor position display */}
      <Layer>
        <Text
          text={`${pointerCm.x.toFixed(0)} × ${pointerCm.y.toFixed(0)} см`}
          x={8} y={8}
          fontSize={11}
          fill="#666"
        />
      </Layer>
    </Stage>
  );
}
```

```tsx
// components/planner/WallShape.tsx
function WallShape({ wall, scale }: { wall: Wall; scale: number }) {
  const { setSelected, selectedIds } = usePlannerStore();
  const isSelected = selectedIds.includes(wall.id);

  const angle = Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1);
  const halfThick = (wall.thicknessCm * scale) / 2;
  const dx = Math.sin(angle) * halfThick;
  const dy = -Math.cos(angle) * halfThick;

  const points = [
    wall.x1 * scale + dx, wall.y1 * scale + dy,
    wall.x2 * scale + dx, wall.y2 * scale + dy,
    wall.x2 * scale - dx, wall.y2 * scale - dy,
    wall.x1 * scale - dx, wall.y1 * scale - dy,
  ];

  const WALL_COLORS: Record<Wall['material'], string> = {
    brick_1:           '#c8a98a',
    brick_1_5:         '#b8946a',
    brick_2:           '#a07850',
    partition_block:   '#d4c5b0',
    partition_gypsum:  '#e8e0d8',
  };

  return (
    <Line
      points={points}
      closed
      fill={isSelected ? '#bfdbfe' : WALL_COLORS[wall.material]}
      stroke={isSelected ? '#2563eb' : '#8b6914'}
      strokeWidth={isSelected ? 2 : 1}
      onClick={(e) => {
        e.cancelBubble = true;
        setSelected([wall.id]);
      }}
    />
  );
}
```

```tsx
// components/planner/DimensionShape.tsx
function DimensionShape({ dim, scale }: { dim: DimensionLine; scale: number }) {
  const lengthCm = Math.hypot(dim.x2 - dim.x1, dim.y2 - dim.y1);
  const label = dim.labelOverride ?? `${(lengthCm / 100).toFixed(2)} м`;
  const mx = ((dim.x1 + dim.x2) / 2) * scale;
  const my = ((dim.y1 + dim.y2) / 2) * scale;
  const angle = Math.atan2(dim.y2 - dim.y1, dim.x2 - dim.x1) * (180 / Math.PI);

  const offset = dim.offsetCm * scale;
  const perpX = -Math.sin(angle * Math.PI / 180) * offset;
  const perpY = Math.cos(angle * Math.PI / 180) * offset;

  return (
    <Group>
      {/* Main dimension line */}
      <Line
        points={[dim.x1 * scale + perpX, dim.y1 * scale + perpY, dim.x2 * scale + perpX, dim.y2 * scale + perpY]}
        stroke="#1e40af" strokeWidth={1} dash={[4, 2]}
      />
      {/* Tick marks at ends */}
      <Line points={[dim.x1 * scale + perpX - 4, dim.y1 * scale + perpY - 4, dim.x1 * scale + perpX + 4, dim.y1 * scale + perpY + 4]}
        stroke="#1e40af" strokeWidth={1.5} />
      <Line points={[dim.x2 * scale + perpX - 4, dim.y2 * scale + perpY - 4, dim.x2 * scale + perpX + 4, dim.y2 * scale + perpY + 4]}
        stroke="#1e40af" strokeWidth={1.5} />
      {/* Label */}
      <Text
        text={label}
        x={mx + perpX - 25}
        y={my + perpY - 8}
        fontSize={11}
        fill="#1e40af"
        rotation={angle}
        align="center"
        width={50}
      />
    </Group>
  );
}
```

---

## Toolbar & Toolbox

```tsx
// components/planner/Toolbar.tsx
const TOOLS = [
  { key: 'select',     icon: '↖', labelRu: 'Выбор',     shortcut: 'V' },
  { key: 'wall',       icon: '▬', labelRu: 'Стена',      shortcut: 'W' },
  { key: 'door',       icon: '🚪', labelRu: 'Дверь',     shortcut: 'D' },
  { key: 'window',     icon: '⬜', labelRu: 'Окно',      shortcut: 'N' },
  { key: 'furniture',  icon: '🛋', labelRu: 'Мебель',    shortcut: 'F' },
  { key: 'dimension',  icon: '↔', labelRu: 'Размер',     shortcut: 'M' },
  { key: 'room_label', icon: '🏷', labelRu: 'Помещение', shortcut: 'R' },
  { key: 'erase',      icon: '🗑', labelRu: 'Удалить',   shortcut: 'Delete' },
] as const;

export function Toolbar() {
  const { activeTool, setActiveTool } = usePlannerStore();
  const undo = useUndo();
  const redo = useRedo();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
      const tool = TOOLS.find(t => t.shortcut === e.key.toUpperCase());
      if (tool) setActiveTool(tool.key as any);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="flex flex-col gap-1 p-2">
      {/* Undo/Redo */}
      <div className="mb-2 flex gap-1">
        <button onClick={undo} title="Отменить (Ctrl+Z)"
          className="flex h-8 w-8 items-center justify-center rounded border text-sm hover:bg-gray-50">
          ↩
        </button>
        <button onClick={redo} title="Повторить (Ctrl+Y)"
          className="flex h-8 w-8 items-center justify-center rounded border text-sm hover:bg-gray-50">
          ↪
        </button>
      </div>

      {TOOLS.map(tool => (
        <button
          key={tool.key}
          onClick={() => setActiveTool(tool.key as any)}
          title={`${tool.labelRu} (${tool.shortcut})`}
          className={`flex h-9 w-9 items-center justify-center rounded border text-sm
            ${activeTool === tool.key ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-gray-50'}`}
        >
          {tool.icon}
        </button>
      ))}
    </div>
  );
}
```

---

## Right Panel — Properties & Furniture Library

```tsx
// components/planner/RightPanel.tsx
export function RightPanel() {
  const { selectedIds, plan, activeTool } = usePlannerStore();
  const selected = selectedIds[0];

  if (activeTool === 'furniture') return <FurniturePalette />;
  if (!selected || !plan) return <PlanProperties />;

  const wall = plan.walls.find(w => w.id === selected);
  if (wall) return <WallProperties wall={wall} />;

  const opening = plan.openings.find(o => o.id === selected);
  if (opening) return <OpeningProperties opening={opening} />;

  const furniture = plan.furniture.find(f => f.id === selected);
  if (furniture) return <FurnitureProperties item={furniture} />;

  return <PlanProperties />;
}

function WallProperties({ wall }: { wall: Wall }) {
  const { updateWall } = usePlannerStore();

  const THICKNESS_OPTIONS = [
    { value: 12,  label: '12 см — перегородка (гипсокартон)' },
    { value: 25,  label: '25 см — перегородка (кирпич 1 ряд)' },
    { value: 38,  label: '38 см — стена 1.5 кирпича' },
    { value: 51,  label: '51 см — стена 2 кирпича (несущая)' },
    { value: 64,  label: '64 см — стена 2.5 кирпича (угловая)' },
  ];

  const length = wallLengthCm(wall);

  return (
    <div className="space-y-4 p-3">
      <h3 className="font-semibold">Стена</h3>

      <div>
        <p className="text-xs text-muted-foreground">Длина</p>
        <p className="font-mono font-medium">{(length / 100).toFixed(2)} м</p>
      </div>

      <div>
        <label className="text-sm font-medium">Толщина</label>
        <select
          value={wall.thicknessCm}
          onChange={e => updateWall(wall.id, { thicknessCm: Number(e.target.value) })}
          className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
        >
          {THICKNESS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" checked={wall.isExterior}
          onChange={e => updateWall(wall.id, { isExterior: e.target.checked })}
          id="exterior" />
        <label htmlFor="exterior" className="text-sm">Наружная стена</label>
      </div>
    </div>
  );
}
```

```tsx
// components/planner/FurniturePalette.tsx
const FURNITURE_CATALOG = [
  // Living room / Гостиная
  { id: 'sofa_3',      nameRu: 'Диван трёхместный', wCm: 220, dCm: 90,  icon: '🛋' },
  { id: 'sofa_2',      nameRu: 'Диван двухместный', wCm: 160, dCm: 85,  icon: '🛋' },
  { id: 'tv_unit',     nameRu: 'ТВ-тумба',          wCm: 150, dCm: 45,  icon: '📺' },
  { id: 'coffee_table',nameRu: 'Журнальный стол',   wCm: 90,  dCm: 50,  icon: '⬜' },
  { id: 'armchair',    nameRu: 'Кресло',             wCm: 80,  dCm: 80,  icon: '🪑' },

  // Bedroom / Спальня
  { id: 'bed_double',  nameRu: 'Кровать 2-спальная', wCm: 160, dCm: 200, icon: '🛏' },
  { id: 'bed_single',  nameRu: 'Кровать 1-спальная', wCm: 90,  dCm: 200, icon: '🛏' },
  { id: 'wardrobe',    nameRu: 'Шкаф-купе',          wCm: 200, dCm: 60,  icon: '🚪' },
  { id: 'dresser',     nameRu: 'Комод',              wCm: 100, dCm: 50,  icon: '⬜' },
  { id: 'nightstand',  nameRu: 'Тумбочка',           wCm: 50,  dCm: 45,  icon: '⬜' },

  // Kitchen / Кухня
  { id: 'kitchen_set', nameRu: 'Кухонный гарнитур',  wCm: 250, dCm: 60,  icon: '🍳' },
  { id: 'fridge',      nameRu: 'Холодильник',         wCm: 60,  dCm: 65,  icon: '🧊' },
  { id: 'dining_4',    nameRu: 'Обеденный стол 4',    wCm: 120, dCm: 80,  icon: '🪑' },
  { id: 'dining_6',    nameRu: 'Обеденный стол 6',    wCm: 160, dCm: 90,  icon: '🪑' },

  // Bathroom / Ванная
  { id: 'bathtub',     nameRu: 'Ванна',              wCm: 170, dCm: 75,  icon: '🛁' },
  { id: 'shower',      nameRu: 'Душевой уголок',     wCm: 90,  dCm: 90,  icon: '🚿' },
  { id: 'toilet',      nameRu: 'Унитаз',             wCm: 38,  dCm: 65,  icon: '🚽' },
  { id: 'washbasin',   nameRu: 'Раковина',           wCm: 55,  dCm: 45,  icon: '🪠' },
];

function FurniturePalette() {
  const { addFurniture, plan } = usePlannerStore();

  function placeFurniture(item: typeof FURNITURE_CATALOG[0]) {
    if (!plan) return;
    addFurniture({
      id: crypto.randomUUID(),
      catalogId: item.id,
      nameRu: item.nameRu,
      x: plan.widthCm / 2,
      y: plan.heightCm / 2,
      widthCm: item.wCm,
      depthCm: item.dCm,
      rotation: 0,
    });
  }

  return (
    <div className="p-3">
      <h3 className="mb-3 font-semibold">Мебель</h3>
      <div className="space-y-1">
        {FURNITURE_CATALOG.map(item => (
          <button key={item.id}
            onClick={() => placeFurniture(item)}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-gray-50">
            <span>{item.icon}</span>
            <span className="flex-1">{item.nameRu}</span>
            <span className="text-xs text-muted-foreground">
              {item.wCm}×{item.dCm}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

## Room Area Detection

```typescript
// utils/rooms.ts — detect closed polygons from walls and calculate areas
// Uses simple scan-line polygon fill detection

export function detectRoomsFromWalls(walls: Wall[]): Room2D[] {
  // Build adjacency graph of wall endpoints (snap to grid)
  // For each closed cycle → room polygon → area calculation

  // Shoelace formula for polygon area
  function polygonAreaM2(points: { x: number; y: number }[]): number {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    return Math.abs(area / 2) / 10_000; // cm² → m²
  }

  // Simplified: find rectangular rooms from axis-aligned walls
  // Full implementation would use planar graph cycle detection
  const rooms: Room2D[] = [];
  // ... (graph cycle detection implementation)
  return rooms;
}

// Perimeter of a room polygon
function polygonPerimeterM(points: { x: number; y: number }[]): number {
  let p = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    p += Math.hypot(points[j].x - points[i].x, points[j].y - points[i].y);
  }
  return p / 100; // cm → m
}
```

---

## Grid Layer

```tsx
// components/planner/GridLayer.tsx
function GridLayer({ gridCm, scale, widthCm, heightCm }: GridLayerProps) {
  const majorEvery = 100; // 1m major gridline
  const lines: JSX.Element[] = [];

  for (let x = 0; x <= widthCm; x += gridCm) {
    const isMajor = x % majorEvery === 0;
    lines.push(
      <Line key={`vx${x}`}
        points={[x * scale, 0, x * scale, heightCm * scale]}
        stroke={isMajor ? '#c0c0c0' : '#e8e8e8'}
        strokeWidth={isMajor ? 0.8 : 0.4}
      />
    );
    if (isMajor) lines.push(
      <Text key={`vl${x}`} text={`${x / 100}м`}
        x={x * scale + 2} y={2} fontSize={9} fill="#aaa" />
    );
  }
  for (let y = 0; y <= heightCm; y += gridCm) {
    const isMajor = y % majorEvery === 0;
    lines.push(
      <Line key={`hy${y}`}
        points={[0, y * scale, widthCm * scale, y * scale]}
        stroke={isMajor ? '#c0c0c0' : '#e8e8e8'}
        strokeWidth={isMajor ? 0.8 : 0.4}
      />
    );
    if (isMajor) lines.push(
      <Text key={`hl${y}`} text={`${y / 100}м`}
        x={2} y={y * scale + 2} fontSize={9} fill="#aaa" />
    );
  }
  return <>{lines}</>;
}
```

---

## Export

```typescript
// utils/export.ts

// PNG export (native Konva)
export function exportPNG(stageRef: React.RefObject<Konva.Stage>, filename = 'план.png') {
  const dataUrl = stageRef.current?.toDataURL({ pixelRatio: 3 }); // 3× for print quality
  if (!dataUrl) return;
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

// PDF export (A4 landscape)
export async function exportPDF(stageRef: React.RefObject<Konva.Stage>, planName: string) {
  const { jsPDF } = await import('jspdf');
  const dataUrl = stageRef.current?.toDataURL({ pixelRatio: 2 });
  if (!dataUrl) return;

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();

  // Title
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text(planName, 10, 12);

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Дата: ${new Date().toLocaleDateString('ru-TJ')}`, 10, 18);
  pdf.text('Масштаб: 1:100', 10, 22);

  // Plan image
  pdf.addImage(dataUrl, 'PNG', 5, 26, W - 10, H - 35);

  // Footer
  pdf.setFontSize(7);
  pdf.setTextColor(150);
  pdf.text('Создано в Планировщике — Маркетплейс Таджикистан', W / 2, H - 4, { align: 'center' });

  pdf.save(`${planName}.pdf`);
}

// Auto-dimensions: add dimension lines for all exterior walls
export function autoAddDimensions(plan: FloorPlan): DimensionLine[] {
  return plan.walls
    .filter(w => w.isExterior)
    .map(wall => ({
      id: crypto.randomUUID(),
      x1: wall.x1, y1: wall.y1,
      x2: wall.x2, y2: wall.y2,
      offsetCm: -30, // outside the wall
    }));
}
```

---

## Integration with House Designer & BIM

```typescript
// Sync 2D plan rooms → HouseProject rooms
async function syncPlanToProject(planId: string, projectId: string) {
  const plan = await prisma.floorPlan.findUnique({
    where: { id: planId },
    include: { rooms: true },
  });
  if (!plan) return;

  // Upsert rooms into HouseProject
  for (const room of plan.rooms) {
    await prisma.houseRoom.upsert({
      where: { planId_nameRu: { planId, nameRu: room.nameRu } },
      create: {
        projectId,
        nameRu: room.nameRu,
        type: room.type,
        lengthM: Math.sqrt(room.areaM2), // approximate square room
        widthM: Math.sqrt(room.areaM2),
        heightM: 3.0,
        floorNo: plan.floorNo,
      },
      update: {
        lengthM: Math.sqrt(room.areaM2),
        widthM: Math.sqrt(room.areaM2),
      },
    });
  }
}

// Generate simple IFC from 2D plan (for BIM viewer)
async function exportPlanToIFC(planId: string): Promise<Buffer> {
  const plan = await prisma.floorPlan.findUnique({
    where: { id: planId },
    include: { walls: true, openings: true },
  });

  // Build minimal IFC string
  let ifc = `ISO-10303-21;\nHEADER;\nENDAEC;\nDATA;\n`;
  let lineNo = 1;

  // IfcProject, IfcSite, IfcBuilding stubs
  ifc += `#${lineNo++}=IFCPROJECT('PLAN-${planId}',#2,'Проект','',\$,\$,\$,(#3),\$);\n`;

  for (const wall of plan?.walls ?? []) {
    // Each wall → IfcWall with IfcExtrudedAreaSolid geometry
    ifc += `#${lineNo++}=IFCWALL('${wall.id}',\$,'Стена',\$,\$,\$,\$,\$,'STANDARD');\n`;
  }

  ifc += `ENDSEC;\nEND-ISO-10303-21;\n`;
  return Buffer.from(ifc, 'utf-8');
}
```

---

## Tajikistan House Templates

```typescript
// Pre-built plan templates for common TJ house types

const TJ_HOUSE_TEMPLATES = [
  {
    id: 'tj_2room_60',
    nameRu: '2-комнатный дом, 60 м²',
    desc: 'Типовая планировка для семьи 3-4 чел.',
    totalAreaM2: 60,
    rooms: [
      { nameRu: 'Гостиная', type: 'living', wCm: 500, dCm: 400 },
      { nameRu: 'Спальня', type: 'bedroom', wCm: 350, dCm: 350 },
      { nameRu: 'Кухня', type: 'kitchen', wCm: 300, dCm: 250 },
      { nameRu: 'Ванная', type: 'bathroom', wCm: 200, dCm: 200 },
      { nameRu: 'Коридор', type: 'hallway', wCm: 200, dCm: 150 },
    ],
  },
  {
    id: 'tj_3room_90',
    nameRu: '3-комнатный дом, 90 м²',
    desc: 'Планировка для семьи 4-5 чел., 2 спальни',
    totalAreaM2: 90,
    rooms: [
      { nameRu: 'Гостиная', type: 'living', wCm: 600, dCm: 450 },
      { nameRu: 'Спальня 1', type: 'bedroom', wCm: 400, dCm: 350 },
      { nameRu: 'Спальня 2', type: 'bedroom', wCm: 350, dCm: 320 },
      { nameRu: 'Кухня-столовая', type: 'kitchen', wCm: 400, dCm: 300 },
      { nameRu: 'Ванная', type: 'bathroom', wCm: 220, dCm: 200 },
      { nameRu: 'Туалет', type: 'bathroom', wCm: 120, dCm: 160 },
      { nameRu: 'Коридор', type: 'hallway', wCm: 250, dCm: 150 },
    ],
  },
  {
    id: 'tj_mehmonhona',  // Traditional Tajik guest room
    nameRu: 'Дом с меҳмонхона, 120 м²',
    desc: 'Традиционная планировка с отдельной гостевой комнатой',
    totalAreaM2: 120,
    rooms: [
      { nameRu: 'Меҳмонхона (гостевая)', type: 'living', wCm: 600, dCm: 500 },
      { nameRu: 'Хонаи нишаст (гостиная семьи)', type: 'living', wCm: 450, dCm: 400 },
      { nameRu: 'Спальня 1', type: 'bedroom', wCm: 400, dCm: 350 },
      { nameRu: 'Спальня 2', type: 'bedroom', wCm: 380, dCm: 340 },
      { nameRu: 'Кухня', type: 'kitchen', wCm: 350, dCm: 300 },
      { nameRu: 'Ванная', type: 'bathroom', wCm: 250, dCm: 220 },
      { nameRu: 'Коридор', type: 'hallway', wCm: 280, dCm: 150 },
    ],
  },
];
```

---

## API Routes

```typescript
// src/api/v1/planner/routes.ts
const router = Router();

router.get('/plans', requireAuth, plannerController.listPlans);
router.post('/plans', requireAuth, plannerController.createPlan);
router.get('/plans/:id', requireAuth, plannerController.getPlan);
router.put('/plans/:id', requireAuth, plannerController.savePlan);   // full plan save (JSON blob)
router.delete('/plans/:id', requireAuth, plannerController.deletePlan);
router.post('/plans/:id/export/png', requireAuth, plannerController.exportPNG);
router.post('/plans/:id/export/pdf', requireAuth, plannerController.exportPDF);
router.post('/plans/:id/export/ifc', requireAuth, plannerController.exportIFC);
router.post('/plans/:id/sync-project', requireAuth, plannerController.syncToProject);
router.get('/templates', plannerController.listTemplates);
router.post('/plans/from-template/:templateId', requireAuth, plannerController.createFromTemplate);

export default router;
```

---

## Checklist

- [ ] All coordinates in **centimeters** in logical space (NOT pixels) — convert via `scale = scalePxPerCm × zoom`
- [ ] Snap-to-grid default 10cm, snaps to wall endpoints within 20cm radius
- [ ] Undo/redo via `zundo` temporal middleware — limit 50 steps
- [ ] Keyboard shortcuts: V (select), W (wall), D (door), N (window), F (furniture), M (measure)
- [ ] Export PNG at 3× pixel ratio for print quality
- [ ] PDF export: A4 landscape, title + date + scale annotation
- [ ] Wall thickness presets match real Tajik masonry standards (38cm = 1.5 кирпича default)
- [ ] Furniture catalog items include dimensions in cm — shown in palette
- [ ] `mehmonhona` template included (traditional Tajik house has separate guest room)
- [ ] Room area displayed in m² inside room label on canvas
- [ ] Exterior/interior wall toggle drives material quantity calculation (exterior = thicker, insulated)
- [ ] IFC export stubs are minimal — full BIM processing handed off to BIM Agent
- [ ] Touch support via Konva (pinch-to-zoom on mobile tablets used on construction sites)
