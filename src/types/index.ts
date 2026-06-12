export type CrumpleStyle = 'ball' | 'flat' | 'crane' | 'boat' | 'airplane'

// Named presets OR arbitrary hex string like '#FF5733'
export type PaperColor = string

export interface Post {
  id: string
  title: string | null
  content: string
  paper_color: PaperColor
  x_position: number
  y_position: number
  rotation: number
  crumple_style: CrumpleStyle
  anonymous_name: string | null
  created_at: string
  updated_at: string
  is_hidden: boolean
}

export interface Comment {
  id: string
  post_id: string
  content: string
  anonymous_name: string | null
  created_at: string
  is_hidden: boolean
}

export type ReportTargetType = 'post' | 'comment'

export interface Report {
  id: string
  target_type: ReportTargetType
  target_id: string
  reason: string | null
  created_at: string
}

export interface CreatePostInput {
  title?: string
  content: string
  paper_color: PaperColor
  x_position: number
  y_position: number
  rotation: number
  crumple_style: CrumpleStyle
  anonymous_name?: string
}

export interface CreateCommentInput {
  post_id: string
  content: string
  anonymous_name?: string
}
