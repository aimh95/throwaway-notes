'use client'

import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import type { Post } from '@/types'
import PaperCanvas3D from '@/components/paper-board/PaperCanvas3D'
import CreatePaperModal from '@/components/CreatePaperModal'
import PaperDetailModal from '@/components/PaperDetailModal'

export default function PaperBoardPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newPostId, setNewPostId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('posts')
      .select('*')
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (!cancelled && data) setPosts(data as Post[])
      })
    return () => { cancelled = true }
  }, [])

  const handleCreated = useCallback((post: Post) => {
    setPosts((prev) => [post, ...prev])
    setNewPostId(post.id)
    setTimeout(() => setNewPostId(null), 2000)
  }, [])

  return (
    <main className="relative w-full overflow-hidden" style={{ minHeight: '100dvh' }}>
      <PaperCanvas3D
        posts={posts}
        newPostId={newPostId}
        onPaperClick={(post) => {
          setSelectedPost(post)
          setShowCreate(false)
        }}
      />

      {/* FAB — pencil icon, bottom right */}
      <motion.button
        type="button"
        onClick={() => setShowCreate(true)}
        className="fixed bottom-7 right-7 z-40 rounded-full flex items-center justify-center"
        style={{
          width: 54,
          height: 54,
          background: '#B9855B',
          boxShadow: '0 4px 22px rgba(185,133,91,0.45), 0 1px 4px rgba(0,0,0,0.12)',
          color: '#fff',
        }}
        whileHover={{ scale: 1.09, boxShadow: '0 6px 30px rgba(185,133,91,0.55)' }}
        whileTap={{ scale: 0.94 }}
        aria-label="글 작성"
      >
        {/* Pencil icon */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
        </svg>
      </motion.button>

      <AnimatePresence>
        {showCreate && (
          <CreatePaperModal
            key="create"
            onClose={() => setShowCreate(false)}
            onCreated={handleCreated}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedPost && (
          <PaperDetailModal
            key={selectedPost.id}
            post={selectedPost}
            onClose={() => setSelectedPost(null)}
          />
        )}
      </AnimatePresence>
    </main>
  )
}
