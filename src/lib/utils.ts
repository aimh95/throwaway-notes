import type { PaperColor, CreatePostInput, CreateCommentInput } from '@/types'
import {
  PAPER_COLORS,
  CANVAS_VIRTUAL_WIDTH,
  PAPER_WIDTH,
  MAX_CONTENT_LENGTH,
  MAX_TITLE_LENGTH,
  MAX_COMMENT_LENGTH,
  MAX_ANONYMOUS_NAME_LENGTH,
} from './constants'

export function getPaperColorToken(color: PaperColor): string {
  // Direct hex color
  if (color.startsWith('#')) return color
  // Named preset
  return PAPER_COLORS[color]?.bg ?? '#FEFCE8'
}

export function generatePaperPosition(): { x: number; y: number } {
  const margin = PAPER_WIDTH
  return {
    x: margin + Math.random() * (CANVAS_VIRTUAL_WIDTH - margin * 2),
    y: margin + Math.random() * (1400 - margin * 2),
  }
}

export function generateRotation(): number {
  return (Math.random() - 0.5) * 28
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return '방금'
  if (diffMin < 60) return `${diffMin}분 전`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}시간 전`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 30) return `${diffDay}일 전`
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

export interface ValidationError {
  field: string
  message: string
}

export function validatePostInput(input: Partial<CreatePostInput>): ValidationError[] {
  const errors: ValidationError[] = []
  if (!input.content?.trim()) {
    errors.push({ field: 'content', message: '내용을 입력해주세요.' })
  } else if (input.content.trim().length > MAX_CONTENT_LENGTH) {
    errors.push({ field: 'content', message: `내용은 ${MAX_CONTENT_LENGTH}자 이하로 입력해주세요.` })
  }
  if (input.title && input.title.length > MAX_TITLE_LENGTH) {
    errors.push({ field: 'title', message: `제목은 ${MAX_TITLE_LENGTH}자 이하로 입력해주세요.` })
  }
  if (input.anonymous_name && input.anonymous_name.length > MAX_ANONYMOUS_NAME_LENGTH) {
    errors.push({ field: 'anonymous_name', message: `이름은 ${MAX_ANONYMOUS_NAME_LENGTH}자 이하로 입력해주세요.` })
  }
  return errors
}

export function validateCommentInput(input: Partial<CreateCommentInput>): ValidationError[] {
  const errors: ValidationError[] = []
  if (!input.content?.trim()) {
    errors.push({ field: 'content', message: '내용을 입력해주세요.' })
  } else if (input.content.trim().length > MAX_COMMENT_LENGTH) {
    errors.push({ field: 'content', message: `댓글은 ${MAX_COMMENT_LENGTH}자 이하로 입력해주세요.` })
  }
  if (input.anonymous_name && input.anonymous_name.length > MAX_ANONYMOUS_NAME_LENGTH) {
    errors.push({ field: 'anonymous_name', message: `이름은 ${MAX_ANONYMOUS_NAME_LENGTH}자 이하로 입력해주세요.` })
  }
  return errors
}
