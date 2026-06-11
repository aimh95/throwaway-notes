import * as THREE from 'three'
import type { CrumpleStyle } from '@/types'
import { seededRandom } from './seededRandom'

export function generateCrumpledGeometry(style: CrumpleStyle, seed: number): THREE.BufferGeometry {
  switch (style) {
    case 'ball':  return generateBallGeometry(seed)
    case 'flat':  return generateFlatGeometry(seed)
    case 'crane': return generateCraneGeometry(seed)
    case 'boat':  return generateBoatGeometry(seed)
    default:      return generateBallGeometry(seed)  // DB may have old style names
  }
}

// Shift geometry so minimum Y is 0 — sits flat on the floor
function applyFloorOffset(geo: THREE.BufferGeometry) {
  geo.computeBoundingBox()
  const minY = geo.boundingBox!.min.y
  if (Math.abs(minY) < 1e-6) return
  const pos = geo.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, pos.getY(i) - minY)
  }
  geo.computeBoundingBox()
}

// Ball: one unified crumpled-sphere shape — varied by seed
function generateBallGeometry(seed: number): THREE.BufferGeometry {
  const rand = seededRandom(seed)

  const detail      = 2 + (seed % 2)                  // 2 or 3
  const amplitude   = 0.10 + rand() * 0.22
  const pinchProb   = 0.05 + rand() * 0.23
  const pinchDepth  = 0.08 + rand() * 0.27
  const flattenY    = 0.34 + rand() * 0.20
  const finalRadius = 0.82 + rand() * 0.13

  const base = new THREE.IcosahedronGeometry(1.0, detail)
  const pos  = base.attributes.position as THREE.BufferAttribute

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
    const len = Math.sqrt(x * x + y * y + z * z) || 1
    const nx = x / len, ny = y / len, nz = z / len
    const disp  = (rand() - 0.35) * amplitude * 2
    const pinch = rand() < pinchProb ? -(rand() * pinchDepth * 1.6) : 0
    const r     = len + disp + pinch
    pos.setXYZ(i, nx * r, ny * r, nz * r)
  }

  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, pos.getY(i) * flattenY)
  }

  const geo  = base.toNonIndexed()
  base.dispose()

  const fPos = geo.attributes.position as THREE.BufferAttribute
  geo.computeBoundingBox()
  const minY = geo.boundingBox!.min.y
  for (let i = 0; i < fPos.count; i++) {
    fPos.setXYZ(i,
      fPos.getX(i) * finalRadius,
      (fPos.getY(i) - minY) * finalRadius,
      fPos.getZ(i) * finalRadius,
    )
  }

  geo.computeVertexNormals()
  geo.computeBoundingBox()
  geo.computeBoundingSphere()
  return geo
}

// Flat: crumpled paper squashed into a disc (stepped on)
function generateFlatGeometry(seed: number): THREE.BufferGeometry {
  const rand = seededRandom(seed)

  const base = new THREE.IcosahedronGeometry(1.0, 2)
  const pos  = base.attributes.position as THREE.BufferAttribute

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
    const len = Math.sqrt(x * x + y * y + z * z) || 1
    const nx = x / len, ny = y / len, nz = z / len
    const disp  = (rand() - 0.40) * 0.30
    const pinch = rand() < 0.25 ? -(rand() * 0.22) : 0
    const r     = len + disp + pinch
    pos.setXYZ(i, nx * r, ny * r, nz * r)
  }

  // Very flat Y (like paper stepped on)
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, pos.getY(i) * 0.13)
  }

  const geo   = base.toNonIndexed()
  base.dispose()

  const fPos  = geo.attributes.position as THREE.BufferAttribute
  const scale = 1.15
  geo.computeBoundingBox()
  const minY  = geo.boundingBox!.min.y
  for (let i = 0; i < fPos.count; i++) {
    fPos.setXYZ(i,
      fPos.getX(i) * scale,
      (fPos.getY(i) - minY) * scale,
      fPos.getZ(i) * scale,
    )
  }

  geo.computeVertexNormals()
  geo.computeBoundingBox()
  geo.computeBoundingSphere()
  return geo
}

