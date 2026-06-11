'use client'

import type { PaperColor, CrumpleStyle } from '@/types'
import {
  PAPER_COLORS,
  CRUMPLE_STYLES,
  PAPER_COLOR_OPTIONS,
  CRUMPLE_STYLE_OPTIONS,
} from '@/lib/constants'

interface Props {
  selectedColor: PaperColor
  selectedStyle: CrumpleStyle
  onColorChange: (c: PaperColor) => void
  onStyleChange: (s: CrumpleStyle) => void
}

export default function PaperCustomizer({
  selectedColor,
  selectedStyle,
  onColorChange,
  onStyleChange,
}: Props) {
  return (
    <div className="flex flex-col gap-4">
      {/* Color picker */}
      <div className="flex gap-2 flex-wrap">
        {PAPER_COLOR_OPTIONS.map((color) => (
          <button
            key={color}
            type="button"
            title={PAPER_COLORS[color].label}
            onClick={() => onColorChange(color)}
            className="w-7 h-7 rounded-full transition-transform"
            style={{
              background: PAPER_COLORS[color].bg,
              boxShadow:
                selectedColor === color
                  ? `0 0 0 2px #B9855B, 0 0 0 4px ${PAPER_COLORS[color].bg}`
                  : '0 1px 3px rgba(0,0,0,0.15)',
              transform: selectedColor === color ? 'scale(1.15)' : 'scale(1)',
            }}
            aria-pressed={selectedColor === color}
          />
        ))}
      </div>

      {/* Style picker */}
      <div className="flex gap-1.5 flex-wrap">
        {CRUMPLE_STYLE_OPTIONS.map((style) => (
          <button
            key={style}
            type="button"
            onClick={() => onStyleChange(style)}
            className="px-3 py-1 rounded text-[11px] transition-all"
            style={{
              background: selectedStyle === style ? 'rgba(185,133,91,0.18)' : 'transparent',
              color: selectedStyle === style ? '#B9855B' : '#9D8878',
              fontWeight: selectedStyle === style ? 600 : 400,
              border: `1px solid ${selectedStyle === style ? 'rgba(185,133,91,0.45)' : 'rgba(157,136,120,0.25)'}`,
            }}
            aria-pressed={selectedStyle === style}
          >
            {CRUMPLE_STYLES[style].label}
          </button>
        ))}
      </div>
    </div>
  )
}
