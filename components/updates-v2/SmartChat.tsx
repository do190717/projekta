'use client'

// ===========================================
// Projekta Smart Chat — Premium UI
// ===========================================
// נתיב: components/updates-v2/SmartChat.tsx
// ===========================================

import { useState, useRef, useEffect, useCallback } from 'react'
import { useChat } from '@/lib/updates-v2/useChat'
import { useTasks } from '@/lib/updates-v2/useTasks'
import { useUnreadCount } from '@/lib/updates-v2/useUnreadCount'
import type { ChatMessageRow, MiniProfile } from '@/lib/updates-v2/types'
import { TaskBoardPanel, DecisionTimelinePanel, SearchPanel } from './ChatPanels'

// ====== DESIGN TOKENS ======

const C = {
  // Brand
  indigo: '#4F46E5', indigoLight: '#6366F1', indigoDark: '#4338CA',
  indigoPale: '#EEF2FF', indigoGlow: 'rgba(99,102,241,0.15)',
  teal: '#0D9488', tealLight: '#14B8A6', tealPale: '#F0FDFA',
  gold: '#B45309', goldLight: '#D97706', goldPale: '#FEF3C7',
  amber: '#F59E0B',
  // UI
  slate900: '#0F172A', slate800: '#1E293B', slate700: '#334155',
  slate600: '#475569', slate500: '#64748B', slate400: '#94A3B8',
  slate300: '#CBD5E1', slate200: '#E2E8F0', slate100: '#F1F5F9', slate50: '#F8FAFC',
  white: '#FFFFFF',
  green: '#059669', greenBg: '#ECFDF5',
  red: '#DC2626', redBg: '#FEF2F2',
}

// User avatar colors - each user gets a consistent color
const USER_COLORS = [
  { bg: 'linear-gradient(135deg, #6366F1, #818CF8)', text: '#fff' },
  { bg: 'linear-gradient(135deg, #0D9488, #14B8A6)', text: '#fff' },
  { bg: 'linear-gradient(135deg, #D97706, #F59E0B)', text: '#fff' },
  { bg: 'linear-gradient(135deg, #DC2626, #EF4444)', text: '#fff' },
  { bg: 'linear-gradient(135deg, #7C3AED, #8B5CF6)', text: '#fff' },
  { bg: 'linear-gradient(135deg, #2563EB, #3B82F6)', text: '#fff' },
  { bg: 'linear-gradient(135deg, #DB2777, #EC4899)', text: '#fff' },
  { bg: 'linear-gradient(135deg, #059669, #10B981)', text: '#fff' },
]

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '🙏', '✅']

// ====== HELPERS ======

function getUserColorIndex(userId: string): number {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) % USER_COLORS.length
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return parts[0][0] + parts[1][0]
  return parts[0][0]
}

// ====== PROPS ======

interface SmartChatProps {
  projectId: string
  projectName: string
  currentUserId: string
  isMobile?: boolean
}

// ====== MAIN COMPONENT ======