// Crane: origami crane shape
function generateCraneGeometry(seed: number): THREE.BufferGeometry {
  const rand = seededRandom(seed)
  const j    = (a: number) => (rand() - 0.5) * a
  type V3    = [number, number, number]

  const verts: number[] = []
  const tri   = (a: V3, b: V3, c: V3) => verts.push(...a, ...b, ...c)

  const BW = 0.22, BH = 0.18, BL = 0.27

  // Body: flat diamond with raised centre
  const CT:  V3 = [0,    BH, 0]
  const BLv: V3 = [-BW,  0,  0]
  const BRv: V3 = [ BW,  0,  0]
  const BFv: V3 = [0,    0,  BL]
  const BBv: V3 = [0,    0, -BL]

  tri(CT, BLv, BFv); tri(CT, BFv, BRv); tri(CT, BRv, BBv); tri(CT, BBv, BLv)

  // Wings — each is 2 triangles
  const WX  = 1.05 + rand() * 0.18
  const WH  = 0.40 + rand() * 0.14
  const WTL: V3 = [-WX + j(0.06), WH + j(0.06), j(0.10)]
  const WTR: V3 = [ WX + j(0.06), WH + j(0.06), j(0.10)]

  tri(BFv, WTL, BLv); tri(BBv, BLv, WTL)
  tri(BFv, BRv, WTR); tri(BBv, WTR, BRv)

  // Head / neck
  const NM: V3 = [j(0.04), 0.29, BL + 0.26]
  const HT: V3 = [j(0.05), 0.45 + j(0.04), BL + 0.52]

  tri(BFv, BRv, NM); tri(BFv, NM, BLv)
  tri(NM, [ 0.07, 0.24, BL + 0.15], HT)
  tri(NM, HT, [-0.07, 0.24, BL + 0.15])
  tri([ 0.07, 0.24, BL + 0.15], [ 0.06, 0.38, BL + 0.38], HT)
  tri([-0.07, 0.24, BL + 0.15], HT, [-0.06, 0.38, BL + 0.38])

  // Tail
  const TM: V3 = [j(0.04), 0.24, -BL - 0.22]
  const TT: V3 = [j(0.05), 0.38 + j(0.04), -BL - 0.48]

  tri(BBv, BLv, TM); tri(BBv, TM, BRv)
  tri(TM, TT, [ 0.07, 0.22, -BL - 0.32])
  tri(TM, [-0.07, 0.22, -BL - 0.32], TT)
  tri([ 0.07, 0.22, -BL - 0.32], [ 0.06, 0.34, -BL - 0.40], TT)
  tri([-0.07, 0.22, -BL - 0.32], TT, [-0.06, 0.34, -BL - 0.40])

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  applyFloorOffset(geo)
  geo.computeVertexNormals()
  geo.computeBoundingBox()
  geo.computeBoundingSphere()
  return geo
}

// Boat: origami paper boat shape
function generateBoatGeometry(seed: number): THREE.BufferGeometry {
  const rand = seededRandom(seed)
  const j    = (a: number) => (rand() - 0.5) * a
  type V3    = [number, number, number]

  const verts: number[] = []
  const tri   = (a: V3, b: V3, c: V3) => verts.push(...a, ...b, ...c)

  const HL = 0.70, HW = 0.36, HH = 0.38

  // Hull corners — bottom
  const BFL: V3 = [-HW + j(0.03), 0,    HL * 0.52 + j(0.03)]
  const BFR: V3 = [ HW + j(0.03), 0,    HL * 0.52 + j(0.03)]
  const BBL: V3 = [-HW + j(0.03), 0,   -HL * 0.52 + j(0.03)]
  const BBR: V3 = [ HW + j(0.03), 0,   -HL * 0.52 + j(0.03)]
  // Hull top edges (slightly inset)
  const TFL: V3 = [-HW * 0.82 + j(0.03), HH,  HL * 0.42 + j(0.03)]
  const TFR: V3 = [ HW * 0.82 + j(0.03), HH,  HL * 0.42 + j(0.03)]
  const TBL: V3 = [-HW * 0.82 + j(0.03), HH, -HL * 0.42 + j(0.03)]
  const TBR: V3 = [ HW * 0.82 + j(0.03), HH, -HL * 0.42 + j(0.03)]
  // Bow and stern points
  const BOW:   V3 = [j(0.04), HH * 0.52 + j(0.04),  HL + j(0.05)]
  const STERN: V3 = [j(0.04), HH * 0.52 + j(0.04), -HL + j(0.05)]

  // Bottom
  tri(BFL, BFR, BBR); tri(BFL, BBR, BBL)
  // Side walls
  tri(BBL, BFL, TFL); tri(BBL, TFL, TBL)
  tri(BFR, BBR, TBR); tri(BFR, TBR, TFR)
  // Bow
  tri(BFR, BOW, BFL)
  tri(TFR, TFL, BOW)
  tri(BFR, TFR, BOW)
  tri(BFL, BOW, TFL)
  // Stern
  tri(BBL, STERN, BBR)
  tri(TBL, TBR, STERN)
  tri(BBR, STERN, TBR)
  tri(BBL, TBL, STERN)

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  applyFloorOffset(geo)
  geo.computeVertexNormals()
  geo.computeBoundingBox()
  geo.computeBoundingSphere()
  return geo
}
