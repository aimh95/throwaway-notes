'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { validateCommentInput } from '@/lib/utils'
import { MAX_COMMENT_LENGTH } from '@/lib/constants'
import type { Comment } from '@/types'

interface Props {
  postId: string
  onAdded: (comment: Comment) => void
}

export default function CommentForm({ postId, onAdded }: Props) {
  const [content, setContent]           = useState('')
  const [anonymousName, setAnonymousName] = useState('')
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validateCommentInput({ post_id: postId, content })
    if (errs.length > 0) { setError(errs[0].message); return }

    setLoading(true)
    setError('')
    const { data, error: dbErr } = await supabase
      .from('comments')
      .insert([{ post_id: postId, content: content.trim(), anonymous_name: anonymousName.trim() || null }])
      .select()
      .single()

    setLoading(false)
    if (dbErr || !data) { setError('저장에 실패했습니다.'); return }
    onAdded(data as Comment)
    setContent('')
    setAnonymousName('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <textarea
        placeholder="한 마디 남기기"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={MAX_COMMENT_LENGTH}
        rows={3}
        className="w-full outline-none resize-none leading-7 placeholder:opacity-25"
        style={{
          background: 'transparent',
          color: '#3F342B',
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: '0.875rem',
          letterSpacing: '0.01em',
          borderBottom: '1px solid rgba(63,52,43,0.12)',
          paddingBottom: 8,
        }}
      />
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="익명 이름 (선택)"
          value={anonymousName}
          onChange={(e) => setAnonymousName(e.target.value)}
          className="flex-1 bg-transparent outline-none text-xs placeholder:opacity-25"
          style={{ color: '#3F342B', letterSpacing: '0.01em' }}
        />
        <button
          type="submit"
          disabled={loading}
          className="text-xs px-4 py-1.5 rounded-full transition-opacity disabled:opacity-50"
          style={{ background: 'rgba(63,52,43,0.12)', color: '#3F342B', letterSpacing: '0.03em' }}
        >
          {loading ? '…' : '남기기'}
        </button>
      </div>
      {error && <p className="text-xs" style={{ color: '#c0392b' }}>{error}</p>}
      <p className="text-[9px] opacity-25 leading-snug" style={{ color: '#3F342B' }}>
        비난, 조롱, 신상 요구 금지.
      </p>
    </form>
  )
}
