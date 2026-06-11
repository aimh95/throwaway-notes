/* eslint-disable react-hooks/immutability */
'use client'

import { Suspense, useEffect, useRef, useState, Component, type ReactNode } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import type { Post } from '@/types'
import { CrumpledPaper3D } from './CrumpledPaper3D'
import { dbToWorld } from '@/lib/paper/paperPosition'

// ─── Camera ──────────────────────────────────────────────────────────────────
function SceneCamera() {
  const { camera, size } = useThree()
  const initialised = useRef(false)

  useEffect(() => {
    const oc = camera as THREE.OrthographicCamera
    if (!initialised.current) {
      oc.position.set(0, 20, 8)
      oc.lookAt(0, 0, 0)
      initialised.current = true
    }
    oc.zoom = size.width / 22
    oc.updateProjectionMatrix()
  }, [camera, size.width])

  return null
}

// ─── One paper with Rapier physics body ──────────────────────────────────────
interface PaperProps {
  post: Post
  isNew: boolean
  onPaperClick: (post: Post) => void
}

function PhysicsPaper({ post, isNew, onPaperClick }: PaperProps) {
  const [wx, wz] = dbToWorld(post.x_position, post.y_position)

  // useState initializer runs only once at mount, so physics params are frozen
  // at the moment the paper first appears — even if isNew later becomes false
  const [p] = useState(() => ({
    startY:  isNew ? 3.5 : 0.1,
    linDamp: isNew ? 0.15 : 0.75,   // new: minimal air drag; existing: settles quickly
    angDamp: isNew ? 0.20 : 0.80,
    // Strong downward throw + slight random horizontal drift
    angVel: isNew
      ? [(Math.random() - 0.5) * 14, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 14] as [number, number, number]
      : [0, 0, 0] as [number, number, number],
    linVel: isNew
      ? [(Math.random() - 0.5) * 2.5, -20, (Math.random() - 0.5) * 2.5] as [number, number, number]
      : [0, 0, 0] as [number, number, number],
  }))

  return (
    <RigidBody
      colliders="hull"
      position={[wx, p.startY, wz]}
      rotation={[0, (post.rotation * Math.PI) / 180, 0]}
      restitution={0.35}
      friction={0.55}
      linearDamping={p.linDamp}
      angularDamping={p.angDamp}
      linearVelocity={p.linVel}
      angularVelocity={p.angVel}
    >
      <CrumpledPaper3D post={post} onClick={onPaperClick} />
    </RigidBody>
  )
}

// ─── Scene content ────────────────────────────────────────────────────────────
interface SceneProps {
  posts: Post[]
  newPostId: string | null
  onPaperClick: (post: Post) => void
}

function Scene({ posts, newPostId, onPaperClick }: SceneProps) {
  return (
    <>
      <SceneCamera />

      <ambientLight intensity={1.4} color="#FFF5EC" />

      <directionalLight
        position={[6, 14, 9]}
        intensity={2.0}
        color="#FFFFFF"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-camera-far={40}
        shadow-bias={-0.0005}
      />

      <directionalLight position={[-5, 8, -3]} intensity={0.5} color="#FFE8C8" />

      <ContactShadows
        position={[0, 0, 0]}
        opacity={0.32}
        scale={28}
        blur={3.2}
        far={1.5}
        color="#7A5A48"
        resolution={512}
      />

      {/* Physics — suspended separately so lights/camera render immediately */}
      <Suspense fallback={null}>
        <Physics gravity={[0, -40, 0]}>
          {/* Invisible floor collider at y = 0 */}
          <RigidBody type="fixed" position={[0, -0.05, 0]}>
            <CuboidCollider args={[12, 0.05, 9]} />
          </RigidBody>

          {posts.map((post) => (
            <PhysicsPaper
              key={post.id}
              post={post}
              isNew={post.id === newPostId}
              onPaperClick={onPaperClick}
            />
          ))}
        </Physics>
      </Suspense>
    </>
  )
}

// ─── Error boundary ───────────────────────────────────────────────────────────
interface EBState { hasError: boolean }
class CanvasErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, EBState> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}

// ─── Main export ─────────────────────────────────────────────────────────────
interface Props {
  posts: Post[]
  newPostId: string | null
  onPaperClick: (post: Post) => void
}

export default function PaperCanvas3D({ posts, newPostId, onPaperClick }: Props) {
  const fallback = (
    <div
      className="fixed inset-0"
      style={{ background: 'linear-gradient(160deg, #F7EFE5 0%, #F3E4D1 60%, #FFF8EF 100%)' }}
    />
  )

  return (
    <div className="fixed inset-0 w-full h-full" style={{ touchAction: 'none' }}>
      <CanvasErrorBoundary fallback={fallback}>
        <Canvas
          orthographic
          camera={{ position: [0, 20, 8], zoom: 80 }}
          shadows
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.05,
          }}
          dpr={[1, 1.5]}
          style={{ background: '#F2E6D4' }}
        >
          <color attach="background" args={['#F2E6D4']} />

          <Suspense fallback={null}>
            <Scene posts={posts} newPostId={newPostId} onPaperClick={onPaperClick} />
          </Suspense>
        </Canvas>
      </CanvasErrorBoundary>
    </div>
  )
}
