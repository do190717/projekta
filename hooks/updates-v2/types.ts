// ===========================================
// Projekta - Structured Topics Module
// ===========================================
// מודול נושאים מובנים - טיפוסים
// ===========================================

// ====== Enums ======

export type TopicType = 'defects' | 'change_order' | 'general' | 'partial_invoice' | 'safety'

export type TopicStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

export type ItemStatus = 'pending' | 'accepted' | 'rejected' | 'in_discussion' | 'resolved'

export type ResponseType = 'accept' | 'reject' | 'discuss'

export type PriorityLevel = 'low' | 'medium' | 'high' | 'critical'

// ====== Database Row Types ======

export interface TopicRow {
  id: string
  project_id: string
  created_by: string
  title: string
  description: string | null
  topic_type: TopicType
  status: TopicStatus
  priority: PriorityLevel
  deadline: string | null // ISO timestamp
  locked: boolean
  locked_at: string | null
  locked_by: string | null
  items_total: number
  items_resolved: number
  created_at: string
  updated_at: string
}

export interface TopicItemRow {
  id: string
  topic_id: string
  created_by: string
  item_number: number
  title: string
  description: string | null
  status: ItemStatus
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export interface TopicItemResponseRow {
  id: string
  item_id: string
  user_id: string
  response_type: ResponseType
  comment: string | null
  created_at: string
}

export interface ThreadMessageRow {
  id: string
  item_id: string
  user_id: string
  content: string
  reply_to: string | null
  created_at: string
}

export interface TopicDecisionRow {
  id: string
  topic_id: string
  created_by: string
  snapshot: DecisionSnapshot
  summary: string
  created_at: string
}

export interface TopicAttachmentRow {
  id: string
  topic_id: string | null
  item_id: string | null
  thread_message_id: string | null
  uploaded_by: string
  file_name: string
  file_type: string
  file_size: number
  file_url: string
  created_at: string
}

// ====== Composite / Joined Types ======

/** פרופיל מינימלי לתצוגה */
export interface MiniProfile {
  id: string
  full_name: string | null
  avatar_url: string | null
  role?: string
}

/** נושא + מידע מורחב */
export interface TopicWithDetails extends TopicRow {
  creator: MiniProfile
  items: TopicItemWithResponses[]
  attachments: TopicAttachmentRow[]
  decision: TopicDecisionRow | null
}

/** סעיף + תגובות + הודעות */
export interface TopicItemWithResponses extends TopicItemRow {
  responses: TopicItemResponseWithUser[]
  thread_messages: ThreadMessageWithUser[]
  attachments: TopicAttachmentRow[]
}

/** תגובה + פרופיל */
export interface TopicItemResponseWithUser extends TopicItemResponseRow {
  user: MiniProfile
}

/** הודעת thread + פרופיל */
export interface ThreadMessageWithUser extends ThreadMessageRow {
  user: MiniProfile
  reply_to_message?: ThreadMessageWithUser | null
}

// ====== Decision Snapshot ======

export interface DecisionSnapshot {
  topic_title: string
  topic_type: TopicType
  decided_at: string
  items: DecisionItemSnapshot[]
}

export interface DecisionItemSnapshot {
  item_number: number
  title: string
  final_status: ItemStatus
  responses: {
    user_name: string
    response: ResponseType
    comment: string | null
  }[]
}

// ====== UI State Types ======

/** מצב של פילטרים ברשימת נושאים */
export interface TopicFilters {
  status: TopicStatus | 'all'
  type: TopicType | 'all'
  priority: PriorityLevel | 'all'
  search: string
}

/** מצב של נושא פתוח (UI) */
export interface TopicViewState {
  expandedItems: Set<string> // item IDs שפתוחים
  activeThread: string | null // item ID של thread פתוח
  isEditing: boolean
  showDecision: boolean
}

// ====== Form Types ======

/** טופס יצירת נושא */
export interface CreateTopicForm {
  title: string
  description: string
  topic_type: TopicType
  priority: PriorityLevel
  deadline: string | null
  items: CreateItemForm[]
}

/** טופס יצירת סעיף */
export interface CreateItemForm {
  title: string
  description: string
}

// ====== Constants ======

export const TOPIC_TYPE_CONFIG: Record<TopicType, {
  name: string
  icon: string
  color: string
  bgColor: string
  description: string
}> = {
  defects: {
    name: 'ליקויים',
    icon: '🔴',
    color: '#EF4444',
    bgColor: '#FEF2F2',
    description: 'רשימת ליקויים לתיקון',
  },
  change_order: {
    name: 'שינוי/תוספת',
    icon: '📝',
    color: '#3B82F6',
    bgColor: '#EFF6FF',
    description: 'בקשת שינוי או תוספת',
  },
  general: {
    name: 'כללי',
    icon: '💬',
    color: '#6366F1',
    bgColor: '#EEF2FF',
    description: 'דיון כללי מובנה',
  },
  partial_invoice: {
    name: 'חשבון חלקי',
    icon: '💰',
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    description: 'חשבון חלקי לאישור',
  },
  safety: {
    name: 'בטיחות',
    icon: '⚠️',
    color: '#DC2626',
    bgColor: '#FEF2F2',
    description: 'נושא בטיחות דחוף',
  },
}

export const TOPIC_STATUS_CONFIG: Record<TopicStatus, {
  name: string
  icon: string
  color: string
  bgColor: string
}> = {
  open: { name: 'פתוח', icon: '🟢', color: '#10B981', bgColor: '#ECFDF5' },
  in_progress: { name: 'בטיפול', icon: '🔵', color: '#3B82F6', bgColor: '#EFF6FF' },
  resolved: { name: 'נפתר', icon: '✅', color: '#059669', bgColor: '#D1FAE5' },
  closed: { name: 'סגור (נעול)', icon: '🔒', color: '#6B7280', bgColor: '#F3F4F6' },
}

export const ITEM_STATUS_CONFIG: Record<ItemStatus, {
  name: string
  icon: string
  color: string
  bgColor: string
}> = {
  pending: { name: 'ממתין', icon: '⏳', color: '#6B7280', bgColor: '#F3F4F6' },
  accepted: { name: 'מקובל', icon: '✅', color: '#10B981', bgColor: '#ECFDF5' },
  rejected: { name: 'נדחה', icon: '❌', color: '#EF4444', bgColor: '#FEF2F2' },
  in_discussion: { name: 'בדיון', icon: '💬', color: '#F59E0B', bgColor: '#FFFBEB' },
  resolved: { name: 'נפתר', icon: '✔️', color: '#059669', bgColor: '#D1FAE5' },
}

export const RESPONSE_TYPE_CONFIG: Record<ResponseType, {
  name: string
  icon: string
  color: string
  bgColor: string
}> = {
  accept: { name: 'מקבל', icon: '✅', color: '#10B981', bgColor: '#ECFDF5' },
  reject: { name: 'דוחה', icon: '❌', color: '#EF4444', bgColor: '#FEF2F2' },
  discuss: { name: 'לדיון', icon: '💬', color: '#F59E0B', bgColor: '#FFFBEB' },
}

export const PRIORITY_CONFIG: Record<PriorityLevel, {
  name: string
  icon: string
  color: string
  bgColor: string
}> = {
  low: { name: 'נמוך', icon: '🟢', color: '#10B981', bgColor: '#ECFDF5' },
  medium: { name: 'בינוני', icon: '🟡', color: '#F59E0B', bgColor: '#FFFBEB' },
  high: { name: 'גבוה', icon: '🟠', color: '#F97316', bgColor: '#FFF7ED' },
  critical: { name: 'קריטי', icon: '🔴', color: '#EF4444', bgColor: '#FEF2F2' },
}

// ====== State Machine Transitions ======

/** מעברי סטטוס מותרים לנושא */
export const TOPIC_TRANSITIONS: Record<TopicStatus, TopicStatus[]> = {
  open: ['in_progress', 'closed'],
  in_progress: ['resolved', 'open'],
  resolved: ['closed', 'in_progress'],
  closed: [], // נעול - אין מעברים
}

/** מעברי סטטוס מותרים לסעיף */
export const ITEM_TRANSITIONS: Record<ItemStatus, ItemStatus[]> = {
  pending: ['accepted', 'rejected', 'in_discussion'],
  accepted: ['resolved'],
  rejected: ['pending', 'in_discussion'],
  in_discussion: ['accepted', 'rejected', 'resolved'],
  resolved: [], // סופי
}

// ====== Helper Functions ======

export function canTransitionTopic(from: TopicStatus, to: TopicStatus): boolean {
  return TOPIC_TRANSITIONS[from].includes(to)
}

export function canTransitionItem(from: ItemStatus, to: ItemStatus): boolean {
  return ITEM_TRANSITIONS[from].includes(to)
}

export function isTopicLocked(topic: TopicRow): boolean {
  return topic.locked || topic.status === 'closed'
}

export function getTopicProgress(topic: TopicRow): number {
  if (topic.items_total === 0) return 0
  return Math.round((topic.items_resolved / topic.items_total) * 100)
}

export function formatDeadline(deadline: string | null): string | null {
  if (!deadline) return null
  const date = new Date(deadline)
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  
  if (hours < 0) return 'עבר הזמן!'
  if (hours < 24) return `${hours} שעות`
  const days = Math.floor(hours / 24)
  return `${days} ימים`
}
