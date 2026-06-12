'use client'

import {
  Suspense, useRef, useState, useCallback, useEffect, useMemo,
  createContext, useContext, Component, type ReactNode,
} from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { ContactShadows, MapControls } from '@react-three/drei'
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MapControlsImpl = any
import * as THREE from 'three'
import type { Post } from '@/types'
import { CrumpledPaper3D } from './CrumpledPaper3D'
import { dbToWorld, WORLD_W, WORLD_H, ZOOM_FAR, ZOOM_MED } from '@/lib/paper/worldCoordinates'
import { BOARD_CONFIG } from '@/lib/paper/boardConfig'

// ─── Zoom context ─────────────────────────────────────────────────────────────
const ZoomCtx = createContext<number>(BOARD_CONFIG.defaultZoom)
export function useZoom() { return useContext(ZoomCtx) }

function ZoomProvider({ setZoom }: { setZoom: (z: number) => void }) {
  const { camera } = useThree()
  const last = useRef(-1)
  useFrame(() => {
    const z = (camera as THREE.OrthographicCamera).zoom
    if (Math.abs(z - last.current) > 0.5) { last.current = z; setZoom(z) }
  })
  return null
}

// ─── Pan boundary enforcer ────────────────────────────────────────────────────
function PanBoundary({ controlsRef }: { controlsRef: React.RefObject<MapControlsImpl | null> }) {
  const { camera } = useThree()
  useFrame(() => {
    const ctrl = controlsRef.current
    if (!ctrl) return
    const t = ctrl.target
    t.x = Math.max(BOARD_CONFIG.panMinX, Math.min(BOARD_CONFIG.panMaxX, t.x))
    t.z = Math.max(BOARD_CONFIG.panMinZ, Math.min(BOARD_CONFIG.panMaxZ, t.z))
    camera.position.x = Math.max(BOARD_CONFIG.panMinX, Math.min(BOARD_CONFIG.panMaxX, camera.position.x))
    camera.position.z = Math.max(BOARD_CONFIG.panMinZ, Math.min(BOARD_CONFIG.panMaxZ, camera.position.z - 12)) + 12
  })
  return null
}

// ─── Ground plane for drag raycasting ────────────────────────────────────────
const GROUND_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

// ─── Drag context ─────────────────────────────────────────────────────────────
// Interaction model:
//   • Short tap/click on any paper        → opens the paper
//   • Drag on empty space or any paper    → pans the camera (MapControls)
//   • Long press 480 ms on OWN paper      → picks up paper; dragging then moves it
// This makes the two drag gestures mutually exclusive with zero conflict.
type RBRef = React.MutableRefObject<RapierRigidBody | null>

interface DragControl {
  dragTarget: React.MutableRefObject<{ id: string; x: number; z: number } | null>
  beginGrab: (id: string, rbRef: RBRef, wx: number, wz: number, onEnd: () => void) => void
}
const DragCtx = createContext<DragControl | null>(null)
function useDragCtx() { return useContext(DragCtx)! }

// ─── Individual paper with physics ───────────────────────────────────────────
interface PaperProps {
  post: Post
  isNew: boolean
  isOwned: boolean
  zoom: number
  onPaperClick: (post: Post) => void
}

