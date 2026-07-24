"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const COLORS = ["#F87171", "#34D399", "#60A5FA", "#FBBF24", "#A78BFA", "#F472B6", "#2DD4BF"];
const COUNT = 90;

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  spin: number;
  color: THREE.Color;
}

function Particles({ startedAt }: { startedAt: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: COUNT }, () => ({
        x: (Math.random() - 0.5) * 2,
        y: 1 + Math.random() * 0.5,
        z: (Math.random() - 0.5) * 0.5,
        vx: (Math.random() - 0.5) * 1.2,
        vy: Math.random() * 1.5 + 1.5,
        vz: (Math.random() - 0.5) * 0.4,
        spin: (Math.random() - 0.5) * 10,
        color: new THREE.Color(COLORS[Math.floor(Math.random() * COLORS.length)]),
      })),
    []
  );

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = (performance.now() - startedAt) / 1000;
    const gravity = 2.2;

    particles.forEach((p, i) => {
      const x = p.x + p.vx * t;
      const y = p.y + p.vy * t - 0.5 * gravity * t * t;
      const z = p.z + p.vz * t;

      dummy.position.set(x, y, z);
      dummy.rotation.set(t * p.spin, t * p.spin * 0.7, 0);
      const fade = Math.max(0, 1 - t / 2.2);
      dummy.scale.setScalar(0.05 * fade);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, p.color);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial />
    </instancedMesh>
  );
}

export function WinConfetti({ active }: { active: boolean }) {
  const startedAt = useMemo(() => performance.now(), [active]);
  if (!active) return null;

  return (
    <Canvas
      className="pointer-events-none absolute inset-0"
      camera={{ position: [0, 0, 3], fov: 45 }}
      gl={{ alpha: true, antialias: true }}
    >
      <ambientLight intensity={1} />
      <directionalLight position={[2, 3, 4]} intensity={1} />
      <Particles startedAt={startedAt} />
    </Canvas>
  );
}
