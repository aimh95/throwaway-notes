'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { ReportTargetType } from '@/types'

interface Props {
  targetType: ReportTargetType
  targetId: string
}

export default function ReportButton({ targetType, targetId }: Props) {
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleReport = async () => {
    if (done || loading) return
    setLoading(true)
    await supabase.from('reports').insert([{ target_type: targetType, target_id: targetId }])
    setLoading(false)
    setDone(true)
  }

  if (done) {
    return <span className="text-[10px] opacity-50" style={{ color: '#9D8878' }}>신고됨</span>
  }

  return (
    <button
      type="button"
      onClick={handleReport}
      disabled={loading}
      className="text-[10px] opacity-40 hover:opacity-70 transition-opacity"
      style={{ color: '#9D8878' }}
    >
      신고
    </button>
  )
}
