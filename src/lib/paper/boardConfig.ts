import { WORLD_W, WORLD_H } from './worldCoordinates'

export const BOARD_CONFIG = {
  // World
  worldWidth:  WORLD_W,
  worldHeight: WORLD_H,

  // How many papers "complete" the collective artwork (for progress bar)
  targetPostCount: 500,

  // Camera
  defaultZoom: 55,
  minZoom:     12,
  maxZoom:     300,
  cameraPosition: [0, 22, 12] as [number, number, number],
  cameraTarget:   [0, 0,  0]  as [number, number, number],

  // Pan bounds — keep the world within view
  panMinX: -WORLD_W / 2 - 5,
  panMaxX:  WORLD_W / 2 + 5,
  panMinZ: -WORLD_H / 2 - 5,
  panMaxZ:  WORLD_H / 2 + 5,
} as const
