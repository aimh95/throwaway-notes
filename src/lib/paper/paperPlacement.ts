import type { Post } from '@/types'
import { WORLD_W, WORLD_H, dbToWorld } from './worldCoordinates'

// ─── Grid-based density map ───────────────────────────────────────────────────
const COLS = 10
const ROWS = 7
const CELL_W = WORLD_W / COLS
const CELL_H = WORLD_H / ROWS

function cellIndex(wx: number, wz: number): number {
  const col = Math.floor((wx + WORLD_W / 2) / CELL_W)
  const row = Math.floor((wz + WORLD_H / 2) / CELL_H)
  return Math.max(0, Math.min(COLS * ROWS - 1, row * COLS + col))
}

// ─── Smart organic placement ──────────────────────────────────────────────────
// Returns DB-space coordinates (0–2000, 0–1400) for a new paper.
// Prefers cells that are less populated, biased slightly toward the centre.
export function computeSmartPlacement(posts: Post[]): { x: number; y: number } {
  // Build density map
  const density = new Float32Array(COLS * ROWS)
  for (const p of posts) {
    const [wx, wz] = dbToWorld(p.x_position, p.y_position)
    density[cellIndex(wx, wz)] += 1
  }

  // Score each cell: lower density = higher score; add center bias
  const scores = new Float32Array(COLS * ROWS)
  let totalScore = 0
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const idx = row * COLS + col
      // Cell centre in world space
      const cx = (col + 0.5) * CELL_W - WORLD_W / 2
      const cz = (row + 0.5) * CELL_H - WORLD_H / 2
      // Distance from world centre, normalised 0–1
      const dist = Math.sqrt((cx / (WORLD_W / 2)) ** 2 + (cz / (WORLD_H / 2)) ** 2)
      // Prefer less populated, slightly closer to centre
      const score = 1 / (density[idx] + 1) * (1 - dist * 0.3)
      scores[idx] = score
      totalScore += score
    }
  }

  // Weighted random pick
  let rand = Math.random() * totalScore
  let chosen = 0
  for (let i = 0; i < scores.length; i++) {
    rand -= scores[i]
    if (rand <= 0) { chosen = i; break }
  }

  const chosenRow = Math.floor(chosen / COLS)
  const chosenCol = chosen % COLS

  // Jitter within cell (organic scatter, not grid-aligned)
  const jx = (Math.random() - 0.5) * CELL_W * 0.85
  const jz = (Math.random() - 0.5) * CELL_H * 0.85

  const wx = (chosenCol + 0.5) * CELL_W - WORLD_W / 2 + jx
  const wz = (chosenRow + 0.5) * CELL_H - WORLD_H / 2 + jz

  // Convert back to DB space
  const xDb = ((wx + WORLD_W / 2) / WORLD_W) * 2000
  const yDb = ((wz + WORLD_H / 2) / WORLD_H) * 1400

  return {
    x: Math.max(100, Math.min(1900, xDb)),
    y: Math.max(100, Math.min(1300, yDb)),
  }
}