function PhysicsPaper({ post, isNew, isOwned, zoom, onPaperClick }: PaperProps) {
  const [wx, wz] = dbToWorld(post.x_position, post.y_position)
  const rbRef    = useRef<RapierRigidBody>(null)
  const { dragTarget, beginGrab } = useDragCtx()
  const [isDragging, setIsDragging] = useState(false)

  // Long-press state (refs avoid stale-closure problems in setTimeout)
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ptrStartRef = useRef({ x: 0, y: 0 })
  const didGrabRef  = useRef(false)   // suppress onClick after a grab session

  const [p] = useState(() => ({
    startY:  isNew ? 4.0 : 0.05,
    linDamp: isNew ? 0.12 : 0.95,
    angDamp: isNew ? 0.18 : 0.98,
    angVel:  isNew
      ? [(Math.random()-0.5)*10, (Math.random()-0.5)*8, (Math.random()-0.5)*10] as [number,number,number]
      : [0,0,0] as [number,number,number],
    linVel:  isNew
      ? [(Math.random()-0.5)*3, -18, (Math.random()-0.5)*3] as [number,number,number]
      : [0,0,0] as [number,number,number],
  }))

  // Follow dragTarget in kinematic mode every frame
  useFrame(() => {
    if (!rbRef.current) return
    const dt = dragTarget.current
    if (dt?.id === post.id) {
      rbRef.current.setNextKinematicTranslation({ x: dt.x, y: 0.4, z: dt.z })
    }
  })

  const handlePtrDown = useCallback((e: { nativeEvent: PointerEvent }) => {
    if (!isOwned) return
    ptrStartRef.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY }
    didGrabRef.current = false

    timerRef.current = setTimeout(() => {
      timerRef.current = null
      didGrabRef.current = true
      rbRef.current?.setBodyType(2, true)   // kinematic
      document.body.style.cursor = 'grabbing'
      setIsDragging(true)
      beginGrab(post.id, rbRef, wx, wz, () => {
        setIsDragging(false)
        rbRef.current?.setBodyType(0, true)  // drop with physics
        rbRef.current?.setLinvel({ x: 0, y: -1.5, z: 0 }, true)
      })
    }, 480)
  }, [isOwned, beginGrab, post.id, wx, wz])

  // Cancel long-press if user moves more than 14 px (they intend to pan)
  const handlePtrMove = useCallback((e: { nativeEvent: PointerEvent }) => {
    if (!timerRef.current) return
    const dx = e.nativeEvent.clientX - ptrStartRef.current.x
    const dy = e.nativeEvent.clientY - ptrStartRef.current.y
    if (dx * dx + dy * dy > 196) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Release before timer fires → cancel; global pointerup handles grab cleanup
  const handlePtrUp = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const handleClick = useCallback(() => {
    if (didGrabRef.current) { didGrabRef.current = false; return }
    onPaperClick(post)
  }, [onPaperClick, post])

  return (
    <RigidBody
      ref={rbRef}
      colliders="hull"
      position={[wx, p.startY, wz]}
      rotation={[0, (post.rotation * Math.PI) / 180, 0]}
      restitution={0.25}
      friction={0.60}
      linearDamping={p.linDamp}
      angularDamping={p.angDamp}
      linearVelocity={p.linVel}
      angularVelocity={p.angVel}
      type={isNew ? 'dynamic' : 'fixed'}
    >
      <group
        onPointerDown={handlePtrDown as never}
        onPointerMove={handlePtrMove as never}
        onPointerUp={handlePtrUp}
        onPointerEnter={() => { document.body.style.cursor = isOwned ? 'grab' : 'pointer' }}
        onPointerLeave={() => { if (!isDragging) document.body.style.cursor = 'default' }}
        onClick={handleClick}
      >
        <CrumpledPaper3D
          post={post}
          zoom={zoom}
          isOwned={isOwned}
          isDragging={isDragging}
        />
      </group>
    </RigidBody>
  )
}

// ─── Scene ────────────────────────────────────────────────────────────────────
interface SceneProps {
  posts: Post[]
  newPostId: string | null
  myPostIds: Set<string>
  zoom: number
  setZoom: (z: number) => void
  onPaperClick: (post: Post) => void
  controlsRef: React.RefObject<MapControlsImpl | null>
}

function Scene({ posts, newPostId, myPostIds, zoom, setZoom, onPaperClick, controlsRef }: SceneProps) {
  const { camera } = useThree()
  const raycaster    = useRef(new THREE.Raycaster())
  const dragTarget   = useRef<{ id: string; x: number; z: number } | null>(null)
  const grabbedRbRef = useRef<RBRef | null>(null)
  const grabOnEnd    = useRef<(() => void) | null>(null)

  const beginGrab = useCallback((
    id: string, rbRef: RBRef, wx: number, wz: number, onEnd: () => void,
  ) => {
    dragTarget.current   = { id, x: wx, z: wz }
    grabbedRbRef.current = rbRef
    grabOnEnd.current    = onEnd
    if (controlsRef.current) controlsRef.current.enabled = false
  }, [controlsRef])

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragTarget.current) return
      const oc = camera as THREE.OrthographicCamera
      const ndc = new THREE.Vector2(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1,
      )
      raycaster.current.setFromCamera(ndc, oc)
      const pt = new THREE.Vector3()
      if (raycaster.current.ray.intersectPlane(GROUND_PLANE, pt)) {
        dragTarget.current.x = pt.x
        dragTarget.current.z = pt.z
      }
    }

    const onUp = () => {
      if (!dragTarget.current) return
      grabOnEnd.current?.()
      grabOnEnd.current    = null
      grabbedRbRef.current = null
      dragTarget.current   = null
      if (controlsRef.current) controlsRef.current.enabled = true
      document.body.style.cursor = 'default'
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [camera, controlsRef])

  const dragCtxValue = useMemo<DragControl>(() => ({ dragTarget, beginGrab }), [beginGrab])
  const showShadows  = zoom > ZOOM_MED

  return (
    <DragCtx.Provider value={dragCtxValue}>
      <ZoomProvider setZoom={setZoom} />
      <PanBoundary controlsRef={controlsRef} />

      <MapControls
        ref={controlsRef as never}
        enableRotate={false}
        enablePan={true}
        enableZoom={true}
        minZoom={BOARD_CONFIG.minZoom}
        maxZoom={BOARD_CONFIG.maxZoom}
        zoomSpeed={1.1}
        panSpeed={1.0}
        screenSpacePanning={false}
      />

      <ambientLight intensity={zoom > ZOOM_MED ? 1.4 : 2.2} color="#FFF5EC" />
      {zoom > ZOOM_FAR && (
        <>
          <directionalLight
            position={[20, 40, 25]} intensity={2.0} color="#FFFFFF"
            castShadow={showShadows}
            shadow-mapSize={[1024, 1024]}
            shadow-camera-left={-60} shadow-camera-right={60}
            shadow-camera-top={45}  shadow-camera-bottom={-45}
            shadow-camera-far={120} shadow-bias={-0.0005}
          />
          <directionalLight position={[-15, 25, -10]} intensity={0.5} color="#FFE8C8" />
        </>
      )}

      {showShadows && (
        <ContactShadows
          position={[0, 0, 0]} opacity={0.22} scale={120}
          blur={4} far={2} color="#7A5A48" resolution={512}
        />
      )}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[WORLD_W + 20, WORLD_H + 20]} />
        <meshStandardMaterial color="#EDE0CE" roughness={1} metalness={0} />
      </mesh>

      <Suspense fallback={null}>
        <Physics gravity={[0, -40, 0]}>
          <RigidBody type="fixed" position={[0, -0.08, 0]}>
            <CuboidCollider args={[WORLD_W / 2 + 10, 0.08, WORLD_H / 2 + 10]} />
          </RigidBody>
          {posts.map((post) => (
            <PhysicsPaper
              key={post.id}
              post={post}
              isNew={post.id === newPostId}
              isOwned={myPostIds.has(post.id)}
              zoom={zoom}
              onPaperClick={onPaperClick}
            />
          ))}
        </Physics>
      </Suspense>
    </DragCtx.Provider>
  )
}

