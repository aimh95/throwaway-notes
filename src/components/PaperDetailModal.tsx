'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Post, Comment } from '@/types'
import { supabase } from '@/lib/supabase'
import { getPaperColorToken, formatRelativeTime } from '@/lib/utils'
import ReportButton from './ReportButton'
import CommentForm from './CommentForm'

interface Props {
  post: Post
  onClose: () => void
}

export default function PaperDetailModal({ post, onClose }: Props) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loadingComments, setLoadingComments] = useState(true)

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
          setLoadingComments(false)
        }
      })
    return () => { cancelled = true }
  }, [post.id])

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Very dark, focused backdrop — like examining a document */}
        <motion.div
          className="absolute inset-0"
          style={{ background: 'rgba(14,9,4,0.90)', backdropFilter: 'blur(6px)' }}
          onClick={onClose}
        />

        {/* The document */}
        <motion.div
          className="relative z-10 w-full max-w-2xl"
          style={{ maxHeight: '92dvh', overflowY: 'auto' }}
          initial={{ scale: 0.72, rotate: post.rotation * 0.6, opacity: 0, y: 24 }}
          animate={{ scale: 1, rotate: 0, opacity: 1, y: 0 }}
          exit={{ scale: 0.80, opacity: 0, y: 16 }}
          transition={{ type: 'spring', stiffness: 280, damping: 30 }}
        >
          {/* Paper surface */}
          <div
            style={{
              background: bg,
              boxShadow: [
                '0 32px 100px rgba(0,0,0,0.65)',
                '0 2px 20px rgba(0,0,0,0.3)',
                'inset 0 0 0 1px rgba(63,52,43,0.10)',
                'inset 3px 3px 12px rgba(255,255,255,0.28)',
              ].join(', '),
              borderRadius: 2,
            }}
          >
            {/* Letter header */}
            <div className="px-10 pt-10 pb-6">
              {/* Close */}
              <button
                type="button"
                onClick={onClose}
                className="absolute top-5 right-5 opacity-30 hover:opacity-60 transition-opacity"
                style={{ color: '#3F342B' }}
                aria-label="닫기"
              >
                <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="1" y1="1" x2="13" y2="13" /><line x1="13" y1="1" x2="1" y2="13" />
                </svg>
              </button>

              {/* Title */}
              {post.title && (
                <h1
                  className="leading-snug mb-3"
                  style={{
                    color: '#3F342B',
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    letterSpacing: '0.01em',
                  }}
                >
                  {post.title}
                </h1>
              )}

              {/* Meta line */}
              <div className="flex items-center gap-3">
                <span
                  className="text-xs opacity-40 tracking-wide"
                  style={{ color: '#3F342B', fontFamily: 'Georgia, serif' }}
                >
                  {post.anonymous_name ?? '익명'} · {formatRelativeTime(post.created_at)}
                </span>
                <ReportButton targetType="post" targetId={post.id} />
              </div>
            </div>

            {/* Ruling line */}
            <div style={{ height: 1, margin: '0 40px', background: 'rgba(63,52,43,0.10)' }} />

            {/* Main content — the letter body */}
            <div className="px-10 py-8">
              <p
                className="whitespace-pre-wrap leading-8"
                style={{
                  color: '#3F342B',
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontSize: '0.95rem',
                  letterSpacing: '0.015em',
                  minHeight: '5rem',
                }}
              >
                {post.content}
              </p>
            </div>

            {/* Comments section — attached notes feel */}
            <div
              style={{
                borderTop: '1px solid rgba(63,52,43,0.10)',
                background: 'rgba(63,52,43,0.025)',
              }}
            >
              {!loadingComments && comments.length > 0 && (
                <div className="px-10 pt-6 pb-2 flex flex-col gap-4">
                  {comments.map((c) => (
                    <NoteCard key={c.id} comment={c} />
                  ))}
                </div>
              )}

              {/* Comment input */}
              <div className="px-10 py-6">
                <CommentForm postId={post.id} onAdded={(c) => setComments((prev) => [...prev, c])} />
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function NoteCard({ comment }: { comment: Comment }) {
  return (
    <div>
      <p
        className="leading-7 whitespace-pre-wrap"
        style={{
          color: '#3F342B',
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: '0.875rem',
          letterSpacing: '0.01em',
        }}
      >
        {comment.content}
      </p>
      <div className="flex items-center gap-3 mt-1.5">
        <span
          className="text-[10px] tracking-wide opacity-35"
          style={{ color: '#3F342B' }}
        >
          {comment.anonymous_name ?? '익명'} · {formatRelativeTime(comment.created_at)}
        </span>
        <ReportButton targetType="comment" targetId={comment.id} />
      </div>
    </div>
  )
}
