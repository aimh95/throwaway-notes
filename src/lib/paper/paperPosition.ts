import { CANVAS_VIRTUAL_WIDTH, CANVAS_VIRTUAL_HEIGHT } from '@/lib/constants'

// World space bounds for the 3D canvas
export const WORLD_X_RANGE = 20  // -10 to 10
export const WORLD_Z_RANGE = 14  // -7  to 7

export function dbToWorld(xDb: number, yDb: number): [number, number] {
  const wx = (xDb / CANVAS_VIRTUAL_WIDTH - 0.5) * WORLD_X_RANGE
  const wz = (yDb / CANVAS_VIRTUAL_HEIGHT - 0.5) * WORLD_Z_RANGE
  return [wx, wz]
}
