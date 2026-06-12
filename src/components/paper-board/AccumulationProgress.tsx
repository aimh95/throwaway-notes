'use client'

import { useState } from 'react'
import { BOARD_CONFIG } from '@/lib/paper/boardConfig'
import type { Post } from '@/types'

interface Props {
  posts: Post[]
  zoom: number
  onResetView: () => void
}

export default function AccumulationProgress({ posts, zoom, onResetView }: Props) {
  const [hovered, setHovered] = useState(false)

  const total    = posts.length
  const target   = BOARD_CONFIG.targetPostCount
  const progress = Math.min(total / target, 1)
  const pct      = Math.round(progress * 100)

  // Normalised zoom indicator (0 = min, 1 = max)
  const zoomNorm = (zoom - BOARD_CONFIG.minZoom) / (BOARD_CONFIG.maxZoom - BOARD_CONFIG.minZoom)

  return (
    <div
      className="fixed right-4 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-3"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ userSelect: 'none' }}
    >
      {/* Zoom indicator — tiny tick */}
      <div
        className="flex flex-col items-center gap-0.5"
        style={{ opacity: hovered ? 0.55 : 0.18, transition: 'opacity 0.3s' }}
      >
        <span style={{ fontSize: 8, color: '#7A5A48', letterSpacing: '0.1em', writingMode: 'vertical-rl' }}>
          ZOOM
        </span>
        <div
          style={{
            width: 2,
            height: 40,
            background: 'rgba(122,90,72,0.18)',
            borderRadius: 2,
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              bottom: `${zoomNorm * 100}%`,
              left: -2,
              width: 6,
              height: 2,
              background: '#B9855B',
              borderRadius: 1,
              transform: 'translateY(1px)',
            }}
          />
        </div>
      </div>

      {/* Accumulation progress bar */}
      <div
        style={{
          width: 3,
          height: 140,
          background: 'rgba(122,90,72,0.12)',
          borderRadius: 4,
          position: 'relative',
          overflow: 'hidden',
        }}
        title={hovered ? `${total} / ${target} 종이` : undefined}
      >
        {/* Filled portion */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: `${pct}%`,
            background: 'linear-gradient(to top, #B9855B, #D4A97A)',
            borderRadius: 4,
            transition: 'height 0.8s cubic-bezier(0.22,1,0.36,1)',
          }}
        />

        {/* Tick marks every 25% */}
        {[25, 50, 75].map((t) => (
          <div
            key={t}
            style={{
              position: 'absolute',
              bottom: `${t}%`,
              left: -3,
              width: 9,
              height: 1,
              background: 'rgba(122,90,72,0.25)',
            }}
          />
        ))}
      </div>

      {/* Count — only on hover */}
      <div
        style={{
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.25s',
          pointerEvents: hovered ? 'auto' : 'none',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 9, color: '#7A5A48', letterSpacing: '0.06em', lineHeight: 1.4 }}>
          {total}
          <br />
          <span style={{ opacity: 0.5 }}>/ {target}</span>
        </p>
      </div>

      {/* Reset view button */}
      <button
        type="button"
        onClick={onResetView}
        title="전체 보기"
        style={{
          opacity: hovered ? 0.45 : 0.15,
          transition: 'opacity 0.3s',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 4,
          color: '#7A5A48',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <rect x="8" y="8" width="8" height="8" rx="1" />
        </svg>
      </button>
    </div>
  )
}
