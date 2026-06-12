// ─── World coordinate system ──────────────────────────────────────────────────
// DB stores x_position (0–2000) and y_position (0–1400).
// Three.js world: X axis = left–right, Z axis = front–back, Y = height above floor.
// World is intentionally large so the canvas feels like a map.

export const WORLD_W = 100   // -50 to +50 in X
export const WORLD_H = 70    // -35 to +35 in Z

// DB → Three.js world XZ
export function dbToWorld(xDb: number, yDb: number): [number, number] {
  const wx = (xDb / 2000) * WORLD_W - WORLD_W / 2
  const wz = (yDb / 1400) * WORLD_H - WORLD_H / 2
  return [wx, wz]
}

// Three.js world XZ → DB
export function worldToDb(wx: number, wz: number): [number, number] {
  const xDb = ((wx + WORLD_W / 2) / WORLD_W) * 2000
  const yDb = ((wz + WORLD_H / 2) / WORLD_H) * 1400
  return [
    Math.max(0, Math.min(2000, xDb)),
    Math.max(0, Math.min(1400, yDb)),
  ]
}

// Orthographic zoom thresholds
export const ZOOM_FAR   = 20   // below → abstract colour dots
export const ZOOM_MED   = 40   // between FAR and MED → flat silhouettes
export const ZOOM_CLOSE = 80   // above → full 3D detail + shadows
