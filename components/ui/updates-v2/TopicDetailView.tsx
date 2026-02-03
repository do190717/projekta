// ===========================================
// Projekta - TopicDetailView Component
// ===========================================
// תצוגת נושא מלאה: סעיפים + תגובות + threads
// ===========================================

'use client'

import React, { useState, useCallback } from 'react'
import { theme, baseStyles } from '@/lib/design-system'
import {
  useTopicDetail,
  useItemThread,
  useItemResponses,
  TopicRow,
  TopicItemRow,
  TopicStatus,
  ItemStatus,
  ResponseType,
  TOPIC_TYPE_CONFIG,
  TOPIC_STATUS_CONFIG,
  ITEM_STATUS_CONFIG,
  RESPONSE_TYPE_CONFIG,
  PRIORITY_CONFIG,
  isTopicLocked,
  getTopicProgress,
  formatDeadline,
  canTransitionItem,
} from '@/hooks/updates-v2'

interface TopicDetailViewProps {
  topicId: string
  onBack: () => void
  onCloseTopic: (topicId: string, summary: string) => Promise<void>
}

export default function TopicDetailView({ topicId, onBack, onCloseTopic }: TopicDetailViewProps) {
  const { topic, items, loading, error, addItem, respondToItem, updateItemStatus } =
    useTopicDetail(topicId)
  const [activeThread, setActiveThread] = useState<string | null>(null)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [showAddItem, setShowAddItem] = useState(false)
  const [newItemTitle, setNewItemTitle] = useState('')
  const [showCloseDialog, setShowCloseDialog] = useState(false)
  const [closeSummary, setCloseSummary] = useState('')

  const toggleExpand = (itemId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  const handleAddItem = async () => {
    if (!newItemTitle.trim()) return
    const success = await addItem(newItemTitle.trim())
    if (success) {
      setNewItemTitle('')
      setShowAddItem(false)
    }
  }

  const handleClose = async () => {
    if (!closeSummary.trim()) return
    await onCloseTopic(topicId, closeSummary.trim())
    setShowCloseDialog(false)
  }

  if (loading) return <DetailSkeleton />
  if (error || !topic) return <DetailError message={error || 'נושא לא נמצא'} onBack={onBack} />

  const typeConfig = TOPIC_TYPE_CONFIG[topic.topic_type]
  const statusConfig = TOPIC_STATUS_CONFIG[topic.status]
  const priorityConfig = PRIORITY_CONFIG[topic.priority]
  const progress = getTopicProgress(topic)
  const locked = isTopicLocked(topic)

  return (
    <div style={{ direction: 'rtl', fontFamily: theme.typography.fontFamily.sans }}>
      {/* ===== Header ===== */}
      <div style={{ marginBottom: theme.spacing[6] }}>
        {/* חזרה */}
        <button
          onClick={onBack}
          style={{
            ...baseStyles.button.base,
            ...baseStyles.button.ghost,
            marginBottom: theme.spacing[3],
            gap: theme.spacing[2],
            color: theme.colors.text.tertiary,
          }}
        >
          → חזרה לרשימה
        </button>

        {/* כותרת + תגיות */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: theme.spacing[4], flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2], marginBottom: theme.spacing[2], flexWrap: 'wrap' }}>
              <span style={{ ...baseStyles.badge.base, backgroundColor: typeConfig.bgColor, color: typeConfig.color }}>
                {typeConfig.icon} {typeConfig.name}
              </span>
              <span style={{ ...baseStyles.badge.base, backgroundColor: statusConfig.bgColor, color: statusConfig.color }}>
                {statusConfig.icon} {statusConfig.name}
              </span>
              <span style={{ ...baseStyles.badge.base, backgroundColor: priorityConfig.bgColor, color: priorityConfig.color }}>
                {priorityConfig.icon} {priorityConfig.name}
              </span>
              {locked && <span style={{ fontSize: theme.typography.fontSize.lg }}>🔒</span>}
            </div>

            <h1
              style={{
                fontSize: theme.typography.fontSize['2xl'],
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.text.primary,
                margin: 0,
                lineHeight: theme.typography.lineHeight.tight,
              }}
            >
              {topic.title}
            </h1>

            {topic.description && (
              <p
                style={{
                  fontSize: theme.typography.fontSize.base,
                  color: theme.colors.text.secondary,
                  margin: `${theme.spacing[2]} 0 0 0`,
                  lineHeight: theme.typography.lineHeight.relaxed,
                }}
              >
                {topic.description}
              </p>
            )}
          </div>

          {/* פעולות */}
          {!locked && (
            <div style={{ display: 'flex', gap: theme.spacing[2] }}>
              <button
                onClick={() => setShowCloseDialog(true)}
                style={{
                  ...baseStyles.button.base,
                  ...baseStyles.button.secondary,
                  fontSize: theme.typography.fontSize.sm,
                }}
              >
                🔒 סגור נושא
              </button>
            </div>
          )}
        </div>

        {/* פס התקדמות */}
        {items.length > 0 && (
          <div style={{ marginTop: theme.spacing[4] }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: theme.spacing[1] }}>
              <span style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.text.tertiary }}>
                {topic.items_resolved} / {topic.items_total} סעיפים טופלו
              </span>
              <span
                style={{
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: progress === 100 ? theme.colors.success.main : theme.colors.primary[600],
                }}
              >
                {progress}%
              </span>
            </div>
            <div style={{ width: '100%', height: '6px', backgroundColor: theme.colors.gray[100], borderRadius: theme.borderRadius.full }}>
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  backgroundColor: progress === 100 ? theme.colors.success.main : theme.colors.primary[500],
                  borderRadius: theme.borderRadius.full,
                  transition: `width ${theme.transitions.slow}`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ===== רשימת סעיפים ===== */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
        {items.map((item, index) => (
          <ItemCard
            key={item.id}
            item={item}
            index={index}
            locked={locked}
            isExpanded={expandedItems.has(item.id)}
            isThreadActive={activeThread === item.id}
            onToggleExpand={() => toggleExpand(item.id)}
            onToggleThread={() => setActiveThread(activeThread === item.id ? null : item.id)}
            onRespond={respondToItem}
            onUpdateStatus={updateItemStatus}
          />
        ))}
      </div>

      {/* ===== הוספת סעיף ===== */}
      {!locked && (
        <div style={{ marginTop: theme.spacing[4] }}>
          {showAddItem ? (
            <div
              style={{
                ...baseStyles.card.base,
                padding: theme.spacing[4],
                display: 'flex',
                gap: theme.spacing[3],
                alignItems: 'center',
                animation: 'fadeInUp 0.2s ease-out',
              }}
            >
              <input
                autoFocus
                type="text"
                placeholder="כותרת סעיף חדש..."
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddItem()
                  if (e.key === 'Escape') setShowAddItem(false)
                }}
                style={{ ...baseStyles.input.base, flex: 1 }}
              />
              <button onClick={handleAddItem} style={{ ...baseStyles.button.base, ...baseStyles.button.primary, whiteSpace: 'nowrap' }}>
                הוסף
              </button>
              <button
                onClick={() => setShowAddItem(false)}
                style={{ ...baseStyles.button.base, ...baseStyles.button.ghost }}
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddItem(true)}
              style={{
                ...baseStyles.button.base,
                ...baseStyles.button.ghost,
                width: '100%',
                padding: theme.spacing[4],
                border: `2px dashed ${theme.colors.border.light}`,
                borderRadius: theme.borderRadius.xl,
                color: theme.colors.text.tertiary,
                fontSize: theme.typography.fontSize.sm,
                justifyContent: 'center',
                gap: theme.spacing[2],
              }}
            >
              + הוסף סעיף
            </button>
          )}
        </div>
      )}

      {/* ===== Thread Panel ===== */}
      {activeThread && (
        <ThreadPanel
          itemId={activeThread}
          locked={locked}
          onClose={() => setActiveThread(null)}
        />
      )}

      {/* ===== Close Topic Dialog ===== */}
      {showCloseDialog && (
        <div style={baseStyles.modal.overlay} onClick={(e) => { if (e.target === e.currentTarget) setShowCloseDialog(false) }}>
          <div
            style={{
              ...baseStyles.modal.content,
              width: '90%',
              maxWidth: '480px',
              padding: theme.spacing[6],
              direction: 'rtl',
              animation: 'fadeInUp 0.2s ease-out',
            }}
          >
            <h3 style={{ fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.bold, margin: `0 0 ${theme.spacing[3]} 0` }}>
              🔒 סגירת נושא
            </h3>
            <p style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.text.secondary, margin: `0 0 ${theme.spacing[4]} 0` }}>
              סגירת הנושא תנעל אותו לעריכה. כל הסעיפים, התגובות וההחלטות יישמרו כתמונת מצב.
            </p>
            <textarea
              autoFocus
              placeholder="סיכום ההחלטה..."
              value={closeSummary}
              onChange={(e) => setCloseSummary(e.target.value)}
              rows={3}
              style={{ ...baseStyles.input.base, resize: 'vertical' as const, marginBottom: theme.spacing[4] }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: theme.spacing[3] }}>
              <button onClick={() => setShowCloseDialog(false)} style={{ ...baseStyles.button.base, ...baseStyles.button.secondary }}>
                ביטול
              </button>
              <button
                onClick={handleClose}
                disabled={!closeSummary.trim()}
                style={{
                  ...baseStyles.button.base,
                  ...baseStyles.button.danger,
                  opacity: closeSummary.trim() ? 1 : 0.5,
                }}
              >
                🔒 סגור ונעל
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


