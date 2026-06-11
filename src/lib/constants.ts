import type { PaperColor, CrumpleStyle } from '@/types'

export const PAPER_COLORS: Record<PaperColor, { bg: string; label: string }> = {
  ivory:          { bg: '#FEFCE8', label: 'Ivory' },
  'pale-peach':   { bg: '#FFF0E4', label: 'Peach' },
  'muted-yellow': { bg: '#FEFBD0', label: 'Yellow' },
  'dusty-pink':   { bg: '#FFF0F3', label: 'Pink' },
  'light-sage':   { bg: '#EEF8F2', label: 'Sage' },
  'warm-gray':    { bg: '#F6F4F0', label: 'Gray' },
}

export const CRUMPLE_STYLES: Record<CrumpleStyle, { label: string }> = {
  ball:  { label: '구겨진 공' },
  flat:  { label: '납작하게' },
  crane: { label: '학' },
  boat:  { label: '배' },
}

export const PAPER_COLOR_OPTIONS = Object.keys(PAPER_COLORS) as PaperColor[]
export const CRUMPLE_STYLE_OPTIONS = Object.keys(CRUMPLE_STYLES) as CrumpleStyle[]

export const MAX_TITLE_LENGTH = 80
export const MAX_CONTENT_LENGTH = 1000
export const MAX_COMMENT_LENGTH = 500
export const MAX_ANONYMOUS_NAME_LENGTH = 30

export const CANVAS_VIRTUAL_WIDTH = 2000
export const CANVAS_VIRTUAL_HEIGHT = 1400

export const PAPER_WIDTH = 164
export const PAPER_HEIGHT = 148
