"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const GEM_COLORS = ["#60A5FA", "#A78BFA", "#F472B6", "#34D399", "#FBBF24"];

function Gems() {
  const group = useRef<THREE.Group>(null);
  const { pointer } = useThree();

  const gems = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        pos: [
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 6,
          -3 - Math.random() * 4,
        ] as [number, number, number],
        speed: 0.15 + Math.random() * 0.25,
        offset: Math.random() * Math.PI * 2,
        color: GEM_COLORS[i % GEM_COLORS.length],
        scale: 0.25 + Math.random() * 0.35,
      })),
    []
  );

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.getElapsedTime();

    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, pointer.x * 0.15, 0.02);
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, -pointer.y * 0.1, 0.02);

    g.children.forEach((child, i) => {
      const meta = gems[i];
      child.position.y = meta.pos[1] + Math.sin(t * meta.speed + meta.offset) * 0.4;
      child.rotation.x = t * meta.speed * 0.5;
      child.rotation.y = t * meta.speed * 0.3;
    });
  });

  return (
    <group ref={group}>
      {gems.map((gem, i) => (
        <mesh key={i} position={gem.pos} scale={gem.scale}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color={gem.color}
            transparent
            opacity={0.35}
            roughness={0.2}
            metalness={0.3}
          />
        </mesh>
      ))}
    </group>
  );
}

export function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }} dpr={[1, 1.5]}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 4, 5]} intensity={0.6} />
        <Gems />
      </Canvas>
    </div>
  );
}
