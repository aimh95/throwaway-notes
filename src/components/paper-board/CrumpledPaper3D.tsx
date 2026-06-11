'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Post } from '@/types'
import { generateCrumpledGeometry } from '@/lib/paper/generateCrumpledGeometry'
import { generatePaperTexture } from '@/lib/paper/generatePaperTexture'
import { seedFromString } from '@/lib/paper/seededRandom'

const PAPER_3D: Record<string, { color: string; hasLines: boolean }> = {
  ivory:          { color: '#F5EDDA', hasLines: false },
  'pale-peach':   { color: '#F0D0B4', hasLines: false },
  'muted-yellow': { color: '#EDE49A', hasLines: true  },
  'dusty-pink':   { color: '#E8BEB8', hasLines: false },
  'light-sage':   { color: '#C4D4B0', hasLines: false },
  'warm-gray':    { color: '#D0C8BC', hasLines: false },
}

interface Props {
  post: Post
  onClick: (post: Post) => void
}

export function CrumpledPaper3D({ post, onClick }: Props) {
  const meshRef   = useRef<THREE.Mesh>(null!)
  const hovered   = useRef(false)
  const animScale = useRef(1.0)
  const vScale    = useRef(0.0)

  const seed     = useMemo(() => seedFromString(post.id), [post.id])
  const geometry = useMemo(() => generateCrumpledGeometry(post.crumple_style, seed), [post.crumple_style, seed])

  const { color: baseColor, hasLines } = PAPER_3D[post.paper_color] ?? { color: '#F5EDDA', hasLines: false }
  const texture = useMemo(
    () => (typeof window !== 'undefined' ? generatePaperTexture(baseColor, hasLines) : null),
    [baseColor, hasLines],
  )

  useEffect(() => () => { geometry?.dispose() }, [geometry])

  // Hover scale spring — position is owned by the physics RigidBody
  useFrame((_, dt) => {
    const target = hovered.current ? 1.07 : 1.0
    const force  = (target - animScale.current) * 14
    vScale.current  += force * dt
    vScale.current  *= 0.72
    animScale.current += vScale.current * dt
    meshRef.current.scale.setScalar(animScale.current)
  })

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      castShadow
      receiveShadow
      onClick={(e) => { e.stopPropagation(); onClick(post) }}
      onPointerOver={(e) => {
        e.stopPropagation()
        hovered.current = true
        document.body.style.cursor = 'pointer'
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
  )
}
