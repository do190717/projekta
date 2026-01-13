'use client'

import { useEffect, useState, useRef } from 'react'

// ===========================================
// TYPES
// ===========================================

interface ChatMessage {
  id: string
  content: string
  user_id: string
  created_at: string
  reply_to?: string
  deleted_at?: string
  tagged_files?: string[]
}

interface Reaction {
  id: string
  comment_id: string
  user_id: string
  emoji: string
}

interface ReadStatus {
  comment_id: string
  user_id: string
  read_at: string
}

interface WhatsAppChatProps {
  messages: ChatMessage[]
  currentUserId: string
  profiles: { [key: string]: any }
  images: any[]
  reactions: Reaction[]
  readStatuses: ReadStatus[]
  teamMemberIds: string[]
  projectFiles: any[]
  onSendMessage: (content: string, replyTo?: string, imageFiles?: File[], taggedFileIds?: string[]) => void
  onDeleteMessage: (messageId: string) => void
  onAddReaction: (messageId: string, emoji: string) => void
  onRemoveReaction: (messageId: string, emoji: string) => void
  onMarkAsRead: (messageIds: string[]) => void
  onFileClick: (file: any) => void
  onClose: () => void
  updateContent: string
  isMobile: boolean
}

// ===========================================
// CONSTANTS
// ===========================================

const USER_COLORS = [
  '#25D366', '#34B7F1', '#9C27B0', '#E91E63', '#FF5722',
  '#009688', '#3F51B5', '#795548', '#607D8B', '#F44336',
]

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏']

const EMOJI_LIST = [
  '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂',
  '😉', '😍', '🥰', '😘', '😋', '😎', '🤩', '🥳', '😏', '😒',
  '😞', '😔', '😟', '😕', '🙁', '😣', '😖', '😫', '😩', '🥺',
  '😢', '😭', '😤', '😠', '😡', '🤬', '😈', '👿', '💀', '💩',
  '👍', '👎', '👌', '✌️', '🤞', '🤝', '👏', '🙌', '👐', '🤲',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '💕',
  '✅', '❌', '⭐', '🔥', '💯', '🎉', '🎊', '🙏', '💪', '🤔',
]

const FILE_ICONS: { [key: string]: string } = {
  pdf: '📕', dwg: '📐', dxf: '📐', jpg: '🖼️', jpeg: '🖼️', png: '🖼️',
  xlsx: '📊', xls: '📊', doc: '📝', docx: '📝', default: '📄',
}

const getFileIcon = (fileType: string) => FILE_ICONS[fileType?.toLowerCase()] || FILE_ICONS.default

// ===========================================
// HELPERS
// ===========================================

const getUserColor = (userId: string, colorMap: { [key: string]: string }): string => {
  if (!colorMap[userId]) {
    const usedColors = Object.values(colorMap)
    const available = USER_COLORS.filter(c => !usedColors.includes(c))
    colorMap[userId] = available.length > 0 
      ? available[0] 
      : USER_COLORS[Object.keys(colorMap).length % USER_COLORS.length]
  }
  return colorMap[userId]
}

const formatTime = (date: string): string => {
  return new Date(date).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
}

const formatDateSeparator = (date: string): string => {
  const d = new Date(date)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  if (d.toDateString() === today.toDateString()) return 'היום'
  if (d.toDateString() === yesterday.toDateString()) return 'אתמול'
  
  return d.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })
}

const shouldShowDateSeparator = (currentDate: string, prevDate?: string): boolean => {
  if (!prevDate) return true
  return new Date(currentDate).toDateString() !== new Date(prevDate).toDateString()
}

const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

// ===========================================
// SUB COMPONENTS
// ===========================================

function DateSeparator({ date }: { date: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
      <span style={{
        backgroundColor: '#e1f2fb',
        color: '#54656f',
        padding: '6px 14px',
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: '500',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
      }}>
        {formatDateSeparator(date)}
      </span>
    </div>
  )
}

