'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import type { Post } from '@/types'
import PaperCanvas3D from '@/components/paper-board/PaperCanvas3D'
import AccumulationProgress from '@/components/paper-board/AccumulationProgress'
import CreatePaperModal from '@/components/CreatePaperModal'
import PaperDetailModal from '@/components/PaperDetailModal'
import { BOARD_CONFIG } from '@/lib/paper/boardConfig'
import { WORLD_W, WORLD_H } from '@/lib/paper/worldCoordinates'

const MiniMap = dynamic(() => import('@/components/paper-board/MiniMap'), { ssr: false })

// ─── Session / ownership ──────────────────────────────────────────────────────
const MY_PAPERS_KEY = 'throwaway_my_paper_ids'
function loadMyIds(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(MY_PAPERS_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch { return new Set() }
}
function saveMyIds(ids: Set<string>) {
  try { localStorage.setItem(MY_PAPERS_KEY, JSON.stringify([...ids])) } catch { /* ignore */ }
}

export default function PaperBoardPage() {
  const [posts, setPosts]               = useState<Post[]>([])
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [showCreate, setShowCreate]     = useState(false)
  const [newPostId, setNewPostId]       = useState<string | null>(null)
  const [myPostIds, setMyPostIds]       = useState<Set<string>>(new Set())
  const [zoom, setZoom]                 = useState<number>(BOARD_CONFIG.defaultZoom)
  const resetViewRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    setMyPostIds(loadMyIds())
    let cancelled = false
    supabase
      .from('posts')
      .select('*')
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        if (!cancelled && data) setPosts(data as Post[])
      })
    return () => { cancelled = true }
  }, [])

  const handleCreated = useCallback((post: Post) => {
    setPosts((prev) => [post, ...prev])
    setNewPostId(post.id)
    setTimeout(() => setNewPostId(null), 3000)
    setMyPostIds((prev) => {
      const next = new Set(prev)
      next.add(post.id)
      saveMyIds(next)
      return next
    })
  }, [])

  // Approximate viewport in world coords (for minimap)
  const viewportWorld = {
    x: 0, z: 0,
    w: WORLD_W * (BOARD_CONFIG.defaultZoom / Math.max(zoom, 1)) * 1.5,
    h: WORLD_H * (BOARD_CONFIG.defaultZoom / Math.max(zoom, 1)) * 1.0,
  }

  return (
    <main className="relative w-full overflow-hidden" style={{ minHeight: '100dvh' }}>
      {/* Collective canvas */}
      <PaperCanvas3D
        posts={posts}
        newPostId={newPostId}
        myPostIds={myPostIds}
        zoom={zoom}
        onZoomChange={setZoom}
        onPaperClick={(post) => { setSelectedPost(post); setShowCreate(false) }}
      />

      {/* Right sidebar: accumulation progress */}
      <AccumulationProgress
        posts={posts}
        zoom={zoom}
        onResetView={() => { resetViewRef.current?.() }}
      />

      {/* Minimap */}
      <MiniMap posts={posts} viewportWorld={viewportWorld} />

      {/* Subtle canvas hint */}
      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none select-none"
        style={{
          color: '#7A5A48',
          fontSize: 10,
          letterSpacing: '0.08em',
          opacity: 0.22,
        }}
      >
        스크롤로 확대 · 드래그로 탐색
      </div>

      {/* FAB */}
      <motion.button
        type="button"
        onClick={() => setShowCreate(true)}
        className="fixed bottom-7 right-16 z-40 rounded-full flex items-center justify-center"
        style={{
          width: 52,
          height: 52,
          background: '#B9855B',
          boxShadow: '0 4px 22px rgba(185,133,91,0.45), 0 1px 4px rgba(0,0,0,0.12)',
          color: '#fff',
        }}
        whileHover={{ scale: 1.09, boxShadow: '0 6px 30px rgba(185,133,91,0.55)' }}
        whileTap={{ scale: 0.94 }}
        aria-label="글 작성"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
        </svg>
      </motion.button>

      <AnimatePresence>
        {showCreate && (
          <CreatePaperModal
            key="create"
            onClose={() => setShowCreate(false)}
            onCreated={handleCreated}
            existingPosts={posts}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedPost && (
          <PaperDetailModal
            key={selectedPost.id}
            post={selectedPost}
            isOwned={myPostIds.has(selectedPost.id)}
            onClose={() => setSelectedPost(null)}
          />
        )}
      </AnimatePresence>
    </main>
  )
}
