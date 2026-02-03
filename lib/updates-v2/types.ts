// ===========================================
// Projekta Chat v2 — Types
// ===========================================

// --- Database Row Types ---

export interface ChatMessageRow {
  id: string
  project_id: string
  user_id: string
  content: string
  reply_to: string | null
  message_type: 'message' | 'system' | 'ai_card'
  metadata: AICardMetadata | null
  deleted_at: string | null
  created_at: string
}

export interface ChatReactionRow {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
}

export interface ChatReadRow {
  id: string
  message_id: string
  user_id: string
  read_at: string
}

export interface ChatAttachmentRow {
  id: string
  message_id: string
  uploaded_by: string
  file_name: string
  file_type: string
  file_size: number
  file_url: string
  created_at: string
}

// --- AI Card Metadata ---

export type AICardType =
  | 'task_detection'
  | 'reminder'
  | 'status_update'
  | 'context_recall'
  | 'daily_summary'
  | 'financial_alert'
  | 'decision_record'

export interface AICardMetadata {
  card_type: AICardType
  [key: string]: any
}

export interface TaskDetectionMeta extends AICardMetadata {
  card_type: 'task_detection'
  tasks: { id: string; text: string; category: string }[]
  summary: string
  approved: boolean
}

export interface ReminderMeta extends AICardMetadata {
  card_type: 'reminder'
  text: string
  items?: string[]
}

export interface StatusUpdateMeta extends AICardMetadata {
  card_type: 'status_update'
  updates: { text: string; status: string }[]
  decision?: string
}

export interface ContextRecallMeta extends AICardMetadata {
  card_type: 'context_recall'
  text: string
  context: { date: string; author: string; snippet: string }
  suggestion?: string
}

export interface DailySummaryMeta extends AICardMetadata {
  card_type: 'daily_summary'
  date: string
  stats: { opened: number; resolved: number; blocked: number }
  highlights: string[]
  tomorrow?: string
}

export interface FinancialAlertMeta extends AICardMetadata {
  card_type: 'financial_alert'
  amount?: string
  text: string
}

export interface DecisionRecordMeta extends AICardMetadata {
  card_type: 'decision_record'
  text: string
  participants: string[]
  relatedTasks?: string[]
}

// --- Composite Types ---

export interface ChatMessageWithDetails extends ChatMessageRow {
  user?: MiniProfile
  reactions?: ChatReactionRow[]
  attachments?: ChatAttachmentRow[]
  replyMessage?: ChatMessageRow | null
}

export interface MiniProfile {
  id: string
  full_name: string | null
  avatar_url: string | null
}

// --- UI State ---

export interface ChatState {
  messages: ChatMessageRow[]
  profiles: Record<string, MiniProfile>
  reactions: Record<string, ChatReactionRow[]>
  loading: boolean
  error: string | null
  hasMore: boolean
}