// ===========================================
// ItemCard - כרטיס סעיף בודד
// ===========================================

interface ItemCardProps {
  item: TopicItemRow
  index: number
  locked: boolean
  isExpanded: boolean
  isThreadActive: boolean
  onToggleExpand: () => void
  onToggleThread: () => void
  onRespond: (itemId: string, response: ResponseType, comment?: string) => Promise<boolean>
  onUpdateStatus: (itemId: string, status: ItemStatus) => Promise<boolean>
}

function ItemCard({
  item,
  index,
  locked,
  isExpanded,
  isThreadActive,
  onToggleExpand,
  onToggleThread,
  onRespond,
  onUpdateStatus,
}: ItemCardProps) {
  const statusConfig = ITEM_STATUS_CONFIG[item.status]
  const { responses } = useItemResponses(isExpanded ? item.id : null)
  const [respondComment, setRespondComment] = useState('')
  const [showComment, setShowComment] = useState(false)

  const handleRespond = async (type: ResponseType) => {
    if (type === 'discuss' && !showComment) {
      setShowComment(true)
      return
    }
    await onRespond(item.id, type, respondComment || undefined)
    setRespondComment('')
    setShowComment(false)
  }

  return (
    <div
      style={{
        ...baseStyles.card.base,
        padding: 0,
        overflow: 'hidden',
        animation: `fadeInUp 0.3s ease-out ${index * 0.05}s both`,
        borderRight: `3px solid ${statusConfig.color}`,
      }}
    >
      {/* שורה ראשית */}
      <div
        onClick={onToggleExpand}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing[3],
          padding: `${theme.spacing[4]} ${theme.spacing[5]}`,
          cursor: 'pointer',
          transition: `background-color ${theme.transitions.fast}`,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.colors.gray[50] }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
      >
        {/* מספר */}
        <span
          style={{
            minWidth: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: statusConfig.bgColor,
            color: statusConfig.color,
            borderRadius: theme.borderRadius.full,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.bold,
          }}
        >
          {item.item_number}
        </span>

        {/* כותרת */}
        <span
          style={{
            flex: 1,
            fontSize: theme.typography.fontSize.base,
            fontWeight: theme.typography.fontWeight.medium,
            color: theme.colors.text.primary,
            textDecoration: item.status === 'resolved' ? 'line-through' : 'none',
            opacity: item.status === 'resolved' ? 0.6 : 1,
          }}
        >
          {item.title}
        </span>

        {/* סטטוס */}
        <span style={{ ...baseStyles.badge.base, backgroundColor: statusConfig.bgColor, color: statusConfig.color }}>
          {statusConfig.icon} {statusConfig.name}
        </span>

        {/* חץ */}
        <span
          style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.text.disabled,
            transition: `transform ${theme.transitions.fast}`,
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        >
          ◀
        </span>
      </div>

      {/* תוכן מורחב */}
      {isExpanded && (
        <div
          style={{
            padding: `0 ${theme.spacing[5]} ${theme.spacing[4]}`,
            borderTop: `1px solid ${theme.colors.border.light}`,
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          {/* תיאור */}
          {item.description && (
            <p
              style={{
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.text.secondary,
                margin: `${theme.spacing[3]} 0`,
                lineHeight: theme.typography.lineHeight.relaxed,
                paddingRight: theme.spacing[10],
              }}
            >
              {item.description}
            </p>
          )}

          {/* תגובות קיימות */}
          {responses.length > 0 && (
            <div style={{ margin: `${theme.spacing[3]} 0` }}>
              <div style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.text.tertiary, marginBottom: theme.spacing[2], fontWeight: theme.typography.fontWeight.semibold }}>
                תגובות:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2] }}>
                {responses.map((r) => {
                  const rConfig = RESPONSE_TYPE_CONFIG[r.response_type]
                  return (
                    <div
                      key={r.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: theme.spacing[2],
                        padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
                        backgroundColor: rConfig.bgColor,
                        borderRadius: theme.borderRadius.lg,
                        fontSize: theme.typography.fontSize.sm,
                      }}
                    >
                      <span style={{ fontWeight: theme.typography.fontWeight.medium, color: rConfig.color }}>
                        {rConfig.icon}
                      </span>
                      <span style={{ fontWeight: theme.typography.fontWeight.medium, color: theme.colors.text.primary }}>
                        {r.user?.full_name || 'Unknown'}
                      </span>
                      <span style={{ color: rConfig.color, fontWeight: theme.typography.fontWeight.medium }}>
                        {rConfig.name}
                      </span>
                      {r.comment && (
                        <span style={{ color: theme.colors.text.secondary, flex: 1 }}>
                          — {r.comment}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* כפתורי תגובה */}
          {!locked && item.status !== 'resolved' && (
            <div style={{ margin: `${theme.spacing[3]} 0` }}>
              <div style={{ display: 'flex', gap: theme.spacing[2], flexWrap: 'wrap' }}>
                {Object.entries(RESPONSE_TYPE_CONFIG).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => handleRespond(key as ResponseType)}
                    style={{
                      ...baseStyles.button.base,
                      padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                      backgroundColor: config.bgColor,
                      color: config.color,
                      border: `1px solid ${config.color}20`,
                      fontSize: theme.typography.fontSize.sm,
                      gap: theme.spacing[1],
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = config.color
                      e.currentTarget.style.color = '#fff'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = config.bgColor
                      e.currentTarget.style.color = config.color
                    }}
                  >
                    {config.icon} {config.name}
                  </button>
                ))}
              </div>

              {/* שדה תגובה לדיון */}
              {showComment && (
                <div style={{ display: 'flex', gap: theme.spacing[2], marginTop: theme.spacing[2], animation: 'fadeIn 0.2s ease-out' }}>
                  <input
                    autoFocus
                    type="text"
                    placeholder="הערה לדיון..."
                    value={respondComment}
                    onChange={(e) => setRespondComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRespond('discuss')
                      if (e.key === 'Escape') setShowComment(false)
                    }}
                    style={{ ...baseStyles.input.base, flex: 1, fontSize: theme.typography.fontSize.sm }}
                  />
                  <button onClick={() => handleRespond('discuss')} style={{ ...baseStyles.button.base, ...baseStyles.button.primary, fontSize: theme.typography.fontSize.sm }}>
                    שלח
                  </button>
                </div>
              )}
            </div>
          )}

          {/* כפתור Thread */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: theme.spacing[2] }}>
            <button
              onClick={onToggleThread}
              style={{
                ...baseStyles.button.base,
                ...baseStyles.button.ghost,
                fontSize: theme.typography.fontSize.sm,
                color: isThreadActive ? theme.colors.primary[600] : theme.colors.text.tertiary,
                gap: theme.spacing[1],
              }}
            >
              💬 {isThreadActive ? 'סגור דיון' : 'פתח דיון'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}


// ===========================================
// ThreadPanel - פאנל הודעות דיון
// ===========================================

interface ThreadPanelProps {
  itemId: string
  locked: boolean
  onClose: () => void
}

function ThreadPanel({ itemId, locked, onClose }: ThreadPanelProps) {
  const { messages, loading, sendMessage } = useItemThread(itemId)
  const [newMessage, setNewMessage] = useState('')

  const handleSend = async () => {
    if (!newMessage.trim()) return
    await sendMessage(newMessage.trim())
    setNewMessage('')
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: '380px',
        backgroundColor: theme.colors.background.secondary,
        boxShadow: theme.shadows.xl,
        zIndex: theme.zIndex.modal,
        display: 'flex',
        flexDirection: 'column',
        direction: 'rtl',
        fontFamily: theme.typography.fontFamily.sans,
        animation: 'slideInLeft 0.3s ease-out',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: `${theme.spacing[4]} ${theme.spacing[5]}`,
          borderBottom: `1px solid ${theme.colors.border.light}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h3
          style={{
            fontSize: theme.typography.fontSize.base,
            fontWeight: theme.typography.fontWeight.semibold,
            margin: 0,
          }}
        >
          💬 דיון ממוקד
        </h3>
        <button onClick={onClose} style={{ ...baseStyles.button.base, ...baseStyles.button.ghost, padding: theme.spacing[2] }}>
          ✕
        </button>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: theme.spacing[4],
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing[3],
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: theme.spacing[8], color: theme.colors.text.disabled }}>
            טוען...
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: theme.spacing[8], color: theme.colors.text.disabled }}>
            <div style={{ fontSize: '2rem', marginBottom: theme.spacing[2] }}>💬</div>
            <p style={{ fontSize: theme.typography.fontSize.sm, margin: 0 }}>אין הודעות עדיין. התחל את הדיון!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                backgroundColor: theme.colors.gray[50],
                borderRadius: theme.borderRadius.lg,
                animation: 'fadeIn 0.2s ease-out',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: theme.spacing[1] }}>
                <span style={{ fontSize: theme.typography.fontSize.xs, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.primary[600] }}>
                  {msg.user_id}
                </span>
                <span style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.text.disabled }}>
                  {new Date(msg.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.text.primary, margin: 0, lineHeight: theme.typography.lineHeight.relaxed }}>
                {msg.content}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      {!locked && (
        <div
          style={{
            padding: theme.spacing[4],
            borderTop: `1px solid ${theme.colors.border.light}`,
            display: 'flex',
            gap: theme.spacing[2],
          }}
        >
          <input
            type="text"
            placeholder="כתוב הודעה..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            style={{ ...baseStyles.input.base, flex: 1, fontSize: theme.typography.fontSize.sm }}
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            style={{
              ...baseStyles.button.base,
              ...baseStyles.button.primary,
              padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
              opacity: newMessage.trim() ? 1 : 0.5,
            }}
          >
            ➤
          </button>
        </div>
      )}
    </div>
  )
}


// ===========================================
// Helper Components
// ===========================================

function DetailSkeleton() {
  return (
    <div style={{ direction: 'rtl', padding: theme.spacing[6] }}>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            height: '60px',
            marginBottom: theme.spacing[3],
            borderRadius: theme.borderRadius.lg,
            background: `linear-gradient(90deg, ${theme.colors.gray[100]} 25%, ${theme.colors.gray[50]} 50%, ${theme.colors.gray[100]} 75%)`,
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
          }}
        />
      ))}
    </div>
  )
}

function DetailError({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: theme.spacing[12], direction: 'rtl' }}>
      <div style={{ fontSize: '3rem', marginBottom: theme.spacing[4] }}>⚠️</div>
      <p style={{ color: theme.colors.error.main, fontFamily: theme.typography.fontFamily.sans, marginBottom: theme.spacing[4] }}>
        {message}
      </p>
      <button onClick={onBack} style={{ ...baseStyles.button.base, ...baseStyles.button.secondary }}>
        → חזרה
      </button>
    </div>
  )
}