function MessageReactions({ 
  reactions, 
  currentUserId,
  onAdd,
  onRemove,
}: { 
  reactions: Reaction[]
  currentUserId: string
  onAdd: (emoji: string) => void
  onRemove: (emoji: string) => void
}) {
  if (reactions.length === 0) return null
  
  const grouped: { [emoji: string]: Reaction[] } = {}
  reactions.forEach(r => {
    if (!grouped[r.emoji]) grouped[r.emoji] = []
    grouped[r.emoji].push(r)
  })
  
  return (
    <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
      {Object.entries(grouped).map(([emoji, reacts]) => {
        const myReaction = reacts.some(r => r.user_id === currentUserId)
        return (
          <button
            key={emoji}
            onClick={() => myReaction ? onRemove(emoji) : onAdd(emoji)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '12px',
              border: myReaction ? '2px solid #25D366' : '1px solid #e5e7eb',
              backgroundColor: myReaction ? '#dcf8c6' : 'white',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            <span>{emoji}</span>
            {reacts.length > 1 && (
              <span style={{ fontSize: '11px', color: '#667781' }}>{reacts.length}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function EmojiPicker({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void }) {
  return (
    <div 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 1100,
      }}
    >
      <div 
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          borderRadius: '16px 16px 0 0',
          padding: '16px',
          width: '100%',
          maxWidth: '400px',
          maxHeight: '300px',
          overflow: 'auto',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '8px' }}>
          {EMOJI_LIST.map(emoji => (
            <button
              key={emoji}
              onClick={() => { onSelect(emoji); onClose() }}
              style={{
                fontSize: '24px',
                padding: '8px',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                borderRadius: '8px',
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function FilePicker({ 
  files, 
  selectedIds,
  onToggle, 
  onClose 
}: { 
  files: any[]
  selectedIds: string[]
  onToggle: (file: any) => void
  onClose: () => void 
}) {
  const [search, setSearch] = useState('')
  
  const filteredFiles = files.filter(f => 
    !search || f.file_name?.toLowerCase().includes(search.toLowerCase())
  )
  
  return (
    <div 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 1100,
      }}
    >
      <div 
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          borderRadius: '16px 16px 0 0',
          padding: '16px',
          width: '100%',
          maxWidth: '400px',
          maxHeight: '400px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontWeight: '600', fontSize: '16px' }}>📎 תייג קובץ</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#667781' }}>×</button>
        </div>
        
        <input
          type="text"
          placeholder="🔍 חיפוש..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: '10px 14px',
            border: '1px solid #e5e7eb',
            borderRadius: '10px',
            fontSize: '14px',
            marginBottom: '12px',
          }}
        />
        
        <div style={{ flex: 1, overflow: 'auto' }}>
          {filteredFiles.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#667781', padding: '20px' }}>אין קבצים</p>
          ) : (
            filteredFiles.map(file => {
              const isSelected = selectedIds.includes(file.id)
              return (
                <div
                  key={file.id}
                  onClick={() => onToggle(file)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#dcf8c6' : '#f8fafc',
                    marginBottom: '8px',
                    border: isSelected ? '2px solid #25D366' : '1px solid transparent',
                  }}
                >
                  <span style={{ fontSize: '24px' }}>{getFileIcon(file.file_type)}</span>
                  <span style={{ flex: 1, fontSize: '14px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.file_name}
                  </span>
                  {isSelected && <span style={{ color: '#25D366', fontSize: '18px' }}>✓</span>}
                </div>
              )
            })
          )}
        </div>
        
        <button
          onClick={onClose}
          style={{
            marginTop: '12px',
            padding: '12px',
            backgroundColor: '#25D366',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          אישור {selectedIds.length > 0 && `(${selectedIds.length})`}
        </button>
      </div>
    </div>
  )
}

function MobileMessageMenu({ 
  isMe,
  onReply, 
  onCopy, 
  onDelete,
  onReaction,
  onClose,
}: { 
  isMe: boolean
  onReply: () => void
  onCopy: () => void
  onDelete?: () => void
  onReaction: () => void
  onClose: () => void
}) {
  return (
    <div 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 1100,
      }}
    >
      <div 
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          borderRadius: '16px 16px 0 0',
          padding: '8px 0',
          width: '100%',
          maxWidth: '500px',
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          padding: '16px',
          borderBottom: '1px solid #e5e7eb',
        }}>
          {QUICK_REACTIONS.map(emoji => (
            <button
              key={emoji}
              onClick={() => { onReaction(); onClose() }}
              style={{
                fontSize: '28px',
                padding: '8px',
                border: 'none',
                backgroundColor: '#f0f2f5',
                cursor: 'pointer',
                borderRadius: '50%',
                width: '48px',
                height: '48px',
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
        
        <button onClick={() => { onReply(); onClose() }} style={mobileMenuItemStyle}>
          ↩️ הגב
        </button>
        <button onClick={() => { onCopy(); onClose() }} style={mobileMenuItemStyle}>
          📋 העתק
        </button>
        {isMe && onDelete && (
          <button onClick={() => { onDelete(); onClose() }} style={{ ...mobileMenuItemStyle, color: '#ef4444' }}>
            🗑️ מחק
          </button>
        )}
        <button onClick={onClose} style={{ ...mobileMenuItemStyle, color: '#667781', borderTop: '8px solid #f0f2f5' }}>
          ביטול
        </button>
      </div>
    </div>
  )
}

const mobileMenuItemStyle: React.CSSProperties = {
  width: '100%',
  padding: '16px 24px',
  border: 'none',
  backgroundColor: 'transparent',
  cursor: 'pointer',
  textAlign: 'right',
  fontSize: '16px',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
}

function DesktopMessageMenu({ 
  isMe,
  onReply, 
  onCopy, 
  onDelete,
  onReaction,
  onClose,
}: { 
  isMe: boolean
  onReply: () => void
  onCopy: () => void
  onDelete?: () => void
  onReaction: () => void
  onClose: () => void
}) {
  return (
    <>
      <div 
        onClick={onClose}
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 5 }}
      />
      <div style={{
        position: 'absolute',
        bottom: '100%',
        left: 0,
        marginBottom: '4px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
        overflow: 'hidden',
        zIndex: 10,
        minWidth: '150px',
      }}>
        <button onClick={onReply} style={menuItemStyle}>↩️ הגב</button>
        <button onClick={onReaction} style={menuItemStyle}>😊 הגב באימוג׳י</button>
        <button onClick={onCopy} style={menuItemStyle}>📋 העתק</button>
        {isMe && onDelete && (
          <button onClick={onDelete} style={{ ...menuItemStyle, color: '#ef4444' }}>🗑️ מחק</button>
        )}
      </div>
    </>
  )
}

const menuItemStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  border: 'none',
  backgroundColor: 'transparent',
  cursor: 'pointer',
  textAlign: 'right',
  fontSize: '14px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
}

// ===========================================
// MESSAGE BUBBLE
// ===========================================

interface MessageBubbleProps {
  message: ChatMessage
  isMe: boolean
  userName: string
  userColor: string
  replyToMessage?: ChatMessage
  replyToUserName?: string
  replyToUserColor?: string
  messageImages: any[]
  reactions: Reaction[]
  currentUserId: string
  isMobile: boolean
  projectFiles: any[]
  onReply: () => void
  onDelete: () => void
  onAddReaction: (emoji: string) => void
  onRemoveReaction: (emoji: string) => void
  onImageClick: (url: string) => void
  onFileClick: (file: any) => void
}

function MessageBubble({
  message,
  isMe,
  userName,
  userColor,
  replyToMessage,
  replyToUserName,
  replyToUserColor,
  messageImages,
  reactions,
  currentUserId,
  isMobile,
  projectFiles,
  onReply,
  onDelete,
  onAddReaction,
  onRemoveReaction,
  onImageClick,
  onFileClick,
}: MessageBubbleProps) {
  
  const [showMenu, setShowMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [swipeX, setSwipeX] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  
  const isDeleted = !!message.deleted_at
  
  // Get tagged files for this message
  const taggedFiles = (message.tagged_files || [])
    .map(id => projectFiles.find(f => f.id === id))
    .filter(Boolean)
  
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    longPressTimer.current = setTimeout(() => {
      setShowMobileMenu(true)
      if (navigator.vibrate) navigator.vibrate(50)
    }, 500)
  }
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile) return
    const deltaX = e.touches[0].clientX - touchStartX.current
    const deltaY = Math.abs(e.touches[0].clientY - touchStartY.current)
    
    if (Math.abs(deltaX) > 10 || deltaY > 10) {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
    }
    
    if (deltaX > 0 && deltaX < 100 && deltaY < 30) {
      setSwipeX(deltaX)
    }
  }
  
  const handleTouchEnd = () => {
    if (!isMobile) return
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    if (swipeX > 60) onReply()
    setSwipeX(0)
  }
  
  const handleCopy = async () => {
    await copyToClipboard(message.content)
    setShowMenu(false)
  }
  
  const handleReactionSelect = (emoji: string) => {
    const hasMyReaction = reactions.some(r => r.user_id === currentUserId && r.emoji === emoji)
    if (hasMyReaction) {
      onRemoveReaction(emoji)
    } else {
      onAddReaction(emoji)
    }
    setShowMenu(false)
  }
  
  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: isMe ? 'flex-start' : 'flex-end',
          marginBottom: '4px',
          transform: `translateX(${swipeX * 0.5}px)`,
          transition: swipeX === 0 ? 'transform 0.2s ease' : 'none',
        }}
        onMouseEnter={() => !isMobile && setIsHovered(true)}
        onMouseLeave={() => !isMobile && setIsHovered(false)}
      >
        {swipeX > 30 && (
          <div style={{
            position: 'absolute',
            right: isMe ? 'auto' : '8px',
            left: isMe ? '8px' : 'auto',
            opacity: Math.min(swipeX / 60, 1),
            fontSize: '24px',
          }}>
            ↩️
          </div>
        )}
        
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ 
            position: 'relative', 
            maxWidth: isMobile ? '85%' : '65%',
            zIndex: showMenu ? 100 : 1,
          }}
        >
          {!isMobile && isHovered && !isDeleted && (
            <button
              onClick={() => setShowMenu(!showMenu)}
              style={{
                position: 'absolute',
                top: '4px',
                left: isMe ? 'auto' : '4px',
                right: isMe ? '4px' : 'auto',
                background: 'rgba(255,255,255,0.9)',
                border: 'none',
                borderRadius: '4px',
                padding: '2px 6px',
                cursor: 'pointer',
                fontSize: '12px',
                color: '#667781',
                zIndex: 5,
              }}
            >
              ⋮
            </button>
          )}
          
          {showMenu && !isMobile && (
            <DesktopMessageMenu
              isMe={isMe}
              onReply={() => { onReply(); setShowMenu(false) }}
              onCopy={handleCopy}
              onDelete={isMe ? () => { onDelete(); setShowMenu(false) } : undefined}
              onReaction={() => setShowEmojiPicker(true)}
              onClose={() => setShowMenu(false)}
            />
          )}
          
          <div style={{
            backgroundColor: isDeleted ? 'rgba(0,0,0,0.05)' : isMe ? '#dcf8c6' : 'white',
            borderRadius: '12px',
            borderTopRightRadius: isMe ? '12px' : '4px',
            borderTopLeftRadius: isMe ? '4px' : '12px',
            padding: '8px 12px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
          }}>
            {!isMe && !isDeleted && (
              <div style={{ fontSize: '12px', fontWeight: '600', color: userColor, marginBottom: '4px' }}>
                {userName}
              </div>
            )}
            
            {replyToMessage && !isDeleted && (
              <div style={{
                backgroundColor: isMe ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.03)',
                borderRight: `4px solid ${replyToUserColor || '#667781'}`,
                borderRadius: '6px',
                padding: '8px 10px',
                marginBottom: '8px',
                fontSize: '12px',
              }}>
                <div style={{ fontWeight: '600', color: replyToUserColor || '#667781', marginBottom: '2px' }}>
                  {replyToUserName || 'משתמש'}
                </div>
                <div style={{ color: '#667781', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {replyToMessage.deleted_at ? '🚫 ההודעה נמחקה' : replyToMessage.content || '📷 תמונה'}
                </div>
              </div>
            )}
            
            {messageImages.length > 0 && !isDeleted && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: message.content ? '8px' : '0' }}>
                {messageImages.map(img => (
                  <img
                    key={img.id}
                    src={img.url}
                    onClick={() => onImageClick(img.url)}
                    style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '8px', objectFit: 'cover', cursor: 'pointer' }}
                  />
                ))}
              </div>
            )}
            
            {/* Tagged Files */}
            {taggedFiles.length > 0 && !isDeleted && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: message.content ? '8px' : '4px' }}>
                {taggedFiles.map(file => (
                  <div
                    key={file.id}
                    onClick={() => onFileClick(file)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 10px',
                      backgroundColor: isMe ? 'rgba(0,0,0,0.08)' : '#f1f5f9',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500',
                    }}
                  >
                    <span>{getFileIcon(file.file_type)}</span>
                    <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {file.file_name}
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            {isDeleted ? (
              <div style={{ fontSize: '14px', color: '#667781', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🚫 ההודעה נמחקה
              </div>
            ) : message.content && (
              <div style={{ fontSize: '14px', color: '#303030', lineHeight: '1.4', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                {message.content}
              </div>
            )}
            
            <div style={{ fontSize: '11px', color: '#667781', textAlign: 'left', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {formatTime(message.created_at)}
              {isMe && !isDeleted && <span style={{ color: '#53bdeb' }}>✓✓</span>}
            </div>
          </div>
          
          {!isDeleted && (
            <MessageReactions
              reactions={reactions}
              currentUserId={currentUserId}
              onAdd={handleReactionSelect}
              onRemove={onRemoveReaction}
            />
          )}
        </div>
      </div>
      
      {showMobileMenu && isMobile && (
        <MobileMessageMenu
          isMe={isMe}
          onReply={onReply}
          onCopy={handleCopy}
          onDelete={isMe ? onDelete : undefined}
          onReaction={() => setShowEmojiPicker(true)}
          onClose={() => setShowMobileMenu(false)}
        />
      )}
      
      {showEmojiPicker && (
        <EmojiPicker
          onSelect={handleReactionSelect}
          onClose={() => setShowEmojiPicker(false)}
        />
      )}
    </>
  )
}

// ===========================================
// MAIN COMPONENT
// ===========================================

export default function WhatsAppChat({
  messages,
  currentUserId,
  profiles,
  images,
  reactions,
  readStatuses,
  teamMemberIds,
  projectFiles,
  onSendMessage,
  onDeleteMessage,
  onAddReaction,
  onRemoveReaction,
  onMarkAsRead,
  onFileClick,
  onClose,
  updateContent,
  isMobile,
}: WhatsAppChatProps) {
  
  const [newMessage, setNewMessage] = useState('')
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null)
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([])
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showFilePicker, setShowFilePicker] = useState(false)
  const [viewingImage, setViewingImage] = useState<string | null>(null)
  const [userColorMap] = useState<{ [key: string]: string }>({})
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  useEffect(() => {
    const unreadIds = messages
      .filter(m => m.user_id !== currentUserId)
      .filter(m => !readStatuses.some(r => r.comment_id === m.id && r.user_id === currentUserId))
      .map(m => m.id)
    
    if (unreadIds.length > 0) onMarkAsRead(unreadIds)
  }, [messages, currentUserId, readStatuses, onMarkAsRead])
  
  const handleSend = () => {
    if (!newMessage.trim() && selectedImages.length === 0 && selectedFileIds.length === 0) return
    onSendMessage(newMessage.trim(), replyingTo?.id, selectedImages, selectedFileIds)
    setNewMessage('')
    setReplyingTo(null)
    setSelectedImages([])
    setImagePreviews([])
    setSelectedFileIds([])
  }
  
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setSelectedImages(prev => [...prev, ...files])
    setImagePreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))])
  }
  
  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }
  
  const toggleFileSelection = (file: any) => {
    if (selectedFileIds.includes(file.id)) {
      setSelectedFileIds(selectedFileIds.filter(id => id !== file.id))
    } else {
      setSelectedFileIds([...selectedFileIds, file.id])
    }
  }
  
  const handleReply = (message: ChatMessage) => {
    setReplyingTo(message)
    inputRef.current?.focus()
  }
  
  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji)
    setShowEmojiPicker(false)
    inputRef.current?.focus()
  }
  
  const findMessageById = (id: string) => messages.find(m => m.id === id)
  const getMessageReactions = (messageId: string) => reactions.filter(r => r.comment_id === messageId)
  const getMessageImages = (messageId: string) => images.filter(img => img.comment_id === messageId)
  
  const selectedFiles = selectedFileIds.map(id => projectFiles.find(f => f.id === id)).filter(Boolean)
  
  return (
    <>
      <style>{`
        @keyframes typing {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>
      
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: isMobile ? '#e5ddd5' : 'rgba(0,0,0,0.5)',
        backdropFilter: isMobile ? 'none' : 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}>
        <div style={{
          width: isMobile ? '100%' : '90%',
          maxWidth: isMobile ? '100%' : '500px',
          height: isMobile ? '100%' : '85vh',
          backgroundColor: '#e5ddd5',
          borderRadius: isMobile ? '0' : '16px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: isMobile ? 'none' : '0 10px 40px rgba(0,0,0,0.3)',
        }}>
          
          {/* Header */}
          <div style={{
            backgroundColor: '#075e54',
            color: 'white',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexShrink: 0,
          }}>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer', padding: '4px' }}>
              ←
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: '600', fontSize: '16px' }}>💬 דיון על ההערה</div>
              <div style={{ fontSize: '12px', opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {updateContent}
              </div>
            </div>
            <span style={{ fontSize: '12px', opacity: 0.7 }}>{messages.filter(m => !m.deleted_at).length}</span>
          </div>
          
          {/* Pinned Update Content */}
          <div style={{
            backgroundColor: '#dcf8c6',
            padding: '10px 16px',
            borderBottom: '1px solid #cce5c6',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: '16px' }}>📌</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '11px', color: '#075e54', fontWeight: '600', marginBottom: '2px' }}>הערה מקורית</div>
              <div style={{ fontSize: '14px', color: '#303030', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {updateContent}
              </div>
            </div>
          </div>
          
          {/* Messages */}
          <div style={{
            flex: 1,
            overflow: 'auto',
            padding: '16px',
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ccc' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundColor: '#e5ddd5',
          }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#667781' }}>
                <p style={{ fontSize: '40px', marginBottom: '12px' }}>💬</p>
                <p>אין הודעות עדיין</p>
                <p style={{ fontSize: '13px' }}>התחל את השיחה!</p>
              </div>
            ) : (
              messages.map((message, index) => {
                const prevMessage = index > 0 ? messages[index - 1] : undefined
                const isMe = message.user_id === currentUserId
                const userColor = getUserColor(message.user_id, userColorMap)
                const userName = profiles[message.user_id]?.full_name || 'משתמש'
                
                const replyToMsg = message.reply_to ? findMessageById(message.reply_to) : undefined
                const replyToColor = replyToMsg ? getUserColor(replyToMsg.user_id, userColorMap) : undefined
                const replyToName = replyToMsg ? profiles[replyToMsg.user_id]?.full_name : undefined
                
                return (
                  <div key={message.id}>
                    {shouldShowDateSeparator(message.created_at, prevMessage?.created_at) && (
                      <DateSeparator date={message.created_at} />
                    )}
                    <MessageBubble
                      message={message}
                      isMe={isMe}
                      userName={userName}
                      userColor={userColor}
                      replyToMessage={replyToMsg}
                      replyToUserName={replyToName}
                      replyToUserColor={replyToColor}
                      messageImages={getMessageImages(message.id)}
                      reactions={getMessageReactions(message.id)}
                      currentUserId={currentUserId}
                      isMobile={isMobile}
                      projectFiles={projectFiles}
                      onReply={() => handleReply(message)}
                      onDelete={() => onDeleteMessage(message.id)}
                      onAddReaction={(emoji) => onAddReaction(message.id, emoji)}
                      onRemoveReaction={(emoji) => onRemoveReaction(message.id, emoji)}
                      onImageClick={setViewingImage}
                      onFileClick={onFileClick}
                    />
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Reply Preview */}
          {replyingTo && (
            <div style={{
              backgroundColor: '#f0f2f5',
              padding: '10px 16px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexShrink: 0,
            }}>
              <div style={{
                flex: 1,
                borderRight: `4px solid ${getUserColor(replyingTo.user_id, userColorMap)}`,
                paddingRight: '10px',
                overflow: 'hidden',
              }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: getUserColor(replyingTo.user_id, userColorMap) }}>
                  {profiles[replyingTo.user_id]?.full_name || 'משתמש'}
                </div>
                <div style={{ fontSize: '13px', color: '#667781', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {replyingTo.content || '📷 תמונה'}
                </div>
              </div>
              <button onClick={() => setReplyingTo(null)} style={{ background: 'none', border: 'none', fontSize: '20px', color: '#667781', cursor: 'pointer' }}>
                ×
              </button>
            </div>
          )}
          
          {/* Selected Files Preview */}
          {selectedFiles.length > 0 && (
            <div style={{
              backgroundColor: '#f0f2f5',
              padding: '10px 16px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              flexShrink: 0,
            }}>
              {selectedFiles.map(file => (
                <div key={file.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 10px',
                  backgroundColor: '#dcf8c6',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '500',
                }}>
                  <span>{getFileIcon(file.file_type)}</span>
                  <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.file_name}</span>
                  <button
                    onClick={() => toggleFileSelection(file)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#667781' }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* Image Previews */}
          {imagePreviews.length > 0 && (
            <div style={{
              backgroundColor: '#f0f2f5',
              padding: '10px 16px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              flexShrink: 0,
            }}>
              {imagePreviews.map((preview, idx) => (
                <div key={idx} style={{ position: 'relative' }}>
                  <img src={preview} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }} />
                  <button
                    onClick={() => removeImage(idx)}
                    style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-6px',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: '2px solid white',
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* Input */}
          <div style={{
            backgroundColor: '#f0f2f5',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0,
          }}>
            <button onClick={() => setShowEmojiPicker(true)} style={{ backgroundColor: 'transparent', border: 'none', fontSize: '22px', cursor: 'pointer', padding: '8px', color: '#54656f' }}>
              😊
            </button>
            
            <button onClick={() => setShowFilePicker(true)} style={{ backgroundColor: 'transparent', border: 'none', fontSize: '22px', cursor: 'pointer', padding: '8px', color: selectedFileIds.length > 0 ? '#25D366' : '#54656f' }}>
              📎
            </button>
            
            <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" multiple style={{ display: 'none' }} />
            <button onClick={() => fileInputRef.current?.click()} style={{ backgroundColor: 'transparent', border: 'none', fontSize: '22px', cursor: 'pointer', padding: '8px', color: '#54656f' }}>
              📷
            </button>
            
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }}}
              placeholder="הקלד הודעה..."
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '24px',
                border: 'none',
                backgroundColor: 'white',
                fontSize: '15px',
                outline: 'none',
                minWidth: 0,
              }}
            />
            
            <button
              onClick={handleSend}
              disabled={!newMessage.trim() && selectedImages.length === 0 && selectedFileIds.length === 0}
              style={{
                backgroundColor: '#00a884',
                border: 'none',
                borderRadius: '50%',
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: (newMessage.trim() || selectedImages.length > 0 || selectedFileIds.length > 0) ? 'pointer' : 'not-allowed',
                opacity: (newMessage.trim() || selectedImages.length > 0 || selectedFileIds.length > 0) ? 1 : 0.5,
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: '20px', color: 'white' }}>➤</span>
            </button>
          </div>
        </div>
      </div>
      
      {showEmojiPicker && (
        <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmojiPicker(false)} />
      )}
      
      {showFilePicker && (
        <FilePicker
          files={projectFiles}
          selectedIds={selectedFileIds}
          onToggle={toggleFileSelection}
          onClose={() => setShowFilePicker(false)}
        />
      )}
      
      {viewingImage && (
        <div
          onClick={() => setViewingImage(null)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            cursor: 'pointer',
          }}
        >
          <img src={viewingImage} style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: '8px', objectFit: 'contain' }} />
        </div>
      )}
    </>
  )
}