// ─── Error boundary ───────────────────────────────────────────────────────────
class CanvasErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() { return { hasError: true } }
  render() { return this.state.hasError ? this.props.fallback : this.props.children }
}

// ─── Main export ──────────────────────────────────────────────────────────────
interface Props {
  posts: Post[]
  newPostId: string | null
  myPostIds: Set<string>
  onPaperClick: (post: Post) => void
  zoom: number
  onZoomChange: (z: number) => void
}

export default function PaperCanvas3D({ posts, newPostId, myPostIds, onPaperClick, zoom, onZoomChange }: Props) {
  const controlsRef = useRef<MapControlsImpl | null>(null)

  return (
    <ZoomCtx.Provider value={zoom}>
      <div className="fixed inset-0 w-full h-full" style={{ touchAction: 'none' }}>
        <CanvasErrorBoundary
          fallback={
            <div className="fixed inset-0" style={{ background: 'linear-gradient(160deg,#F7EFE5,#F3E4D1 60%,#FFF8EF)' }} />
          }
        >
          <Canvas
            orthographic
            camera={{ position: BOARD_CONFIG.cameraPosition, zoom: BOARD_CONFIG.defaultZoom }}
            shadows={zoom > BOARD_CONFIG.defaultZoom}
            gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
            dpr={[1, 1.5]}
          >
            <color attach="background" args={['#EDE0CE']} />
            <Suspense fallback={null}>
              <Scene
                posts={posts}
                newPostId={newPostId}
                myPostIds={myPostIds}
                zoom={zoom}
                setZoom={onZoomChange}
                onPaperClick={onPaperClick}
                controlsRef={controlsRef}
              />
            </Suspense>
          </Canvas>
        </CanvasErrorBoundary>
      </div>
    </ZoomCtx.Provider>
  )
}
