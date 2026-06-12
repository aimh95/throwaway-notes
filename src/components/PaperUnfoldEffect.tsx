'use client'

import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Post } from '@/types'
import { generateCrumpledGeometry } from '@/lib/paper/generateCrumpledGeometry'
import { generatePaperTexture } from '@/lib/paper/generatePaperTexture'
import { seedFromString } from '@/lib/paper/seededRandom'
import { getPaperColorToken } from '@/lib/utils'

const PRESET_3D: Record<string, string> = {
  ivory: '#F5EDDA', 'pale-peach': '#F0D0B4', 'muted-yellow': '#EDE49A',
  'dusty-pink': '#E8BEB8', 'light-sage': '#C4D4B0', 'warm-gray': '#D0C8BC',
}
function to3DColor(c: string) { return PRESET_3D[c] ?? c }

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}
function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

interface MeshProps {
  post: Post
  progress: React.MutableRefObject<number>
  onDone: () => void
}

function UnfoldingMesh({ post, progress, onDone }: MeshProps) {
  const meshRef   = useRef<THREE.Mesh>(null!)
  const seed      = useMemo(() => seedFromString(post.id), [post.id])
  const crumpled  = useMemo(() => generateCrumpledGeometry(post.crumple_style, seed), [post.crumple_style, seed])
  const doneFired = useRef(false)

  const crumpledPos = useMemo(() => {
    const arr = crumpled.attributes.position as THREE.BufferAttribute
    return Float32Array.from(arr.array as Float32Array)
  }, [crumpled])

  const flatPos = useMemo(() => {
    const out = new Float32Array(crumpledPos.length)
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
    for (let i = 0; i < crumpledPos.length; i += 3) {
      minX = Math.min(minX, crumpledPos[i]); maxX = Math.max(maxX, crumpledPos[i])
      minZ = Math.min(minZ, crumpledPos[i+2]); maxZ = Math.max(maxZ, crumpledPos[i+2])
    }
    const scaleX = 1.4 / Math.max(maxX - minX, 0.01)
    const scaleZ = 1.2 / Math.max(maxZ - minZ, 0.01)
    const scale  = Math.min(scaleX, scaleZ)
    for (let i = 0; i < crumpledPos.length; i += 3) {
      out[i]   = crumpledPos[i]   * scale
      out[i+1] = 0
      out[i+2] = crumpledPos[i+2] * scale
    }
    return out
  }, [crumpledPos])

  const geo = useMemo(() => crumpled.clone(), [crumpled])

  const hexColor = to3DColor(getPaperColorToken(post.paper_color))
  const texture  = useMemo(
    () => (typeof window !== 'undefined' ? generatePaperTexture(hexColor, false) : null),
    [hexColor],
  )

  useEffect(() => () => { geo.dispose() }, [geo])

  useFrame((state, dt) => {
    // ~1.8s total duration
    progress.current = Math.min(1, progress.current + dt * 0.55)
    const t   = easeInOutCubic(progress.current)
    const tUp = easeOutCubic(progress.current)
    const pos = geo.attributes.position as THREE.BufferAttribute

    for (let i = 0; i < pos.count; i++) {
      const bi = i * 3
      pos.setXYZ(i,
        crumpledPos[bi]   * (1 - t) + flatPos[bi]   * t,
        crumpledPos[bi+1] * (1 - t) + flatPos[bi+1] * t,
        crumpledPos[bi+2] * (1 - t) + flatPos[bi+2] * t,
      )
    }
    pos.needsUpdate = true
    geo.computeVertexNormals()

    // Rise from below the frame up to reading position
    meshRef.current.position.y = -2.4 + tUp * 2.8

    // Scale up as it unfolds (starts compact/crumpled, expands to full)
    const s = 0.42 + t * 0.58
    meshRef.current.scale.setScalar(s)

    // Tilt: starts slightly tilted toward viewer, flattens as it rises
    meshRef.current.rotation.x = -(1 - t) * 0.5

    // Gentle horizontal rotation only while crumpled
    meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.18 * (1 - t)

    if (progress.current >= 1 && !doneFired.current) {
      doneFired.current = true
      onDone()
    }
  })

  return (
    <mesh ref={meshRef} geometry={geo} castShadow>
      <meshStandardMaterial
        map={texture ?? undefined}
        color={texture ? undefined : hexColor}
        roughness={0.88}
        metalness={0}
        flatShading
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

interface Props {
  post: Post
  onDone: () => void
}

export default function PaperUnfoldEffect({ post, onDone }: Props) {
  const progress = useRef(0)

  return (
    <div
      className="fixed inset-0 z-[60] pointer-events-none"
      style={{
        background: 'linear-gradient(to top, rgba(6,4,2,0.72) 0%, rgba(6,4,2,0.35) 45%, transparent 100%)',
      }}
    >
      <Canvas
        // Low camera, wide fov — paper appears to rise from below into view
        camera={{ position: [0, 1.5, 4.8], fov: 48 }}
        gl={{ antialias: true, alpha: true }}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      >
        <ambientLight intensity={1.8} color="#FFF5EC" />
        <directionalLight position={[4, 8, 6]} intensity={2.2} color="#FFFFFF" />
        <directionalLight position={[-3, 4, -2]} intensity={0.6} color="#FFE8C8" />
        <UnfoldingMesh post={post} progress={progress} onDone={onDone} />
      </Canvas>
    </div>
  )
}
