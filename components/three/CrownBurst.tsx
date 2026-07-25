'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

export interface Spawn {
  id: string
  x: number
  y: number
  color: string
  bornAt: number
}

function easeOutBack(t: number) {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

function Crown({ spawn, onDone }: { spawn: Spawn; onDone: (id: string) => void }) {
  const group = useRef<THREE.Group>(null)
  const DURATION = 550

  useFrame(() => {
    const g = group.current
    if (!g) return
    const t = Math.min((performance.now() - spawn.bornAt) / DURATION, 1)
    const pop = easeOutBack(Math.min(t * 1.3, 1))
    const fade = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4

    g.scale.setScalar(Math.max(pop, 0) * (0.9 + 0.1 * Math.sin(t * Math.PI)))
    g.position.y = spawn.y + (1 - Math.min(t * 1.8, 1)) * 0.6
    g.rotation.y = t * Math.PI * 0.6
    g.children.forEach(child => {
      const mesh = child as THREE.Mesh
      const mat = mesh.material as THREE.MeshStandardMaterial
      if (mat) mat.opacity = fade
    })

    if (t >= 1) onDone(spawn.id)
  })

  return (
    <group ref={group} position={[spawn.x, spawn.y, 0]}>
      <mesh position={[0, -0.08, 0]}>
        <cylinderGeometry args={[0.16, 0.2, 0.12, 5]} />
        <meshStandardMaterial color={spawn.color} transparent metalness={0.4} roughness={0.3} />
      </mesh>
      {[-0.12, 0, 0.12].map((x, i) => (
        <mesh key={i} position={[x, 0.06, 0]}>
          <coneGeometry args={[0.06, 0.16, 4]} />
          <meshStandardMaterial color={spawn.color} transparent metalness={0.4} roughness={0.3} />
        </mesh>
      ))}
    </group>
  )
}

export function CrownBurstLayer({ spawns, onDone, size }: { spawns: Spawn[]; onDone: (id: string) => void; size: number }) {
  const camera = useMemo(() => ({ position: [0, 0, size * 0.6] as [number, number, number], fov: 35 }), [size])

  return (
    <Canvas className="pointer-events-none absolute inset-0" camera={camera} gl={{ alpha: true, antialias: true }}>
      <ambientLight intensity={0.9} />
      <directionalLight position={[2, 3, 4]} intensity={1.1} />
      {spawns.map(s => (
        <Crown key={s.id} spawn={s} onDone={onDone} />
      ))}
    </Canvas>
  )
}
