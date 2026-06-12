'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Post } from '@/types'
import { generateCrumpledGeometry } from '@/lib/paper/generateCrumpledGeometry'
import { generatePaperTexture } from '@/lib/paper/generatePaperTexture'
import { seedFromString } from '@/lib/paper/seededRandom'
import { ZOOM_FAR, ZOOM_MED } from '@/lib/paper/worldCoordinates'

// ─── Color resolution ─────────────────────────────────────────────────────────
const PRESET_3D: Record<string, { color: string; hasLines: boolean }> = {
  ivory:          { color: '#F5EDDA', hasLines: false },
  'pale-peach':   { color: '#F0D0B4', hasLines: false },
  'muted-yellow': { color: '#EDE49A', hasLines: true  },
  'dusty-pink':   { color: '#E8BEB8', hasLines: false },
  'light-sage':   { color: '#C4D4B0', hasLines: false },
  'warm-gray':    { color: '#D0C8BC', hasLines: false },
}
function resolveColor(c: string): { color: string; hasLines: boolean } {
  return PRESET_3D[c] ?? { color: c, hasLines: false }
}

// ─── LOD: Abstract colour dot (zoom < ZOOM_FAR) ───────────────────────────────
function AbstractDot({ color, isOwned }: { color: string; isOwned: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  useFrame(({ clock }) => {
    if (isOwned) {
      const s = 1 + Math.sin(clock.elapsedTime * 2) * 0.08
      meshRef.current.scale.setScalar(s)
    }
  })
  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.55, 8]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.82}
      />
      {isOwned && (
        <mesh>
          <ringGeometry args={[0.58, 0.70, 8]} />
          <meshBasicMaterial color="#FFB347" transparent opacity={0.55} side={THREE.DoubleSide} />
        </mesh>
      )}
    </mesh>
  )
}

// ─── LOD: Flat silhouette (ZOOM_FAR < zoom < ZOOM_MED) ───────────────────────
function FlatSilhouette({ geo, color }: { geo: THREE.BufferGeometry; color: string }) {
  // Flatten the crumpled geometry to a shadow-like shape
  const flatGeo = useMemo(() => {
    const g = geo.clone()
    const pos = g.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) pos.setY(i, 0)
    pos.needsUpdate = true
    g.computeVertexNormals()
    return g
  }, [geo])
  useEffect(() => () => flatGeo.dispose(), [flatGeo])

  return (
    <mesh geometry={flatGeo} rotation={[-0.05, 0, 0]}>
      <meshBasicMaterial color={color} side={THREE.DoubleSide} />
    </mesh>
  )
}

// ─── LOD: Full 3D crumpled paper (zoom >= ZOOM_MED) ──────────────────────────
interface Props {
  post: Post
  zoom: number
  isOwned?: boolean
  isDragging?: boolean
}

export function CrumpledPaper3D({ post, zoom, isOwned = false, isDragging = false }: Props) {
  const meshRef    = useRef<THREE.Mesh>(null!)
  const glowRef    = useRef<THREE.Mesh>(null!)
  const hovered    = useRef(false)
  const animScale  = useRef(1.0)
  const vScale     = useRef(0.0)

  const seed     = useMemo(() => seedFromString(post.id), [post.id])
  const geometry = useMemo(() => generateCrumpledGeometry(post.crumple_style, seed), [post.crumple_style, seed])
  const { color: baseColor, hasLines } = resolveColor(post.paper_color)
  const texture  = useMemo(
    () => (typeof window !== 'undefined' ? generatePaperTexture(baseColor, hasLines) : null),
    [baseColor, hasLines],
  )

  // Glow shell for owned papers
  const glowGeo = useMemo(() => {
    if (!isOwned) return null
    const g = geometry.clone()
    const pos = g.attributes.position as THREE.BufferAttribute
    g.computeVertexNormals()
    const normals = g.attributes.normal as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      pos.setXYZ(i,
        pos.getX(i) + normals.getX(i) * 0.05,
        pos.getY(i) + normals.getY(i) * 0.05,
        pos.getZ(i) + normals.getZ(i) * 0.05,
      )
    }
    pos.needsUpdate = true
    return g
  }, [geometry, isOwned])

  useEffect(() => () => { geometry?.dispose(); glowGeo?.dispose() }, [geometry, glowGeo])

  useFrame((_, dt) => {
    if (!meshRef.current) return
    const target = (hovered.current || isDragging) ? 1.10 : 1.0
    const force  = (target - animScale.current) * 14
    vScale.current   += force * dt
    vScale.current   *= 0.72
    animScale.current += vScale.current * dt
    meshRef.current.scale.setScalar(animScale.current)
    if (glowRef.current) glowRef.current.scale.setScalar(animScale.current)

    if (isOwned && glowRef.current) {
      const pulse = 0.45 + Math.sin(Date.now() * 0.003) * 0.25
      ;(glowRef.current.material as THREE.MeshBasicMaterial).opacity =
        pulse * (hovered.current ? 0.6 : 0.3)
    }
  })

  // ── LOD selection ─────────────────────────────────────────────────────────
  if (zoom < ZOOM_FAR) {
    return <AbstractDot color={baseColor} isOwned={isOwned} />
  }

  if (zoom < ZOOM_MED) {
    return <FlatSilhouette geo={geometry} color={baseColor} />
  }

  // Full 3D
  return (
    <group>
      {isOwned && glowGeo && (
        <mesh ref={glowRef} geometry={glowGeo}>
          <meshBasicMaterial color="#FFB347" transparent opacity={0.28} side={THREE.BackSide} depthWrite={false} />
        </mesh>
      )}
      <mesh
        ref={meshRef}
        geometry={geometry}
        castShadow
        receiveShadow
        onPointerOver={(e) => {
          e.stopPropagation()
          hovered.current = true
          document.body.style.cursor = isOwned ? 'grab' : 'pointer'
        }}
        onPointerOut={() => {
          hovered.current = false
          document.body.style.cursor = 'default'
        }}
      >
        <meshStandardMaterial
          map={texture ?? undefined}
          color={texture ? undefined : baseColor}
          roughness={0.92}
          metalness={0}
          flatShading
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}
