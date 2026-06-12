import * as THREE from 'three'
import type { CrumpleStyle } from '@/types'
import { seededRandom } from './seededRandom'

export function generateCrumpledGeometry(style: CrumpleStyle, seed: number): THREE.BufferGeometry {
  switch (style) {
    case 'ball':     return generateBallGeometry(seed)
    case 'flat':     return generateFlatSheetGeometry(seed)
    case 'crane':    return generateCraneGeometry(seed)
    case 'boat':     return generateBoatGeometry(seed)
    case 'airplane': return generateAirplaneGeometry(seed)
    default:         return generateBallGeometry(seed)
  }
}

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

// ─── Ball ────────────────────────────────────────────────────────────────────
function generateBallGeometry(seed: number): THREE.BufferGeometry {
  const rand = seededRandom(seed)

  const detail      = 2 + (seed % 2)
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

// ─── Flat crumpled sheet (rectangular, like the attached reference image) ────
function generateFlatSheetGeometry(seed: number): THREE.BufferGeometry {
  const rand = seededRandom(seed)

  // Grid mesh — more subdivisions = more wrinkle detail
  const segsX = 12, segsZ = 10
  const W = 1.9, D = 1.6

  const base = new THREE.PlaneGeometry(W, D, segsX, segsZ)
  // PlaneGeometry is in the XY plane — rotate to lay on XZ
  base.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2))

  const pos = base.attributes.position as THREE.BufferAttribute

  // Pre-generate noise table for 3 frequency layers
  const noiseA: number[] = [], noiseB: number[] = [], noiseC: number[] = []
  for (let i = 0; i < pos.count; i++) {
    noiseA.push((rand() - 0.5) * 0.28)
    noiseB.push((rand() - 0.5) * 0.14)
    noiseC.push((rand() - 0.5) * 0.07)
  }

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)

    // Low-frequency waves (big creases)
    const wave1 = Math.sin(x * 2.1 + rand() * 1.2) * 0.16
    const wave2 = Math.cos(z * 2.8 + rand() * 1.4) * 0.13

    // Medium wrinkles
    const wave3 = Math.sin((x + z) * 4.5 + rand() * 2) * 0.08

    // Per-vertex noise
    const bump = noiseA[i] + noiseB[i] + noiseC[i]

    // Edge curl — corners lift slightly
    const ex = Math.max(0, Math.abs(x) - W * 0.30) / (W * 0.20)
    const ez = Math.max(0, Math.abs(z) - D * 0.28) / (D * 0.22)
    const edgeLift = (ex * ex + ez * ez) * (0.18 + rand() * 0.12)

    pos.setY(i, wave1 + wave2 + wave3 + bump + edgeLift)
  }

  const geo = base.toNonIndexed()
  base.dispose()

  applyFloorOffset(geo)
  geo.computeVertexNormals()
  geo.computeBoundingBox()
  geo.computeBoundingSphere()
  return geo
}

// ─── Paper airplane ───────────────────────────────────────────────────────────
function generateAirplaneGeometry(seed: number): THREE.BufferGeometry {
  const rand = seededRandom(seed)
  const j    = (a: number) => (rand() - 0.5) * a
  type V3    = [number, number, number]

  const verts: number[] = []
  const tri   = (a: V3, b: V3, c: V3) => verts.push(...a, ...b, ...c)

  // Dart / delta-wing paper airplane
  // +Z = nose direction, wingspan along X, height along Y

  const NOSE:    V3 = [0,           0.04 + j(0.01),  0.90 + j(0.02)]
  const TAIL_L:  V3 = [-0.08 + j(0.01), 0,          -0.72]
  const TAIL_R:  V3 = [ 0.08 + j(0.01), 0,          -0.72]

  // Wing tips
  const WL:  V3 = [-1.0 + j(0.04), 0.02 + j(0.01), -0.20 + j(0.04)]
  const WR:  V3 = [ 1.0 + j(0.04), 0.02 + j(0.01), -0.20 + j(0.04)]

  // Center ridge fold
  const RIDGE_F: V3 = [0, 0.22 + j(0.02),  0.30 + j(0.03)]
  const RIDGE_B: V3 = [0, 0.12 + j(0.02), -0.50 + j(0.03)]

  // Upper fuselage triangles (the folded spine)
  tri(NOSE, RIDGE_F, TAIL_L)
  tri(NOSE, TAIL_R, RIDGE_F)
  tri(RIDGE_F, RIDGE_B, TAIL_L)
  tri(RIDGE_F, TAIL_R, RIDGE_B)

  // Left wing panel (two triangles)
  tri(NOSE, WL, RIDGE_F)
  tri(WL, RIDGE_B, RIDGE_F)
  tri(WL, TAIL_L, RIDGE_B)

  // Right wing panel
  tri(NOSE, RIDGE_F, WR)
  tri(WR, RIDGE_F, RIDGE_B)
  tri(WR, RIDGE_B, TAIL_R)

  // Trailing edge flap
  tri(TAIL_L, WL,   [0, 0, -0.80 + j(0.03)])
  tri(TAIL_R, [0, 0, -0.80 + j(0.03)], WR)

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  applyFloorOffset(geo)
  geo.computeVertexNormals()
  geo.computeBoundingBox()
  geo.computeBoundingSphere()
  return geo
}

