---
name: threejs-agent
description: |-
  Three.js 3D visualizations — house project walkthroughs, construction site models, material texture previews, and WebGL performance optimisation.
---

# Three.js Agent Skill

## Trigger
`/threejs-agent`

## Role
You are the 3D/Three.js Engineer for a Tajikistan marketplace. You create interactive 3D product viewers, animated banners, furniture visualizers, and 360° product previews using Three.js with React Three Fiber — optimized for mobile Android (60fps, <5MB assets, WebGL fallback to image).

---

## Setup

```bash
npm install three @react-three/fiber @react-three/drei @react-three/postprocessing
npm install -D @types/three
```

---

## Product 360° Viewer

```tsx
// components/product/ProductViewer360.tsx
'use client';
import { Suspense, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, OrbitControls, Stage, useProgress, Html } from '@react-three/drei';
import * as THREE from 'three';

function LoadingFallback() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="text-sm text-white">{Math.round(progress)}%</div>
    </Html>
  );
}

function ProductModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const ref = useRef<THREE.Group>(null);

  // Auto-rotate gently
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.3;
  });

  return <primitive ref={ref} object={scene} />;
}

export function ProductViewer360({
  modelUrl,
  fallbackImageUrl,
  productName,
}: {
  modelUrl: string;
  fallbackImageUrl: string;
  productName: string;
}) {
  // Fallback for devices without WebGL
  if (typeof window !== 'undefined' && !window.WebGLRenderingContext) {
    return <img src={fallbackImageUrl} alt={productName} className="w-full aspect-square object-contain" />;
  }

  return (
    <div className="w-full aspect-square rounded-xl overflow-hidden bg-gray-50">
      <Canvas
        camera={{ position: [0, 0, 3], fov: 50 }}
        gl={{ antialias: true, powerPreference: 'low-power' }}  // Mobile battery-friendly
        dpr={Math.min(window.devicePixelRatio, 2)}              // Cap at 2x for performance
      >
        <Suspense fallback={<LoadingFallback />}>
          <Stage environment="city" intensity={0.5} preset="rembrandt">
            <ProductModel url={modelUrl} />
          </Stage>
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate={false}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 1.5}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

// Preload model when product page is likely to be visited
useGLTF.preload('/models/product-default.glb');
```

---

## Animated Hero Banner

```tsx
// components/home/HeroBanner3D.tsx
'use client';
import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Floating particles — decorative, aria-hidden
function FloatingParticles({ count = 80 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 10;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 6;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 5;
      col[i * 3]     = 0.2 + Math.random() * 0.4;  // r
      col[i * 3 + 1] = 0.4 + Math.random() * 0.4;  // g
      col[i * 3 + 2] = 0.9;                          // b
    }
    return [pos, col];
  }, [count]);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.elapsedTime * 0.05;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color"    args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.05} vertexColors transparent opacity={0.7} />
    </points>
  );
}

export function HeroBanner3D() {
  return (
    <div className="relative h-64 w-full overflow-hidden rounded-2xl bg-gradient-to-br from-blue-900 to-blue-600" aria-hidden="true">
      <Canvas camera={{ position: [0, 0, 5], fov: 60 }} gl={{ antialias: false }} dpr={1}>
        <FloatingParticles />
      </Canvas>
    </div>
  );
}
```

---

## Furniture Room Visualizer

```tsx
// components/furniture/RoomVisualizer.tsx
'use client';
import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, Grid } from '@react-three/drei';

function Room() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
      <planeGeometry args={[10, 10]} />
      <meshStandardMaterial color="#f5f5f0" />
    </mesh>
  );
}

function Furniture({ modelUrl, position }: { modelUrl: string; position: [number, number, number] }) {
  const { scene } = useGLTF(modelUrl);
  return <primitive object={scene.clone()} position={position} castShadow />;
}

export function RoomVisualizer({ products }: { products: Array<{ modelUrl: string; nameRu: string }> }) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="w-full h-96 rounded-xl overflow-hidden">
      <Canvas shadows camera={{ position: [3, 3, 5], fov: 45 }} gl={{ powerPreference: 'low-power' }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 8, 5]} intensity={1} castShadow shadow-mapSize={512} />

        <Suspense fallback={null}>
          <Environment preset="apartment" />
          <Room />
          {products.map((p, i) => (
            <Furniture
              key={i}
              modelUrl={p.modelUrl}
              position={[i * 2 - products.length, -0.5, 0]}
            />
          ))}
        </Suspense>

        <Grid infiniteGrid fadeDistance={20} cellColor="#ccc" sectionColor="#999" />
        <OrbitControls makeDefault target={[0, 0, 0]} maxPolarAngle={Math.PI / 2.2} />
      </Canvas>
    </div>
  );
}
```

---

## Performance Optimization for Mobile

```typescript
// lib/three/config.ts

// Detect low-end device (common in TJ)
export function isLowEndDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const memory = (navigator as any).deviceMemory;
  const cores  = navigator.hardwareConcurrency;
  return (memory !== undefined && memory <= 2) || (cores !== undefined && cores <= 2);
}

// Adaptive quality settings
export function getCanvasConfig() {
  const lowEnd = isLowEndDevice();
  return {
    dpr: lowEnd ? 1 : Math.min(window.devicePixelRatio, 2),
    antialias: !lowEnd,
    powerPreference: 'low-power' as const,
    shadowMapSize: lowEnd ? 512 : 1024,
  };
}

// Asset size guidelines:
// GLB models: < 1MB for product viewer (use Draco compression)
// Textures: 512×512 max for mobile, WebP format
// Compress with: npx gltf-transform optimize input.glb output.glb --texture-compress webp
```

---

## Draco Compressed Model Loading

```tsx
// components/three/DracoModel.tsx
import { useGLTF } from '@react-three/drei';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// Configure Draco decoder (reduces model size 70-90%)
useGLTF.setDecoderPath('/draco/');

export function DracoModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}
```

---

## Lazy Loading (only load Three.js when needed)

```tsx
// Next.js dynamic import — Three.js is ~600KB, don't ship to every page
import dynamic from 'next/dynamic';

const ProductViewer360 = dynamic(
  () => import('@/components/product/ProductViewer360').then(m => m.ProductViewer360),
  {
    ssr: false,
    loading: () => <div className="w-full aspect-square bg-gray-100 animate-pulse rounded-xl" />,
  },
);
```

---

## Agent Workflow

1. **SSR: false** — Always `dynamic(() => import(...), { ssr: false })` for Three.js components.
2. **WebGL fallback** — Always check `window.WebGLRenderingContext`; show image fallback if absent.
3. **DPR cap** — `Math.min(devicePixelRatio, 2)` to avoid 4× rendering on high-DPI Android.
4. **Low-power** — Use `powerPreference: 'low-power'` to protect battery on cheap Android phones.
5. **Draco** — Compress all GLB models with Draco; target < 1MB per model.
6. **aria-hidden** — Mark decorative 3D scenes `aria-hidden="true"` so screen readers skip them.
7. **Lazy load** — Use Next.js `dynamic()` with a skeleton placeholder; Three.js is 600KB+.