export default function SmartChat({ projectId, projectName, currentUserId, isMobile = false }: SmartChatProps) {
  const {
    messages, profiles, reactions, attachments, loading,
    hasMore, loadMore, sendMessage, uploadAndSend, deleteMessage,
    addReaction, removeReaction, markAsRead,
  } = useChat(projectId)

  const {
    tasks, decisions, taskStats, loading: tasksLoading,
    createTask, updateTaskStatus, updateTask, deleteTask,
    createDecision, searchMessages,
  } = useTasks(projectId)

  const { refreshUnread } = useUnreadCount(projectId)

  // Mark as read when messages load and when visible
  useEffect(() => {
    if (!currentUserId || messages.length === 0) return
    const unread = messages.filter(m => m.user_id !== currentUserId).slice(-20).map(m => m.id)
    if (unread.length > 0) {
      markAsRead(unread).then(() => {
        setTimeout(() => refreshUnread(), 500)
      })
    }
  }, [messages, currentUserId, markAsRead, refreshUnread])

  const [inputText, setInputText] = useState('')
  const [replyTo, setReplyTo] = useState<ChatMessageRow | null>(null)
  const [activeReactionMsg, setActiveReactionMsg] = useState<string | null>(null)
  const [showScrollDown, setShowScrollDown] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const [activePanel, setActivePanel] = useState<'tasks' | 'decisions' | 'search' | null>(null)
  const [taskFromMsg, setTaskFromMsg] = useState<ChatMessageRow | null>(null)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const chatRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const isAtBottom = useRef(true)

  // --- Auto-scroll ---
  useEffect(() => {
    if (isAtBottom.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleScroll = useCallback(() => {
    if (!chatRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = chatRef.current
    isAtBottom.current = scrollHeight - scrollTop - clientHeight < 80
    setShowScrollDown(!isAtBottom.current)
    if (scrollTop < 50 && hasMore) loadMore()
  }, [hasMore, loadMore])

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Close reaction popup on outside click
  useEffect(() => {
    if (!activeReactionMsg) return
    const close = () => setActiveReactionMsg(null)
    const timer = setTimeout(() => document.addEventListener('click', close), 50)
    return () => { clearTimeout(timer); document.removeEventListener('click', close) }
  }, [activeReactionMsg])

  // --- Send ---
  const handleSend = async () => {
    if (!inputText.trim() && pendingFiles.length === 0) return
    const text = inputText.trim()
    setInputText('')
    setReplyTo(null)
    inputRef.current?.focus()

    if (pendingFiles.length > 0) {
      setUploading(true)
      await uploadAndSend(pendingFiles, text || undefined, replyTo?.id)
      setPendingFiles([])
      setPreviewUrls([])
      setUploading(false)
    } else {
      await sendMessage(text, replyTo?.id)
    }
  }

  // --- File Handling ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setPendingFiles(prev => [...prev, ...files])
    const urls = files.map(f => URL.createObjectURL(f))
    setPreviewUrls(prev => [...prev, ...urls])
    e.target.value = ''
  }

  const removePendingFile = (index: number) => {
    URL.revokeObjectURL(previewUrls[index])
    setPendingFiles(prev => prev.filter((_, i) => i !== index))
    setPreviewUrls(prev => prev.filter((_, i) => i !== index))
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items)
    const imageItems = items.filter(item => item.type.startsWith('image/'))
    if (imageItems.length === 0) return

    e.preventDefault()
    imageItems.forEach(item => {
      const file = item.getAsFile()
      if (!file) return
      const named = new File([file], `paste-${Date.now()}.png`, { type: file.type })
      setPendingFiles(prev => [...prev, named])
      setPreviewUrls(prev => [...prev, URL.createObjectURL(named)])
    })
  }

  // --- Helpers ---
  const getProfile = (userId: string): MiniProfile =>
    profiles[userId] || { id: userId, full_name: null, avatar_url: null }

  const getDisplayName = (userId: string): string => {
    if (userId === currentUserId) return 'אני'
    return getProfile(userId).full_name || 'משתמש'
  }

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return 'היום'
    if (d.toDateString() === yesterday.toDateString()) return 'אתמול'
    return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  // Group by date
  const groupedMessages: { date: string; messages: ChatMessageRow[] }[] = []
  let curDate = ''
  messages.forEach(msg => {
    const d = formatDate(msg.created_at)
    if (d !== curDate) { curDate = d; groupedMessages.push({ date: d, messages: [] }) }
    groupedMessages[groupedMessages.length - 1].messages.push(msg)
  })

  const memberCount = Object.keys(profiles).length || 1

  // ====== RENDER ======

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%', width: '100%',
      backgroundColor: '#EAEFF5',
      fontFamily: "'Heebo', sans-serif", direction: 'rtl',
      position: 'relative', overflow: 'hidden',
      borderRadius: isMobile ? 0 : '16px',
      boxShadow: isMobile ? 'none' : '0 4px 40px rgba(0,0,0,0.08)',
      margin: isMobile ? 0 : '16px 0',
    }}>

      {/* ============ HEADER ============ */}
      <div style={{
        background: `linear-gradient(135deg, ${C.indigo} 0%, ${C.indigoDark} 50%, #3730A3 100%)`,
        padding: isMobile ? '14px 16px' : '16px 24px',
        display: 'flex', alignItems: 'center', gap: 14,
        color: '#fff',
        boxShadow: '0 4px 30px rgba(79,70,229,.25)',
        position: 'relative', zIndex: 10, flexShrink: 0,
        borderRadius: isMobile ? 0 : '16px 16px 0 0',
      }}>
        {/* Project icon */}
        <div style={{
          width: 44, height: 44, borderRadius: 13,
          background: 'rgba(255,255,255,.12)',
          backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, border: '1px solid rgba(255,255,255,.08)',
        }}>🏗️</div>

        {/* Project info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 16, fontWeight: 700, letterSpacing: '-0.3px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{projectName}</div>
          <div style={{
            fontSize: 12, color: 'rgba(255,255,255,.55)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              backgroundColor: '#34D399', display: 'inline-block',
              boxShadow: '0 0 6px rgba(52,211,153,.5)',
            }} />
            {memberCount} משתתפים • צ׳אט פעיל
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6 }}>
          {([
            { icon: '🔍', panel: 'search' as const, badge: 0 },
            { icon: '📋', panel: 'tasks' as const, badge: taskStats.total - taskStats.done },
            { icon: '📌', panel: 'decisions' as const, badge: decisions.length },
          ]).map((btn) => (
            <button key={btn.panel}
              onClick={() => setActivePanel(activePanel === btn.panel ? null : btn.panel)}
              style={{
                width: 36, height: 36, borderRadius: 10,
                border: '1px solid rgba(255,255,255,.1)',
                backgroundColor: activePanel === btn.panel ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.08)',
                color: '#fff', fontSize: 16, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all .2s', position: 'relative',
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,.18)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = activePanel === btn.panel ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.08)'}
            >
              {btn.icon}
              {btn.badge > 0 && (
                <span style={{
                  position: 'absolute', top: -4, left: -4,
                  minWidth: 18, height: 18, borderRadius: 9,
                  backgroundColor: '#EF4444', color: '#fff',
                  fontSize: 10, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px', border: '2px solid rgba(79,70,229,0.8)',
                }}>{btn.badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ============ AI STATUS BAR ============ */}
      <div style={{
        padding: '8px 20px',
        background: `linear-gradient(90deg, ${C.goldPale}, #FFFBEB)`,
        borderBottom: '1px solid rgba(217,119,6,.08)',
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 12.5, flexShrink: 0,
      }}>
        <span style={{
          fontSize: 14, color: C.goldLight,
          animation: 'aiPulse 2s ease-in-out infinite',
        }}>✦</span>
        <span style={{ color: C.gold, fontWeight: 600 }}>
          Projekta AI פעיל
        </span>
        <span style={{ color: C.slate400 }}>—</span>
        <span style={{ color: C.slate500 }}>
          {taskStats.total > 0
            ? `${taskStats.total - taskStats.done} משימות פתוחות • ${taskStats.done} הושלמו`
            : 'מזהה משימות • מתעד החלטות • שומר הקשר'
          }
        </span>
      </div>

      {/* ============ CHAT AREA ============ */}
      <div
        ref={chatRef}
        onScroll={handleScroll}
        style={{
          flex: 1, overflowY: 'auto', padding: '16px 16px',
          display: 'flex', flexDirection: 'column', gap: 4,
          background: 'linear-gradient(180deg, #E8EDF3 0%, #EAEFF5 30%, #EDF1F7 100%)',
        }}
      >
        {/* Load More */}
        {hasMore && (
          <div style={{ textAlign: 'center', padding: '8px 0 12px' }}>
            <button onClick={loadMore} style={{
              fontSize: 12, color: C.slate500, backgroundColor: C.white,
              padding: '7px 20px', borderRadius: 20,
              border: `1px solid ${C.slate200}`,
              cursor: 'pointer', fontFamily: "'Heebo',sans-serif",
              fontWeight: 500, transition: 'all .2s',
              boxShadow: '0 1px 4px rgba(0,0,0,.04)',
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.08)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,.04)'}
            >⬆️ טען הודעות קודמות</button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: C.slate400 }}>
            <div style={{ fontSize: 40, marginBottom: 12, animation: 'aiPulse 1.5s infinite' }}>💬</div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>טוען הודעות...</div>
          </div>
        )}

        {/* Empty */}
        {!loading && messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 24px', color: C.slate400 }}>
            <div style={{
              width: 80, height: 80, borderRadius: 24,
              background: `linear-gradient(135deg, ${C.indigoPale}, #E0E7FF)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 36, margin: '0 auto 20px',
              boxShadow: `0 8px 30px ${C.indigoGlow}`,
            }}>🏗️</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.slate800, marginBottom: 6 }}>
              ברוכים הבאים לצ׳אט הפרויקט
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.6, maxWidth: 280, margin: '0 auto' }}>
              כתבו את ההודעה הראשונה כדי להתחיל.
              <br />ה-AI יזהה משימות והחלטות אוטומטית ✦
            </div>
          </div>
        )}

        {/* Messages */}
        {groupedMessages.map((group) => (
          <div key={group.date}>
            {/* Date Separator */}
            <div style={{ textAlign: 'center', padding: '12px 0 8px' }}>
              <span style={{
                fontSize: 12, color: C.slate500,
                backgroundColor: 'rgba(255,255,255,.85)',
                padding: '4px 16px', borderRadius: 20,
                fontWeight: 600, backdropFilter: 'blur(8px)',
                boxShadow: '0 1px 4px rgba(0,0,0,.03)',
              }}>{group.date}</span>
            </div>

            {/* Messages */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {group.messages.map((msg, idx) => {
                const isMe = msg.user_id === currentUserId
                const prevMsg = idx > 0 ? group.messages[idx - 1] : null
                const nextMsg = idx < group.messages.length - 1 ? group.messages[idx + 1] : null
                const showName = !isMe && (!prevMsg || prevMsg.user_id !== msg.user_id)
                const showAvatar = !isMe && (!nextMsg || nextMsg.user_id !== msg.user_id)
                const isFirstInGroup = !prevMsg || prevMsg.user_id !== msg.user_id
                const isLastInGroup = !nextMsg || nextMsg.user_id !== msg.user_id
                const msgReactions = reactions[msg.id] || []
                const colorIdx = getUserColorIndex(msg.user_id)
                const userColor = USER_COLORS[colorIdx]
                const profile = getProfile(msg.user_id)

                // Bubble radius logic
                const radiusTR = '18px'
                const radiusTL = '18px'
                const radiusBR = isMe ? (isLastInGroup ? '4px' : '18px') : '18px'
                const radiusBL = !isMe ? (isLastInGroup ? '4px' : '18px') : '18px'

                return (
                  <div key={msg.id} style={{
                    display: 'flex',
                    direction: 'ltr',
                    justifyContent: isMe ? 'flex-start' : 'flex-end',
                    gap: 8, alignItems: 'flex-end',
                    marginTop: isFirstInGroup ? 10 : 1,
                    paddingLeft: isMe ? 4 : 0,
                    paddingRight: !isMe ? 4 : 0,
                    animation: isFirstInGroup ? 'msgIn .3s ease' : undefined,
                  }}>
                    {/* Avatar */}
                    {!isMe && (
                      <div style={{ width: 34, minWidth: 34, marginBottom: 2 }}>
                        {showAvatar && (
                          <div style={{
                            width: 34, height: 34, borderRadius: '50%',
                            background: userColor.bg,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, color: userColor.text, fontWeight: 700,
                            boxShadow: '0 2px 8px rgba(0,0,0,.1)',
                            border: '2px solid #fff',
                          }}>
                            {getInitials(profile.full_name)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Bubble wrapper */}
                    <div style={{ maxWidth: '75%', position: 'relative', direction: 'rtl' }}>
                      {/* Name */}
                      {showName && (
                        <div style={{
                          fontSize: 12.5, fontWeight: 700,
                          color: USER_COLORS[colorIdx].text === '#fff'
                            ? C.slate600
                            : C.slate600,
                          marginBottom: 3, paddingRight: 6,
                        }}>{getDisplayName(msg.user_id)}</div>
                      )}

                      {/* Reply preview */}
                      {msg.reply_to && (() => {
                        const original = messages.find(m => m.id === msg.reply_to)
                        if (!original) return null
                        return (
                          <div style={{
                            fontSize: 12, padding: '6px 12px', marginBottom: 2,
                            borderRadius: '12px 12px 4px 4px',
                            backgroundColor: isMe ? 'rgba(255,255,255,.15)' : C.slate100,
                            borderRight: `3px solid ${isMe ? 'rgba(255,255,255,.4)' : C.indigoLight}`,
                            color: isMe ? 'rgba(255,255,255,.7)' : C.slate500,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            <span style={{ fontWeight: 700 }}>{getDisplayName(original.user_id)}: </span>
                            {original.content.slice(0, 50)}
                          </div>
                        )
                      })()}

                      {/* Bubble */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveReactionMsg(activeReactionMsg === msg.id ? null : msg.id)
                        }}
                        style={{
                          padding: '10px 14px',
                          borderRadius: `${radiusTR} ${radiusTL} ${radiusBL} ${radiusBR}`,
                          backgroundColor: isMe ? C.indigo : C.white,
                          color: isMe ? '#fff' : C.slate900,
                          boxShadow: isMe
                            ? '0 2px 12px rgba(79,70,229,.18)'
                            : '0 1px 4px rgba(0,0,0,.06)',
                          fontSize: 14.5, lineHeight: 1.65,
                          whiteSpace: 'pre-wrap', cursor: 'pointer',
                          userSelect: 'text',
                          transition: 'box-shadow .2s',
                          position: 'relative',
                        }}
                      >
                        {msg.deleted_at ? (
                          <span style={{ fontStyle: 'italic', opacity: 0.5, fontSize: 13 }}>🚫 הודעה נמחקה</span>
                        ) : (
                          <>
                            {/* Attachments */}
                            {(attachments[msg.id] || []).length > 0 && (
                              <div style={{
                                display: 'flex', flexWrap: 'wrap', gap: 4,
                                marginBottom: msg.content && !msg.content.startsWith('📎') ? 8 : 0,
                              }}>
                                {(attachments[msg.id] || []).map(att => (
                                  att.file_type.startsWith('image/') ? (
                                    <a key={att.id} href={att.file_url} target="_blank" rel="noopener noreferrer"
                                      onClick={e => e.stopPropagation()}
                                      style={{ display: 'block', borderRadius: 8, overflow: 'hidden' }}>
                                      <img src={att.file_url} alt={att.file_name} style={{
                                        maxWidth: 260, maxHeight: 200, borderRadius: 8,
                                        objectFit: 'cover', display: 'block',
                                      }} />
                                    </a>
                                  ) : (
                                    <a key={att.id} href={att.file_url} target="_blank" rel="noopener noreferrer"
                                      onClick={e => e.stopPropagation()}
                                      style={{
                                        display: 'flex', alignItems: 'center', gap: 6,
                                        padding: '6px 10px', borderRadius: 8,
                                        backgroundColor: isMe ? 'rgba(255,255,255,.12)' : C.slate100,
                                        fontSize: 12, textDecoration: 'none',
                                        color: isMe ? 'rgba(255,255,255,.8)' : C.slate600,
                                      }}>
                                      <span>📄</span>
                                      <span>{att.file_name}</span>
                                      <span style={{ opacity: 0.5 }}>({(att.file_size / 1024).toFixed(0)}KB)</span>
                                    </a>
                                  )
                                ))}
                              </div>
                            )}
                            {/* Text content - hide if it's just the auto-generated 📎 prefix */}
                            {msg.content && !msg.content.startsWith('📎') && (
                              <span>{msg.content}</span>
                            )}
                          </>
                        )}

                        {/* Time + read */}
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          justifyContent: isMe ? 'flex-start' : 'flex-end',
                          marginTop: 4,
                        }}>
                          <span style={{
                            fontSize: 10.5, direction: 'ltr',
                            color: isMe ? 'rgba(255,255,255,.45)' : C.slate400,
                          }}>{formatTime(msg.created_at)}</span>
                          {isMe && (
                            <span style={{
                              fontSize: 12,
                              color: 'rgba(255,255,255,.45)',
                            }}>✓✓</span>
                          )}
                        </div>
                      </div>

                      {/* Reactions display */}
                      {msgReactions.length > 0 && (
                        <div style={{
                          display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4,
                          justifyContent: isMe ? 'flex-end' : 'flex-start',
                        }}>
                          {Object.entries(
                            msgReactions.reduce((acc: Record<string, string[]>, r) => {
                              if (!acc[r.emoji]) acc[r.emoji] = []
                              acc[r.emoji].push(r.user_id)
                              return acc
                            }, {})
                          ).map(([emoji, users]) => (
                            <button key={emoji} onClick={(e) => {
                              e.stopPropagation()
                              if ((users as string[]).includes(currentUserId)) removeReaction(msg.id, emoji)
                              else addReaction(msg.id, emoji)
                            }} style={{
                              fontSize: 14, padding: '2px 8px', borderRadius: 12,
                              border: `1.5px solid ${(users as string[]).includes(currentUserId) ? C.indigoLight : C.slate200}`,
                              backgroundColor: (users as string[]).includes(currentUserId) ? C.indigoPale : C.white,
                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3,
                              boxShadow: '0 1px 3px rgba(0,0,0,.04)',
                              transition: 'all .15s',
                            }}>
                              <span>{emoji}</span>
                              {(users as string[]).length > 1 && (
                                <span style={{ fontSize: 11, color: C.slate500, fontWeight: 600 }}>
                                  {(users as string[]).length}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Reactions popup */}
                      {activeReactionMsg === msg.id && !msg.deleted_at && (
                        <div onClick={e => e.stopPropagation()} style={{
                          position: 'absolute',
                          top: -44,
                          ...(isMe ? { left: 0 } : { right: 0 }),
                          display: 'flex', gap: 2, padding: '6px 10px',
                          backgroundColor: C.white, borderRadius: 22,
                          boxShadow: '0 4px 20px rgba(0,0,0,.14)',
                          border: `1px solid ${C.slate100}`,
                          zIndex: 15, animation: 'msgIn .15s ease',
                          whiteSpace: 'nowrap',
                        }}>
                          {QUICK_REACTIONS.map(emoji => (
                            <button key={emoji} onClick={() => {
                              addReaction(msg.id, emoji)
                              setActiveReactionMsg(null)
                            }} style={{
                              fontSize: 20, padding: '3px 4px', borderRadius: 8,
                              border: 'none', backgroundColor: 'transparent',
                              cursor: 'pointer', transition: 'transform .12s',
                              lineHeight: 1,
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.3)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                            >{emoji}</button>
                          ))}
                          <div style={{ width: 1, backgroundColor: C.slate200, margin: '4px 2px' }} />
                          <button onClick={() => {
                            setReplyTo(msg); setActiveReactionMsg(null)
                            inputRef.current?.focus()
                          }} style={{
                            fontSize: 16, padding: '3px 6px', borderRadius: 8,
                            border: 'none', backgroundColor: 'transparent', cursor: 'pointer',
                          }}>↩️</button>
                          <button onClick={() => {
                            setTaskFromMsg(msg); setActiveReactionMsg(null)
                          }} style={{
                            fontSize: 16, padding: '3px 6px', borderRadius: 8,
                            border: 'none', backgroundColor: 'transparent', cursor: 'pointer',
                          }} title="צור משימה מהודעה">📋</button>
                          {isMe && (
                            <button onClick={() => {
                              deleteMessage(msg.id); setActiveReactionMsg(null)
                            }} style={{
                              fontSize: 16, padding: '3px 6px', borderRadius: 8,
                              border: 'none', backgroundColor: 'transparent', cursor: 'pointer',
                            }}>🗑️</button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* ============ SCROLL DOWN ============ */}
      {showScrollDown && (
        <button onClick={scrollToBottom} style={{
          position: 'absolute', bottom: 90, left: '50%', transform: 'translateX(-50%)',
          width: 42, height: 42, borderRadius: '50%',
          backgroundColor: C.white,
          border: `1px solid ${C.slate200}`,
          boxShadow: '0 4px 16px rgba(0,0,0,.12)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, zIndex: 5, animation: 'msgIn .2s ease',
        }}>⬇️</button>
      )}

      {/* ============ REPLY BAR ============ */}
      {replyTo && (
        <div style={{
          padding: '10px 20px',
          backgroundColor: C.white,
          borderTop: `1px solid ${C.slate200}`,
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        }}>
          <div style={{
            width: 4, height: 36, borderRadius: 4,
            background: `linear-gradient(180deg, ${C.indigo}, ${C.indigoLight})`,
            flexShrink: 0,
          }} />
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: C.indigo }}>
              {getDisplayName(replyTo.user_id)}
            </div>
            <div style={{
              fontSize: 13, color: C.slate500,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{replyTo.content.slice(0, 80)}</div>
          </div>
          <button onClick={() => setReplyTo(null)} style={{
            width: 28, height: 28, borderRadius: 8,
            border: `1px solid ${C.slate200}`, backgroundColor: C.slate50,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, color: C.slate400,
          }}>✕</button>
        </div>
      )}

      {/* ============ FILE PREVIEW ============ */}
      {previewUrls.length > 0 && (
        <div style={{
          padding: '10px 16px',
          backgroundColor: C.white,
          borderTop: `1px solid ${C.slate200}`,
          display: 'flex', gap: 8, overflowX: 'auto', flexShrink: 0,
        }}>
          {previewUrls.map((url, i) => (
            <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
              {pendingFiles[i]?.type.startsWith('image/') ? (
                <img src={url} alt="" style={{
                  width: 64, height: 64, borderRadius: 10,
                  objectFit: 'cover', border: `2px solid ${C.slate200}`,
                }} />
              ) : (
                <div style={{
                  width: 64, height: 64, borderRadius: 10,
                  backgroundColor: C.slate100, border: `2px solid ${C.slate200}`,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 2,
                }}>
                  <span style={{ fontSize: 20 }}>📄</span>
                  <span style={{ fontSize: 8, color: C.slate500, maxWidth: 50, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {pendingFiles[i]?.name}
                  </span>
                </div>
              )}
              <button onClick={() => removePendingFile(i)} style={{
                position: 'absolute', top: -6, right: -6,
                width: 20, height: 20, borderRadius: '50%',
                backgroundColor: C.red, color: '#fff',
                border: '2px solid #fff', fontSize: 10, fontWeight: 800,
                cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* ============ INPUT ============ */}
      <div style={{
        padding: '12px 16px',
        borderTop: previewUrls.length > 0 ? 'none' : `1px solid ${C.slate200}`,
        backgroundColor: C.white,
        display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0,
        borderRadius: isMobile ? 0 : '0 0 16px 16px',
      }}>
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf,video/mp4"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {/* Attach button */}
        <button onClick={() => fileInputRef.current?.click()} style={{
          width: 40, height: 40, borderRadius: '50%', border: 'none',
          backgroundColor: C.slate100, color: C.slate500,
          fontSize: 18, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .2s', flexShrink: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.backgroundColor = C.indigoPale; e.currentTarget.style.color = C.indigo }}
        onMouseLeave={e => { e.currentTarget.style.backgroundColor = C.slate100; e.currentTarget.style.color = C.slate500 }}
        >📎</button>

        <div style={{
          flex: 1, display: 'flex', alignItems: 'center',
          backgroundColor: C.slate50,
          borderRadius: 24, padding: '4px 6px 4px 16px',
          border: `2px solid ${inputFocused ? C.indigoLight : C.slate200}`,
          transition: 'all .25s',
          boxShadow: inputFocused ? `0 0 0 3px ${C.indigoGlow}` : 'none',
        }}>
          <input
            ref={inputRef}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            onPaste={handlePaste}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); handleSend()
              }
            }}
            placeholder={pendingFiles.length > 0 ? 'הוסף הודעה לתמונה...' : 'כתוב הודעה...'}
            style={{
              flex: 1, border: 'none', outline: 'none',
              backgroundColor: 'transparent',
              fontSize: 15, fontFamily: "'Heebo',sans-serif",
              color: C.slate900, direction: 'rtl', padding: '10px 0',
            }}
          />
          <button
            onClick={handleSend}
            disabled={(!inputText.trim() && pendingFiles.length === 0) || uploading}
            style={{
              width: 40, height: 40, borderRadius: '50%', border: 'none',
              background: (inputText.trim() || pendingFiles.length > 0) && !uploading
                ? `linear-gradient(135deg, ${C.indigo}, ${C.indigoLight})`
                : C.slate300,
              color: '#fff', fontSize: uploading ? 14 : 17,
              cursor: (inputText.trim() || pendingFiles.length > 0) && !uploading ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all .25s',
              transform: (inputText.trim() || pendingFiles.length > 0) && !uploading
                ? 'scale(1) rotate(-90deg)' : 'scale(.85) rotate(-90deg)',
              boxShadow: (inputText.trim() || pendingFiles.length > 0) && !uploading
                ? `0 3px 12px ${C.indigoGlow}` : 'none',
              animation: uploading ? 'aiPulse 1s infinite' : 'none',
            }}
          >{uploading ? '⏳' : '▲'}</button>
        </div>
      </div>

      {/* ============ TASK FROM MESSAGE MODAL ============ */}
      {taskFromMsg && (
        <TaskFromMessageModal
          message={taskFromMsg}
          onConfirm={async (title: string, category: string) => {
            await createTask({ title, category, source_message_id: taskFromMsg.id })
            setTaskFromMsg(null)
          }}
          onClose={() => setTaskFromMsg(null)}
        />
      )}

      {/* ============ SIDE PANELS ============ */}
      {activePanel === 'tasks' && (
        <TaskBoardPanel
          tasks={tasks}
          stats={taskStats}
          onUpdateStatus={updateTaskStatus}
          onUpdateTask={updateTask}
          onDeleteTask={deleteTask}
          onCreateTask={(title: string, category?: string) => createTask({ title, category })}
          onClose={() => setActivePanel(null)}
        />
      )}
      {activePanel === 'decisions' && (
        <DecisionTimelinePanel
          decisions={decisions}
          profiles={profiles}
          onClose={() => setActivePanel(null)}
        />
      )}
      {activePanel === 'search' && (
        <SearchPanel
          onSearch={searchMessages}
          profiles={profiles}
          onClose={() => setActivePanel(null)}
        />
      )}

      {/* ============ CSS ============ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800&display=swap');
        @keyframes msgIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes aiPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: .4; transform: scale(.9); }
        }
        div::-webkit-scrollbar { width: 4px; }
        div::-webkit-scrollbar-track { background: transparent; }
        div::-webkit-scrollbar-thumb { background: ${C.slate300}; border-radius: 10px; }
        div::-webkit-scrollbar-thumb:hover { background: ${C.slate400}; }
      `}</style>
    </div>
  )
}


