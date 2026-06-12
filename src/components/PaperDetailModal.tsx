'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import type { Post, Comment } from '@/types'
import { supabase } from '@/lib/supabase'
import { getPaperColorToken, formatRelativeTime } from '@/lib/utils'
import ReportButton from './ReportButton'
import CommentForm from './CommentForm'

const PaperUnfoldEffect = dynamic(() => import('./PaperUnfoldEffect'), { ssr: false })

interface Props {
  post: Post
  isOwned: boolean
  onClose: () => void
}

// Lined paper background for the content area
const CONTENT_LINED = `repeating-linear-gradient(
  180deg,
  transparent 0px,
  transparent 31px,
  rgba(180,130,90,0.09) 31px,
  rgba(180,130,90,0.09) 32px
)`

export default function PaperDetailModal({ post, isOwned, onClose }: Props) {
  const [comments, setComments]         = useState<Comment[]>([])
  const [loadingComments, setLoading]   = useState(true)
  const [unfolding, setUnfolding]       = useState(true)
  const [showContent, setShowContent]   = useState(false)

  const bg = getPaperColorToken(post.paper_color)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('comments')
      .select('*')
      .eq('post_id', post.id)
      .eq('is_hidden', false)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (!cancelled) {
          setComments((data as Comment[]) ?? [])
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [post.id])

  const handleUnfoldDone = () => {
    setUnfolding(false)
    setShowContent(true)
  }

  return (
    <>
      {unfolding && <PaperUnfoldEffect post={post} onDone={handleUnfoldDone} />}

      <AnimatePresence>
        {showContent && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0"
              style={{ background: 'rgba(8,5,2,0.92)', backdropFilter: 'blur(8px)' }}
              onClick={onClose}
            />

            {/* Paper sheet */}
            <motion.div
              className="relative z-10 w-full max-w-2xl"
              style={{ maxHeight: '92dvh', overflowY: 'auto' }}
              initial={{ scale: 0.90, opacity: 0, y: 28 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.84, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            >
              <div
                style={{
                  background: bg,
                  borderRadius: 2,
                  boxShadow: [
                    '0 2px 4px rgba(0,0,0,0.10)',
                    '0 16px 60px rgba(0,0,0,0.55)',
                    '0 48px 120px rgba(0,0,0,0.40)',
                    'inset 0 0 0 1px rgba(63,52,43,0.08)',
                    'inset 4px 0 10px rgba(255,255,255,0.18)',
                  ].join(', '),
                }}
              >
                {/* ── Paper header ───────────────────────────────────────── */}
                <div className="px-10 pt-9 pb-0 relative">
                  <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-5 right-6 opacity-25 hover:opacity-55 transition-opacity"
                    style={{ color: '#3F342B' }}
                    aria-label="닫기"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <line x1="1" y1="1" x2="13" y2="13" /><line x1="13" y1="1" x2="1" y2="13" />
                    </svg>
                  </button>

                  {/* Ownership badge */}
                  {isOwned && (
                    <div
                      className="inline-flex items-center gap-1.5 mb-4 px-3 py-1 rounded-full"
                      style={{
                        background: 'rgba(255,179,71,0.14)',
                        color: '#8B5010',
                        border: '1px solid rgba(255,179,71,0.30)',
                        fontFamily: 'var(--font-serif)',
                        fontSize: 11,
                        letterSpacing: '0.06em',
                        fontStyle: 'italic',
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#E8A020', display: 'inline-block', flexShrink: 0 }} />
                      내가 던진 종이
                    </div>
                  )}

                  {/* Title */}
                  {post.title && (
                    <h1
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: '1.65rem',
                        fontWeight: 500,
                        color: '#1E160E',
                        letterSpacing: '0.01em',
                        lineHeight: 1.28,
                        marginBottom: 14,
                      }}
                    >
                      {post.title}
                    </h1>
                  )}

                  {/* Meta */}
                  <div className="flex items-center gap-3 pb-5" style={{ borderBottom: '1px solid rgba(63,52,43,0.12)' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: 13,
                        fontStyle: 'italic',
                        color: 'rgba(63,52,43,0.45)',
                        letterSpacing: '0.02em',
                      }}
                    >
                      {post.anonymous_name ?? '익명'} &nbsp;·&nbsp; {formatRelativeTime(post.created_at)}
                    </span>
                    <ReportButton targetType="post" targetId={post.id} />
                  </div>
                </div>

                {/* ── Content ────────────────────────────────────────────── */}
                <div
                  className="px-10 py-8"
                  style={{ backgroundImage: CONTENT_LINED }}
                >
                  <p
                    className="whitespace-pre-wrap"
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '1.125rem',
                      fontWeight: 400,
                      color: '#3F342B',
                      lineHeight: '32px',
                      letterSpacing: '0.015em',
                      minHeight: '5rem',
                    }}
                  >
                    {post.content}
                  </p>
                </div>

                {/* ── Comments ───────────────────────────────────────────── */}
                <div
                  style={{
                    borderTop: '1px solid rgba(63,52,43,0.10)',
                    background: 'rgba(63,52,43,0.025)',
                    borderRadius: '0 0 2px 2px',
                  }}
                >
                  {!loadingComments && comments.length > 0 && (
                    <div className="px-10 pt-7 pb-2 flex flex-col gap-6">
                      {comments.map((c) => (
                        <NoteCard key={c.id} comment={c} />
                      ))}
                    </div>
                  )}

                  <div className="px-10 py-6">
                    <CommentForm
                      postId={post.id}
                      onAdded={(c) => setComments((prev) => [...prev, c])}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function NoteCard({ comment }: { comment: Comment }) {
  return (
    <div>
      <p
        className="whitespace-pre-wrap"
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '1rem',
          color: '#3F342B',
          lineHeight: '28px',
          letterSpacing: '0.01em',
        }}
      >
        {comment.content}
      </p>
      <div className="flex items-center gap-3 mt-2">
        <span
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 11,
            fontStyle: 'italic',
            color: 'rgba(63,52,43,0.40)',
            letterSpacing: '0.03em',
          }}
        >
          {comment.anonymous_name ?? '익명'} · {formatRelativeTime(comment.created_at)}
        </span>
        <ReportButton targetType="comment" targetId={comment.id} />
      </div>
    </div>
  )
}
