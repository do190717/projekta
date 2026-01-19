// ====================================
// 📦 RECENT ACTIVITY - DESKTOP
// ====================================
// פעילות אחרונה - גרסת Desktop
// ====================================

import React from 'react'
import { UPDATE_STATUSES } from '@/lib/constants'
import { getTimeAgo } from '../../utils'

// ====================================
// 📘 TYPES
// ====================================

import type { Update, Profile, Comment, ProfilesMap, CommentsMap, TimeFilter } from '../../types'

interface RecentActivityProps {
  updates: Update[]
  profiles: ProfilesMap
  comments: CommentsMap
  currentUserId?: string
  projectId: string
  totalUpdates: number
  activityLimit: number
  activityTimeFilter: TimeFilter
  onLimitChange: (limit: number) => void
  onTimeFilterChange: (filter: TimeFilter) => void
  onUpdateClick: (updateId: string) => void
  onCommentClick: (updateId: string) => void
  onViewAllClick: () => void
}

// ====================================
// 🎨 COMPONENT
// ====================================

/**
 * מציג רשימת עדכונים אחרונים עם פילטרים
 * 
 * @param updates - מערך עדכונים מסוננים
 * @param profiles - מיפוי userId -> profile
 * @param comments - מיפוי updateId -> comments[]
 * @param currentUserId - ID של המשתמש הנוכחי
 * @param projectId - ID הפרויקט
 * @param totalUpdates - סה"כ עדכונים בפרויקט
 * @param activityLimit - כמות עדכונים להצגה
 * @param activityTimeFilter - פילטר זמן
 * @param onLimitChange - קולבק לשינוי limit
 * @param onTimeFilterChange - קולבק לשינוי פילטר זמן
 * @param onUpdateClick - קולבק ללחיצה על עדכון
 * @param onCommentClick - קולבק ללחיצה על כפתור תגובה
 * @param onViewAllClick - קולבק ל"ראה הכל"
 */
export function RecentActivity({
  updates,
  profiles,
  comments,
  currentUserId,
  projectId,
  totalUpdates,
  activityLimit,
  activityTimeFilter,
  onLimitChange,
  onTimeFilterChange,
  onUpdateClick,
  onCommentClick,
  onViewAllClick,
}: RecentActivityProps) {
  if (updates.length === 0) return null

  return (
    <div style={{ 
      padding: '28px',
      backgroundColor: 'white',
      borderRadius: '16px',
      marginBottom: '32px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    }}>
      {/* Header with filters */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          margin: 0,
          color: '#1e293b',
        }}>
          📊 פעילות אחרונה
        </h3>
        
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {/* Time Filter */}
          <select 
            value={activityTimeFilter}
            onChange={(e) => onTimeFilterChange(e.target.value as any)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '2px solid #e5e7eb',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              fontFamily: 'Heebo, sans-serif',
              backgroundColor: 'white',
            }}
          >
            <option value="all">הכל</option>
            <option value="today">היום</option>
            <option value="3days">3 ימים אחרונים</option>
            <option value="week">שבוע אחרון</option>
          </select>
          
          {/* Limit Filter */}
          <select 
            value={activityLimit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '2px solid #e5e7eb',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              fontFamily: 'Heebo, sans-serif',
              backgroundColor: 'white',
            }}
          >
            <option value={5}>הצג 5</option>
            <option value={10}>הצג 10</option>
            <option value={20}>הצג 20</option>
          </select>
        </div>
      </div>

      {/* Activity List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {updates.length === 0 ? (
          <EmptyState />
        ) : (
          updates.map((update) => (
            <UpdateCard
              key={update.id}
              update={update}
              userName={profiles[update.user_id]?.full_name || 'משתמש'}
              updateComments={comments[update.id] || []}
              currentUserId={currentUserId}
              onUpdateClick={() => onUpdateClick(update.id)}
              onCommentClick={() => onCommentClick(update.id)}
            />
          ))
        )}
      </div>

      {/* View All Button */}
      {updates.length > 0 && (
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <button
            onClick={onViewAllClick}
            style={{
              padding: '12px 24px',
              backgroundColor: '#6366F1',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              fontFamily: 'Heebo, sans-serif',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#4F46E5'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#6366F1'
            }}
          >
            📋 ראה את כל העדכונים ({totalUpdates})
          </button>
        </div>
      )}
    </div>
  )
}

// ====================================
// 🧩 SUB-COMPONENTS
// ====================================

function EmptyState() {
  return (
    <div style={{ 
      textAlign: 'center', 
      padding: '40px', 
      color: '#94a3b8' 
    }}>
      <p style={{ fontSize: '48px', margin: '0 0 12px 0' }}>📭</p>
      <p style={{ margin: 0, fontSize: '14px' }}>אין פעילות בטווח זמן זה</p>
    </div>
  )
}

interface UpdateCardProps {
  update: Update
  userName: string
  updateComments: Comment[]
  currentUserId?: string
  onUpdateClick: () => void
  onCommentClick: () => void
}

function UpdateCard({
  update,
  userName,
  updateComments,
  currentUserId,
  onUpdateClick,
  onCommentClick,
}: UpdateCardProps) {
  const timeAgo = getTimeAgo(update.created_at)
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
      style={{
        display: 'flex',
        alignItems: 'start',
        gap: '12px',
        padding: '14px',
        borderRadius: '12px',
        backgroundColor: '#f8fafc',
        border: '1px solid #e5e7eb',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
      }}
      onClick={onUpdateClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#f1f5f9'
        e.currentTarget.style.borderColor = '#6366F1'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#f8fafc'
        e.currentTarget.style.borderColor = '#e5e7eb'
      }}
    >
      <span style={{ fontSize: '24px' }}>
        {isCompleted ? '✅' : (updateStatus?.icon || '📝')}
      </span>
      
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          marginBottom: '6px',
          flexWrap: 'wrap',
        }}>
          <p style={{ 
            margin: 0, 
            fontSize: '14px', 
            color: '#1e293b',
            fontWeight: '600' 
          }}>
            {userName} הוסיף עדכון
          </p>
          <span style={{
            padding: '2px 8px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: '600',
            backgroundColor: updateStatus.bgColor,
            color: updateStatus.color,
          }}>
            {updateStatus?.name || 'פתוח'}
          </span>
        </div>
        
        <p style={{ 
          margin: '0 0 8px 0', 
          fontSize: '13px', 
          color: '#64748b',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          textDecoration: isCompleted ? 'line-through' : 'none',
        }}>
          {update.content}
        </p>
        
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          alignItems: 'center',
          flexWrap: 'wrap',
        }}>
          <span style={{ 
            fontSize: '12px', 
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            🕐 {timeAgo}
          </span>
          
          {/* Unread Comments count */}
          {unreadCount > 0 && (
            <span style={{ 
              fontSize: '12px', 
              color: '#EF4444',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: '#FEE2E2',
              padding: '2px 8px',
              borderRadius: '6px',
            }}>
              💬 {unreadCount} חדש{unreadCount > 1 ? 'ות' : 'ה'}
            </span>
          )}
          
          {/* Quick Action - Chat */}
          <div style={{ 
            display: 'flex', 
            gap: '6px',
            marginRight: 'auto',
          }}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onCommentClick()
              }}
              style={{
                padding: '4px 10px',
                backgroundColor: '#EFF6FF',
                color: '#3B82F6',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                fontFamily: 'Heebo, sans-serif',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="תגובה מהירה"
            >
              💬 תגובה
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}