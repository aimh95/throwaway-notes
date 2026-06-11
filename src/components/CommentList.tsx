'use client'

import type { Comment } from '@/types'
import { formatRelativeTime } from '@/lib/utils'
import ReportButton from './ReportButton'

interface Props {
  comments: Comment[]
}

export default function CommentList({ comments }: Props) {
  if (comments.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      {comments.map((c) => (
        <div
          key={c.id}
          className="rounded-lg px-3 py-2.5"
          style={{ background: 'rgba(63,52,43,0.05)' }}
        >
          <p className="text-sm leading-relaxed" style={{ color: '#3F342B' }}>
            {c.content}
          </p>
          <div className="flex items-center justify-between mt-1.5 gap-2">
            <span className="text-[10px] opacity-40" style={{ color: '#3F342B' }}>
              {c.anonymous_name ?? '익명'} · {formatRelativeTime(c.created_at)}
            </span>
            <ReportButton targetType="comment" targetId={c.id} />
          </div>
        </div>
      ))}
    </div>
  )
}