// ===========================================
// Task From Message Modal
// ===========================================

const CATEGORIES = ['כללי', 'ריצוף', 'חשמל', 'אינסטלציה', 'דלתות', 'צבע', 'אלומיניום', 'גבס', 'ברזל', 'ניקיון']

function TaskFromMessageModal({ message, onConfirm, onClose }: {
  message: ChatMessageRow
  onConfirm: (title: string, category: string) => Promise<void>
  onClose: () => void
}) {
  const [title, setTitle] = useState(message.content.slice(0, 120))
  const [category, setCategory] = useState('כללי')
  const [saving, setSaving] = useState(false)

  // Auto-detect category
  useState(() => {
    const text = message.content.toLowerCase()
    if (text.includes('חשמל') || text.includes('שקע') || text.includes('תאורה')) setCategory('חשמל')
    else if (text.includes('ריצוף') || text.includes('אריח')) setCategory('ריצוף')
    else if (text.includes('אינסטלציה') || text.includes('צנרת') || text.includes('ברז')) setCategory('אינסטלציה')
    else if (text.includes('דלת')) setCategory('דלתות')
    else if (text.includes('צבע') || text.includes('שפכטל')) setCategory('צבע')
    else if (text.includes('אלומיניום') || text.includes('חלון')) setCategory('אלומיניום')
    else if (text.includes('גבס') || text.includes('תקרה')) setCategory('גבס')
    else if (text.includes('ברזל') || text.includes('פלדה')) setCategory('ברזל')
  })

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    await onConfirm(title.trim(), category)
    setSaving(false)
  }

  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, zIndex: 30,
      backgroundColor: 'rgba(0,0,0,0.4)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, animation: 'msgIn .2s ease',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 400,
        backgroundColor: '#fff', borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,.18)',
        overflow: 'hidden', direction: 'rtl',
        fontFamily: "'Heebo',sans-serif",
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          background: 'linear-gradient(135deg, #4F46E5, #4338CA)',
          color: '#fff',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 22 }}>📋</span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>צור משימה מהודעה</div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>המשימה תקושר להודעה המקורית</div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '20px' }}>
          {/* Original message preview */}
          <div style={{
            padding: '10px 14px', borderRadius: 10,
            backgroundColor: '#F1F5F9', marginBottom: 16,
            borderRight: '3px solid #6366F1',
            fontSize: 13, color: '#64748B', lineHeight: 1.5,
            maxHeight: 60, overflow: 'hidden',
          }}>
            {message.content.slice(0, 100)}{message.content.length > 100 ? '...' : ''}
          </div>

          {/* Title */}
          <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
            כותרת המשימה
          </label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            autoFocus
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 10,
              border: '2px solid #E2E8F0', fontSize: 14,
              fontFamily: "'Heebo',sans-serif", color: '#0F172A',
              outline: 'none', direction: 'rtl', boxSizing: 'border-box',
              transition: 'border-color .2s',
            }}
            onFocus={e => e.currentTarget.style.borderColor = '#6366F1'}
            onBlur={e => e.currentTarget.style.borderColor = '#E2E8F0'}
          />

          {/* Category */}
          <label style={{
            fontSize: 13, fontWeight: 700, color: '#334155',
            display: 'block', marginTop: 14, marginBottom: 8,
          }}>
            קטגוריה
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)} style={{
                padding: '5px 14px', borderRadius: 20, fontSize: 12.5, fontWeight: 600,
                border: category === cat ? '2px solid #4F46E5' : '1px solid #E2E8F0',
                backgroundColor: category === cat ? '#EEF2FF' : 'transparent',
                color: category === cat ? '#4F46E5' : '#64748B',
                cursor: 'pointer', fontFamily: "'Heebo',sans-serif",
                transition: 'all .15s',
              }}>{cat}</button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{
          padding: '14px 20px', borderTop: '1px solid #E2E8F0',
          display: 'flex', gap: 8, justifyContent: 'flex-start',
        }}>
          <button onClick={handleSave} disabled={!title.trim() || saving} style={{
            padding: '9px 28px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, #4F46E5, #6366F1)',
            color: '#fff', fontSize: 14, fontWeight: 700,
            cursor: title.trim() && !saving ? 'pointer' : 'default',
            fontFamily: "'Heebo',sans-serif",
            opacity: title.trim() && !saving ? 1 : 0.5,
            boxShadow: '0 2px 8px rgba(99,102,241,.25)',
          }}>
            {saving ? '...' : '✓ צור משימה'}
          </button>
          <button onClick={onClose} style={{
            padding: '9px 20px', borderRadius: 10,
            border: '1px solid #E2E8F0', backgroundColor: 'transparent',
            color: '#64748B', fontSize: 14, cursor: 'pointer',
            fontFamily: "'Heebo',sans-serif",
          }}>ביטול</button>
        </div>
      </div>
    </div>
  )
}
