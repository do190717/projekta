// ====================================
// 📦 RECENT ACTIVITY - MOBILE
// ====================================
// פעילות אחרונה - גרסת Mobile
// ====================================

import React from 'react'
import { UPDATE_STATUSES } from '@/lib/constants'
import { getTimeAgoShort } from '../../utils'

// ====================================
// 📘 TYPES
// ====================================

import type { Update, Profile, Comment, ProfilesMap, CommentsMap } from '../../types'

interface RecentActivityMobileProps {
  updates: Update[]
  profiles: ProfilesMap
  comments: CommentsMap
  currentUserId?: string
  totalUpdates: number
  onUpdateClick: (updateId: string) => void
  onViewAllClick: () => void
}

// ====================================
// 🎨 COMPONENT
// ====================================

/**
 * מציג רשימת עדכונים אחרונים (Mobile - מקוצר)
 * 
 * @param updates - מערך עדכונים (מוגבל ל-5)
 * @param profiles - מיפוי userId -> profile
 * @param comments - מיפוי updateId -> comments[]
 * @param currentUserId - ID של המשתמש הנוכחי
 * @param totalUpdates - סה"כ עדכונים בפרויקט
 * @param onUpdateClick - קולבק ללחיצה על עדכון
 * @param onViewAllClick - קולבק ל"ראה הכל"
 */
export function RecentActivityMobile({
  updates,
  profiles,
  comments,
  currentUserId,
  totalUpdates,
  onUpdateClick,
  onViewAllClick,
}: RecentActivityMobileProps) {
  if (updates.length === 0) return null

  return (
    <div style={{ 
      padding: '16px',
      backgroundColor: 'white',
      borderRadius: '12px',
      marginBottom: '16px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    }}>
      {/* Header */}
      <h3 style={{ 
        fontSize: '16px', 
        fontWeight: '600', 
        marginBottom: '12px',
        color: '#1e293b',
      }}>
        📊 פעילות אחרונה
      </h3>

      {/* Activity List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {updates.slice(0, 5).map((update) => (
          <UpdateCardMobile
            key={update.id}
            update={update}
            userName={profiles[update.user_id]?.full_name || 'משתמש'}
            updateComments={comments[update.id] || []}
            currentUserId={currentUserId}
            onUpdateClick={() => onUpdateClick(update.id)}
          />
        ))}
      </div>

      {/* View All Button */}
      <button
        onClick={onViewAllClick}
        style={{
          width: '100%',
          marginTop: '12px',
          padding: '12px',
          backgroundColor: '#6366F1',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          fontFamily: 'Heebo, sans-serif',
        }}
      >
        📋 כל העדכונים ({totalUpdates})
      </button>
    </div>
  )
}

// ====================================
// 🧩 SUB-COMPONENTS
// ====================================

interface UpdateCardMobileProps {
  update: Update
  userName: string
  updateComments: Comment[]
  currentUserId?: string
  onUpdateClick: () => void
}

function UpdateCardMobile({
  update,
  userName,
  updateComments,
  currentUserId,
  onUpdateClick,
}: UpdateCardMobileProps) {
  const timeAgo = getTimeAgoShort(update.created_at)
  const updateStatus = UPDATE_STATUSES[(update.status || 'open') as keyof typeof UPDATE_STATUSES] || UPDATE_STATUSES.open
  const isCompleted = update.status === 'completed' || update.status === 'verified'
  
  // חישוב תגובות שלא נקראו
  const unreadComments = updateComments.filter((c) => {
    if (c.deleted_at) return false
    if (c.user_id === currentUserId) return false
    return true
  })
  const unreadCount = unreadComments.length

  return (
    <div 
      onClick={onUpdateClick}
      style={{
        padding: '12px',
        borderRadius: '8px',
        backgroundColor: '#f8fafc',
        border: '1px solid #e5e7eb',
        cursor: 'pointer',
      }}
    >
      <div style={{ 
        display: 'flex', 
        alignItems: 'start', 
        gap: '10px',
        marginBottom: '8px',
      }}>
        <span style={{ fontSize: '20px' }}>
          {isCompleted ? '✅' : (updateStatus?.icon || '📝')}
        </span>
        
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            marginBottom: '4px',
            flexWrap: 'wrap',
          }}>
            <p style={{ 
              margin: 0, 
              fontSize: '13px', 
              color: '#1e293b',
              fontWeight: '600' 
            }}>
              {userName}
            </p>
            <span style={{
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: '600',
              backgroundColor: updateStatus.bgColor,
              color: updateStatus.color,
            }}>
              {updateStatus?.name || 'פתוח'}
            </span>
          </div>
          
          <p style={{ 
            margin: 0, 
            fontSize: '12px', 
            color: '#64748b',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textDecoration: isCompleted ? 'line-through' : 'none',
          }}>
            {update.content}
          </p>
        </div>
      </div>
      
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        alignItems: 'center',
        fontSize: '11px',
        color: '#94a3b8',
      }}>
        <span>🕐 {timeAgo}</span>
        {unreadCount > 0 && (
          <span style={{ 
            color: '#EF4444',
            fontWeight: '600',
            backgroundColor: '#FEE2E2',
            padding: '2px 6px',
            borderRadius: '4px',
          }}>
            💬 {unreadCount}
          </span>
        )}
      </div>
    </div>
  )
}