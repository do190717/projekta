// ===========================================
// Projekta - Topics Module
// ===========================================
// נקודת כניסה אחת למודול נושאים מובנים
// ===========================================

// Types
export type {
  TopicType,
  TopicStatus,
  ItemStatus,
  ResponseType,
  PriorityLevel,
  TopicRow,
  TopicItemRow,
  TopicItemResponseRow,
  ThreadMessageRow,
  TopicDecisionRow,
  TopicAttachmentRow,
  TopicWithDetails,
  TopicItemWithResponses,
  TopicItemResponseWithUser,
  ThreadMessageWithUser,
  MiniProfile,
  DecisionSnapshot,
  DecisionItemSnapshot,
  TopicFilters,
  TopicViewState,
  CreateTopicForm,
  CreateItemForm,
} from './types'

// Constants & Config
export {
  TOPIC_TYPE_CONFIG,
  TOPIC_STATUS_CONFIG,
  ITEM_STATUS_CONFIG,
  RESPONSE_TYPE_CONFIG,
  PRIORITY_CONFIG,
  TOPIC_TRANSITIONS,
  ITEM_TRANSITIONS,
} from './types'

// Helper Functions
export {
  canTransitionTopic,
  canTransitionItem,
  isTopicLocked,
  getTopicProgress,
  formatDeadline,
} from './types'

// Hooks
export {
  useTopics,
  useTopicDetail,
  useItemThread,
  useItemResponses,
} from './useTopics'
