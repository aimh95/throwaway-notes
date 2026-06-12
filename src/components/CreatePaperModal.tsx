'use client'

import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { PaperColor, CrumpleStyle, CreatePostInput } from '@/types'
import { supabase } from '@/lib/supabase'
import {
  validatePostInput,
  generateRotation,
  getPaperColorToken,
} from '@/lib/utils'
import { computeSmartPlacement } from '@/lib/paper/paperPlacement'
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
  existingPosts?: Post[]
}

const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토']

function getTodayStr() {
  const d = new Date()
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}. (${DAYS_KO[d.getDay()]})`
}

// Lined paper background with left margin rule
function getLinedBg(accent = 'rgba(180,130,90,0.10)', margin = 'rgba(200,70,50,0.16)') {
  return `
    linear-gradient(90deg,
      transparent 47px,
      ${margin} 47px,
      ${margin} 49px,
      transparent 49px
    ),
    repeating-linear-gradient(
      180deg,
      transparent 0px,
      transparent 31px,
      ${accent} 31px,
      ${accent} 32px
    )
  `
}

export default function CreatePaperModal({ onClose, onCreated, existingPosts = [] }: Props) {
  const [title, setTitle]             = useState('')
  const [content, setContent]         = useState('')
  const [anonymousName, setAnonymousName] = useState('')
  const [paperColor, setPaperColor]   = useState<PaperColor>('ivory')
  const [customColor, setCustomColor] = useState('#FFF0E4')
  const [showCustom, setShowCustom]   = useState(false)
  const [crumpleStyle, setCrumpleStyle] = useState<CrumpleStyle>('ball')
  const [loading, setLoading]         = useState(false)
  const [errors, setErrors]           = useState<Record<string, string>>({})
  const [submitted, setSubmitted]     = useState(false)
  const colorInputRef = useRef<HTMLInputElement>(null)

  const activeColor = showCustom ? customColor : paperColor
  const bg = getPaperColorToken(activeColor)
  const todayStr = getTodayStr()

  const handleSubmit = useCallback(async () => {
    const { x, y } = computeSmartPlacement(existingPosts)
    const rotation  = generateRotation()

    const input: CreatePostInput = {
      title:          title.trim() || undefined,
      content:        content.trim(),
      paper_color:    activeColor,
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
      const isConstraint = error?.code === '23514'
      setErrors({ global: isConstraint
        ? '데이터베이스 제약 오류입니다. Supabase 대시보드에서 SQL 마이그레이션이 필요합니다.'
        : `저장에 실패했습니다. (${error?.message ?? error?.code ?? 'unknown'})`
      })
      return
    }

    setSubmitted(true)
    setTimeout(() => { onCreated(data as Post); onClose() }, 650)
  }, [title, content, anonymousName, activeColor, crumpleStyle, onCreated, onClose, existingPosts])

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0"
          style={{ background: 'rgba(12,8,4,0.78)', backdropFilter: 'blur(6px)' }}
          onClick={onClose}
        />

        {/* Paper letter */}
        <motion.div
          className="relative z-10 w-full sm:max-w-lg mx-auto sm:rounded-sm overflow-hidden flex flex-col"
          style={{
            background: bg,
            maxHeight: '94dvh',
            boxShadow: [
              '0 2px 4px rgba(0,0,0,0.08)',
              '0 12px 48px rgba(0,0,0,0.35)',
              '0 40px 96px rgba(0,0,0,0.28)',
              'inset 0 0 0 1px rgba(63,52,43,0.07)',
              'inset 3px 0 8px rgba(255,255,255,0.22)',
            ].join(', '),
          }}
          initial={submitted ? undefined : { y: 60, opacity: 0, scale: 0.97 }}
          animate={submitted
            ? { scale: 0.8, rotate: -8, opacity: 0, y: 80, transition: { duration: 0.5 } }
            : { y: 0, opacity: 1, scale: 1 }
          }
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 36 }}
        >
          {/* ── Header strip ───────────────────────────────────────────── */}
          <div
            className="flex items-center justify-between px-6 pt-5 pb-3"
            style={{ borderBottom: '1px solid rgba(63,52,43,0.08)' }}
          >
            <span
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 13,
                fontStyle: 'italic',
                color: 'rgba(63,52,43,0.38)',
                letterSpacing: '0.02em',
              }}
            >
              {todayStr}
            </span>

            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-full transition-opacity opacity-30 hover:opacity-60"
              style={{ color: '#3F342B' }}
              aria-label="닫기"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="1" y1="1" x2="11" y2="11" /><line x1="11" y1="1" x2="1" y2="11" />
              </svg>
            </button>
          </div>

          {/* ── Writing area ────────────────────────────────────────────── */}
          <div
            className="flex-1 overflow-y-auto flex flex-col"
            style={{ backgroundImage: getLinedBg() }}
          >
            {/* Title */}
            <div style={{ paddingLeft: 60, paddingRight: 32, paddingTop: 24, paddingBottom: 0 }}>
              <input
                type="text"
                placeholder="제목"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={MAX_TITLE_LENGTH}
                className="w-full bg-transparent outline-none placeholder:opacity-25"
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.35rem',
                  fontWeight: 500,
                  color: '#2C2218',
                  letterSpacing: '0.01em',
                  lineHeight: '32px',
                  height: 32,
                  borderBottom: '1px solid rgba(63,52,43,0.14)',
                  paddingBottom: 0,
                }}
              />
            </div>

            {/* Content */}
            <div style={{ paddingLeft: 60, paddingRight: 32, paddingTop: 0, paddingBottom: 12, flex: 1 }}>
              <textarea
                placeholder="지금 마음에 있는 걸 적어요."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={MAX_CONTENT_LENGTH}
                className="w-full bg-transparent outline-none resize-none placeholder:opacity-20"
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.1rem',
                  fontWeight: 400,
                  color: '#3F342B',
                  lineHeight: '32px',
                  minHeight: '192px',
                  paddingTop: 0,
                  paddingBottom: 0,
                  letterSpacing: '0.01em',
                }}
                rows={6}
              />
            </div>

            {/* Errors */}
            {(errors.content || errors.global) && (
              <div style={{ paddingLeft: 60, paddingRight: 32, paddingBottom: 8 }}>
                <p className="text-xs" style={{ color: '#c0392b', fontFamily: 'var(--font-serif)' }}>
                  {errors.content || errors.global}
                </p>
              </div>
            )}

            {/* Character count */}
            <div className="flex justify-end" style={{ paddingLeft: 60, paddingRight: 32, paddingBottom: 16 }}>
              <span style={{ fontSize: 10, color: 'rgba(63,52,43,0.3)', fontFamily: 'var(--font-serif)', letterSpacing: '0.04em' }}>
                {content.length} / {MAX_CONTENT_LENGTH}
              </span>
            </div>
          </div>

          {/* ── Controls strip ──────────────────────────────────────────── */}
          <div
            style={{
              borderTop: '1px solid rgba(63,52,43,0.10)',
              background: 'rgba(63,52,43,0.025)',
              padding: '14px 20px 16px',
            }}
          >
            {/* Row 1: colors + styles */}
            <div className="flex items-center gap-4 flex-wrap mb-3">
              {/* Color swatches */}
              <div className="flex gap-2 items-center">
                {PAPER_COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    title={PAPER_COLORS[color].label}
                    onClick={() => { setPaperColor(color); setShowCustom(false) }}
                    className="rounded-full transition-all"
                    style={{
                      width: 20,
                      height: 20,
                      background: PAPER_COLORS[color].bg,
                      outline: (!showCustom && paperColor === color)
                        ? '2.5px solid #B9855B'
                        : '1.5px solid rgba(63,52,43,0.15)',
                      outlineOffset: 1.5,
                      transform: (!showCustom && paperColor === color) ? 'scale(1.25)' : 'scale(1)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                      transition: 'all 0.15s',
                    }}
                    aria-pressed={!showCustom && paperColor === color}
                  />
                ))}

                {/* Custom RGB picker */}
                <div className="relative">
                  <button
                    type="button"
                    title="직접 색상 선택"
                    onClick={() => colorInputRef.current?.click()}
                    className="rounded-full transition-all"
                    style={{
                      width: 20,
                      height: 20,
                      background: showCustom
                        ? customColor
                        : 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
                      outline: showCustom ? '2.5px solid #B9855B' : '1.5px solid rgba(63,52,43,0.15)',
                      outlineOffset: 1.5,
                      transform: showCustom ? 'scale(1.25)' : 'scale(1)',
                      transition: 'all 0.15s',
                    }}
                    aria-pressed={showCustom}
                  />
                  <input
                    ref={colorInputRef}
                    type="color"
                    value={customColor}
                    onChange={(e) => { setCustomColor(e.target.value); setShowCustom(true) }}
                    className="absolute opacity-0 w-0 h-0 pointer-events-none"
                    tabIndex={-1}
                  />
                </div>
              </div>

              {/* Shape chips */}
              <div className="flex gap-1 flex-wrap">
                {CRUMPLE_STYLE_OPTIONS.map((style) => {
                  const active = crumpleStyle === style
                  return (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setCrumpleStyle(style)}
                      className="transition-all"
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: 11,
                        letterSpacing: '0.04em',
                        lineHeight: '22px',
                        padding: '0 8px',
                        borderRadius: 2,
                        background: active ? 'rgba(63,52,43,0.12)' : 'transparent',
                        color: active ? '#2C2218' : '#9D8878',
                        fontWeight: active ? 600 : 400,
                        border: active ? '1px solid rgba(63,52,43,0.18)' : '1px solid transparent',
                      }}
                      aria-pressed={active}
                    >
                      {CRUMPLE_STYLES[style].label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Row 2: name + submit */}
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="익명 이름 (선택)"
                value={anonymousName}
                onChange={(e) => setAnonymousName(e.target.value)}
                className="flex-1 bg-transparent outline-none placeholder:opacity-25"
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '0.95rem',
                  color: '#3F342B',
                  letterSpacing: '0.01em',
                  borderBottom: '1px solid rgba(63,52,43,0.14)',
                  paddingBottom: 2,
                }}
              />

              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || submitted}
                className="flex items-center gap-2 rounded-sm transition-all disabled:opacity-40"
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  letterSpacing: '0.04em',
                  padding: '7px 20px',
                  background: '#3F342B',
                  color: '#F5EDDA',
                  boxShadow: '0 2px 8px rgba(63,52,43,0.25)',
                }}
              >
                {loading ? (
                  <span style={{ opacity: 0.7 }}>저장 중…</span>
                ) : (
                  <>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/>
                    </svg>
                    던지기
                  </>
                )}
              </button>
            </div>

            <p style={{ fontSize: 9, color: 'rgba(63,52,43,0.22)', marginTop: 10, fontFamily: 'var(--font-serif)', letterSpacing: '0.03em' }}>
              개인 정보를 직접 기재하지 마세요.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