// ─── Crane ────────────────────────────────────────────────────────────────────
function generateCraneGeometry(seed: number): THREE.BufferGeometry {
  const rand = seededRandom(seed)
  const j    = (a: number) => (rand() - 0.5) * a
  type V3    = [number, number, number]

  const verts: number[] = []
  const tri   = (a: V3, b: V3, c: V3) => verts.push(...a, ...b, ...c)

  const BW = 0.22, BH = 0.18, BL = 0.27

  const CT:  V3 = [0,    BH, 0]
  const BLv: V3 = [-BW,  0,  0]
  const BRv: V3 = [ BW,  0,  0]
  const BFv: V3 = [0,    0,  BL]
  const BBv: V3 = [0,    0, -BL]

  tri(CT, BLv, BFv); tri(CT, BFv, BRv); tri(CT, BRv, BBv); tri(CT, BBv, BLv)

  const WX  = 1.05 + rand() * 0.18
  const WH  = 0.40 + rand() * 0.14
  const WTL: V3 = [-WX + j(0.06), WH + j(0.06), j(0.10)]
  const WTR: V3 = [ WX + j(0.06), WH + j(0.06), j(0.10)]

  tri(BFv, WTL, BLv); tri(BBv, BLv, WTL)
  tri(BFv, BRv, WTR); tri(BBv, WTR, BRv)

  const NM: V3 = [j(0.04), 0.29, BL + 0.26]
  const HT: V3 = [j(0.05), 0.45 + j(0.04), BL + 0.52]

  tri(BFv, BRv, NM); tri(BFv, NM, BLv)
  tri(NM, [ 0.07, 0.24, BL + 0.15], HT)
  tri(NM, HT, [-0.07, 0.24, BL + 0.15])
  tri([ 0.07, 0.24, BL + 0.15], [ 0.06, 0.38, BL + 0.38], HT)
  tri([-0.07, 0.24, BL + 0.15], HT, [-0.06, 0.38, BL + 0.38])

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

// ─── Boat ─────────────────────────────────────────────────────────────────────
function generateBoatGeometry(seed: number): THREE.BufferGeometry {
  const rand = seededRandom(seed)
  const j    = (a: number) => (rand() - 0.5) * a
  type V3    = [number, number, number]

  const verts: number[] = []
  const tri   = (a: V3, b: V3, c: V3) => verts.push(...a, ...b, ...c)

  const HL = 0.70, HW = 0.36, HH = 0.38

  const BFL: V3 = [-HW + j(0.03), 0,    HL * 0.52 + j(0.03)]
  const BFR: V3 = [ HW + j(0.03), 0,    HL * 0.52 + j(0.03)]
  const BBL: V3 = [-HW + j(0.03), 0,   -HL * 0.52 + j(0.03)]
  const BBR: V3 = [ HW + j(0.03), 0,   -HL * 0.52 + j(0.03)]
  const TFL: V3 = [-HW * 0.82 + j(0.03), HH,  HL * 0.42 + j(0.03)]
  const TFR: V3 = [ HW * 0.82 + j(0.03), HH,  HL * 0.42 + j(0.03)]
  const TBL: V3 = [-HW * 0.82 + j(0.03), HH, -HL * 0.42 + j(0.03)]
  const TBR: V3 = [ HW * 0.82 + j(0.03), HH, -HL * 0.42 + j(0.03)]
  const BOW:   V3 = [j(0.04), HH * 0.52 + j(0.04),  HL + j(0.05)]
  const STERN: V3 = [j(0.04), HH * 0.52 + j(0.04), -HL + j(0.05)]

  tri(BFL, BFR, BBR); tri(BFL, BBR, BBL)
  tri(BBL, BFL, TFL); tri(BBL, TFL, TBL)
  tri(BFR, BBR, TBR); tri(BFR, TBR, TFR)
  tri(BFR, BOW, BFL)
  tri(TFR, TFL, BOW)
  tri(BFR, TFR, BOW)
  tri(BFL, BOW, TFL)
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
