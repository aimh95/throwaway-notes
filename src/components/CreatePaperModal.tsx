'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { PaperColor, CrumpleStyle, CreatePostInput } from '@/types'
import { supabase } from '@/lib/supabase'
import {
  validatePostInput,
  generatePaperPosition,
  generateRotation,
  getPaperColorToken,
} from '@/lib/utils'
import {
  MAX_CONTENT_LENGTH,
  MAX_TITLE_LENGTH,
  PAPER_COLORS,
  CRUMPLE_STYLES,
  PAPER_COLOR_OPTIONS,
  CRUMPLE_STYLE_OPTIONS,
} from '@/lib/constants'
import type { Post } from '@/types'

interface Props {
  onClose: () => void
  onCreated: (post: Post) => void
}

// Lined paper background (very subtle ruled lines, like a letter pad)
const LINED_BG = `repeating-linear-gradient(
  transparent 0px,
  transparent 27px,
  rgba(63,52,43,0.07) 27px,
  rgba(63,52,43,0.07) 28px
)`

export default function CreatePaperModal({ onClose, onCreated }: Props) {
  const [title, setTitle]               = useState('')
  const [content, setContent]           = useState('')
  const [anonymousName, setAnonymousName] = useState('')
  const [paperColor, setPaperColor]     = useState<PaperColor>('ivory')
  const [crumpleStyle, setCrumpleStyle] = useState<CrumpleStyle>('ball')
  const [loading, setLoading]           = useState(false)
  const [errors, setErrors]             = useState<Record<string, string>>({})
  const [submitted, setSubmitted]       = useState(false)

  const handleSubmit = useCallback(async () => {
    const { x, y } = generatePaperPosition()
    const rotation  = generateRotation()

    const input: CreatePostInput = {
      title:          title.trim() || undefined,
      content:        content.trim(),
      paper_color:    paperColor,
      x_position:     x,
      y_position:     y,
      rotation,
      crumple_style:  crumpleStyle,
      anonymous_name: anonymousName.trim() || undefined,
    }

    const errs = validatePostInput(input)
    if (errs.length > 0) {
      const map: Record<string, string> = {}
      errs.forEach((e) => { map[e.field] = e.message })
      setErrors(map)
      return
    }

    setLoading(true)
    setErrors({})

    const { data, error } = await supabase
      .from('posts')
      .insert([{
        title:          input.title ?? null,
        content:        input.content,
        paper_color:    input.paper_color,
        x_position:     input.x_position,
        y_position:     input.y_position,
        rotation:       input.rotation,
        crumple_style:  input.crumple_style,
        anonymous_name: input.anonymous_name ?? null,
      }])
      .select()
      .single()

    setLoading(false)

    if (error || !data) {
      setErrors({ global: '저장에 실패했습니다.' })
      return
    }

    setSubmitted(true)
    setTimeout(() => { onCreated(data as Post); onClose() }, 650)
  }, [title, content, anonymousName, paperColor, crumpleStyle, onCreated, onClose])

  const bg = getPaperColorToken(paperColor)

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0"
          style={{ background: 'rgba(18,12,6,0.72)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        />

        {/* Paper sheet — the writing surface */}
        <motion.div
          className="relative z-10 w-full sm:max-w-xl mx-auto sm:rounded-lg overflow-hidden flex flex-col"
          style={{
            background: bg,
            maxHeight: '92dvh',
            boxShadow: '0 28px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(63,52,43,0.08), inset 2px 2px 10px rgba(255,255,255,0.35)',
          }}
          initial={submitted ? undefined : { y: 56, opacity: 0, scale: 0.98 }}
          animate={submitted
            ? { scale: 0.84, rotate: -7, opacity: 0, y: 60 }
            : { y: 0, opacity: 1, scale: 1 }
          }
          exit={{ y: 48, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 360, damping: 34 }}
        >
          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-7 h-7 flex items-center justify-center rounded-full transition-opacity opacity-35 hover:opacity-60"
            style={{ color: '#3F342B' }}
            aria-label="닫기"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="1" y1="1" x2="13" y2="13" /><line x1="13" y1="1" x2="1" y2="13" />
            </svg>
          </button>

          {/* Writing area — lined paper feel */}
          <div
            className="flex-1 overflow-y-auto px-8 pt-10 pb-4 flex flex-col gap-0"
            style={{ backgroundImage: LINED_BG }}
          >
            {/* Title */}
            <input
              type="text"
              placeholder="제목"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={MAX_TITLE_LENGTH}
              className="w-full bg-transparent outline-none leading-7 placeholder:opacity-20"
              style={{
                color: '#3F342B',
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: '1.05rem',
                fontWeight: 500,
                letterSpacing: '0.01em',
                lineHeight: '28px',
                height: 28,
                marginBottom: 0,
              }}
            />

            {/* Content */}
            <textarea
              placeholder="지금 마음에 있는 걸 적어요."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={MAX_CONTENT_LENGTH}
              className="w-full bg-transparent outline-none resize-none placeholder:opacity-25"
              style={{
                color: '#3F342B',
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: '0.925rem',
                lineHeight: '28px',
                minHeight: '196px',
                paddingTop: 0,
                paddingBottom: 0,
              }}
              rows={7}
            />

            {errors.content && (
              <p className="text-xs mt-1" style={{ color: '#c0392b' }}>{errors.content}</p>
            )}
            {errors.global && (
              <p className="text-xs mt-1" style={{ color: '#c0392b' }}>{errors.global}</p>
            )}

            {/* Char count — very subtle */}
            <div className="flex justify-end mt-1">
              <span className="text-[10px] opacity-25" style={{ color: '#3F342B' }}>
                {content.length}/{MAX_CONTENT_LENGTH}
              </span>
            </div>
          </div>

          {/* Toolbar — bottom strip */}
          <div
            className="flex flex-col gap-2 px-8 py-4"
            style={{
              borderTop: '1px solid rgba(63,52,43,0.10)',
              background: 'rgba(63,52,43,0.02)',
            }}
          >
            {/* Row 1: colors + styles */}
            <div className="flex items-center gap-4 flex-wrap">
              {/* Color swatches */}
              <div className="flex gap-1.5">
                {PAPER_COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    title={PAPER_COLORS[color].label}
                    onClick={() => setPaperColor(color)}
                    className="rounded-full transition-all"
                    style={{
                      width: 18,
                      height: 18,
                      background: PAPER_COLORS[color].bg,
                      outline: paperColor === color
                        ? '2px solid #B9855B'
                        : '1.5px solid rgba(63,52,43,0.18)',
                      outlineOffset: 1,
                      transform: paperColor === color ? 'scale(1.2)' : 'scale(1)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    }}
                    aria-pressed={paperColor === color}
                  />
                ))}
              </div>

              {/* Style chips */}
              <div className="flex gap-1">
                {CRUMPLE_STYLE_OPTIONS.map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setCrumpleStyle(style)}
                    className="text-[10px] px-2 py-0.5 rounded transition-all leading-5"
                    style={{
                      background: crumpleStyle === style ? 'rgba(63,52,43,0.14)' : 'transparent',
                      color: crumpleStyle === style ? '#3F342B' : '#9D8878',
                      fontWeight: crumpleStyle === style ? 500 : 400,
                      letterSpacing: '0.02em',
                    }}
                    aria-pressed={crumpleStyle === style}
                  >
                    {CRUMPLE_STYLES[style].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 2: name + submit */}
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="익명 이름"
                value={anonymousName}
                onChange={(e) => setAnonymousName(e.target.value)}
                className="flex-1 bg-transparent outline-none text-xs placeholder:opacity-30"
                style={{ color: '#3F342B', letterSpacing: '0.01em' }}
              />

              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || submitted}
                className="flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-medium transition-opacity disabled:opacity-50"
                style={{ background: '#B9855B', color: '#fff', letterSpacing: '0.03em' }}
              >
                {loading ? (
                  <span>저장 중…</span>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/>
                    </svg>
                    던지기
                  </>
                )}
              </button>
            </div>

            {/* Privacy notice */}
            <p className="text-[9px] opacity-25 leading-snug" style={{ color: '#3F342B' }}>
              개인정보를 직접 기재하지 마세요.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
