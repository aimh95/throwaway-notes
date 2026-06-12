'use client'

import { useRef, useEffect } from 'react'
import type { Post } from '@/types'
import { dbToWorld, WORLD_W, WORLD_H } from '@/lib/paper/worldCoordinates'
import { getPaperColorToken } from '@/lib/utils'

const MAP_W = 88
const MAP_H = Math.round(MAP_W * (WORLD_H / WORLD_W))

interface Props {
  posts: Post[]
  // Current viewport in world coordinates (approximate)
  viewportWorld?: { x: number; z: number; w: number; h: number }
}

export default function MiniMap({ posts, viewportWorld }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, MAP_W, MAP_H)

    // Background
    ctx.fillStyle = '#EDE0CE'
    ctx.fillRect(0, 0, MAP_W, MAP_H)

    // Very faint border grid
    ctx.strokeStyle = 'rgba(122,90,72,0.07)'
    ctx.lineWidth = 0.5
    for (let i = 1; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(MAP_W * i / 4, 0); ctx.lineTo(MAP_W * i / 4, MAP_H); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, MAP_H * i / 4); ctx.lineTo(MAP_W, MAP_H * i / 4); ctx.stroke()
    }

    // Papers as colour dots
    for (const post of posts) {
      const [wx, wz] = dbToWorld(post.x_position, post.y_position)
      const px = (wx + WORLD_W / 2) / WORLD_W * MAP_W
      const py = (wz + WORLD_H / 2) / WORLD_H * MAP_H

      const hexColor = getPaperColorToken(post.paper_color)
      ctx.fillStyle = hexColor
      ctx.globalAlpha = 0.85
      ctx.beginPath()
      ctx.arc(px, py, 1.5, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    // Viewport rect
    if (viewportWorld) {
      const vx = (viewportWorld.x - viewportWorld.w / 2 + WORLD_W / 2) / WORLD_W * MAP_W
      const vy = (viewportWorld.z - viewportWorld.h / 2 + WORLD_H / 2) / WORLD_H * MAP_H
      const vw = viewportWorld.w / WORLD_W * MAP_W
      const vh = viewportWorld.h / WORLD_H * MAP_H
      ctx.strokeStyle = 'rgba(122,90,72,0.55)'
      ctx.lineWidth = 1
      ctx.strokeRect(vx, vy, vw, vh)
    }
  }, [posts, viewportWorld])

  return (
    <div
      className="fixed right-4 bottom-24 z-30 opacity-40 hover:opacity-75 transition-opacity"
      style={{
        borderRadius: 4,
        overflow: 'hidden',
        border: '1px solid rgba(122,90,72,0.20)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
      }}
    >
      <canvas ref={canvasRef} width={MAP_W} height={MAP_H} style={{ display: 'block' }} />
    </div>
  )
}
