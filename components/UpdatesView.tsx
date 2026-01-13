'use client'

import { useState, useMemo } from 'react'
import { theme } from '@/lib/design-system'
import { 
  UPDATE_STATUSES, 
  WORK_TYPES, 
  CATEGORIES,
  type UpdateStatusId,
  type WorkTypeId 
} from '@/lib/constants'
import UpdateCard from './UpdateCard'

// ===========================================
// Types
// ===========================================

interface Update {
  id: string
  content: string
  category: string
  status: UpdateStatusId
  work_type: WorkTypeId
  user_id: string
  created_at: string
  tagged_files?: string[]
  ai_analysis?: {
    suggested_category?: string
    suggested_work_type?: string
    suggested_assignees?: string[]
    summary?: string
  }
}

interface UpdatesViewProps {
  updates: Update[]
  profiles: { [key: string]: { full_name: string; role?: string } }
  currentUserId: string
  currentUserRole: string
  projectFiles?: any[]
  commentsCounts?: { [updateId: string]: number }
  imagesCounts?: { [updateId: string]: number }
  onStatusChange: (updateId: string, newStatus: UpdateStatusId) => void
  onWorkTypeChange: (updateId: string, newWorkType: WorkTypeId) => void
  onDispute: (updateId: string, reason: string) => void
  onOpenChat: (updateId: string, content: string) => void
  onFileClick: (file: any) => void
  onDelete: (updateId: string) => void
  onAddUpdate: () => void
  isMobile: boolean
}

// ===========================================
// Filter Chip Component
// ===========================================

function FilterChip({ 
  label, 
  icon, 
  count, 
  isActive, 
  color,
  onClick 
}: { 
  label: string
  icon: string
  count?: number
  isActive: boolean
  color?: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 14px',
        borderRadius: '20px',
        fontSize: '13px',
        fontWeight: isActive ? 600 : 500,
        backgroundColor: isActive ? (color || theme.colors.primary[500]) : theme.colors.gray[100],
        color: isActive ? 'white' : theme.colors.text.secondary,
        border: isActive ? 'none' : `1px solid ${theme.colors.border.light}`,
        cursor: 'pointer',
        transition: `all ${theme.transitions.fast}`,
        fontFamily: theme.typography.fontFamily.sans,
        whiteSpace: 'nowrap',
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span style={{
          backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : theme.colors.gray[200],
          padding: '2px 8px',
          borderRadius: '10px',
          fontSize: '11px',
          fontWeight: 600,
        }}>
          {count}
        </span>
      )}
    </button>
  )
}

// ===========================================
// Stats Card Component
// ===========================================

function StatsCard({ 
  title, 
  count, 
  icon, 
  color, 
  bgColor,
  onClick,
  isActive,
}: { 
  title: string
  count: number
  icon: string
  color: string
  bgColor: string
  onClick?: () => void
  isActive?: boolean
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '16px 20px',
        backgroundColor: isActive ? bgColor : 'white',
        borderRadius: theme.borderRadius.xl,
        border: `2px solid ${isActive ? color : theme.colors.border.light}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: `all ${theme.transitions.fast}`,
        fontFamily: theme.typography.fontFamily.sans,
        textAlign: 'right',
        flex: 1,
        minWidth: '140px',
      }}
    >
      <span style={{
        width: '44px',
        height: '44px',
        borderRadius: '12px',
        backgroundColor: bgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px',
      }}>
        {icon}
      </span>
      <div>
        <div style={{
          fontSize: '24px',
          fontWeight: 700,
          color: color,
          lineHeight: 1,
        }}>
          {count}
        </div>
        <div style={{
          fontSize: '13px',
          color: theme.colors.text.secondary,
          marginTop: '4px',
        }}>
          {title}
        </div>
      </div>
    </button>
  )
}

// ===========================================
// Empty State Component
// ===========================================

function EmptyState({ filterActive }: { filterActive: boolean }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '60px 20px',
      animation: 'fadeIn 0.3s ease-out',
    }}>
      <div style={{
        fontSize: '64px',
        marginBottom: '16px',
        opacity: 0.8,
      }}>
        {filterActive ? '🔍' : '📋'}
      </div>
      <h3 style={{
        fontSize: '18px',
        fontWeight: 600,
        color: theme.colors.text.primary,
        marginBottom: '8px',
      }}>
        {filterActive ? 'לא נמצאו עדכונים' : 'אין עדכונים עדיין'}
      </h3>
      <p style={{
        fontSize: '14px',
        color: theme.colors.text.tertiary,
        maxWidth: '300px',
        margin: '0 auto',
      }}>
        {filterActive 
          ? 'נסה לשנות את הפילטרים לחיפוש רחב יותר'
          : 'התחל להוסיף עדכונים לפרויקט כדי לעקוב אחרי ההתקדמות'
        }
      </p>
    </div>
  )
}

// ===========================================
// Main Component
// ===========================================

export default function UpdatesView({
  updates,
  profiles,
  currentUserId,
  currentUserRole,
  projectFiles = [],
  commentsCounts = {},
  imagesCounts = {},
  onStatusChange,
  onWorkTypeChange,
  onDispute,
  onOpenChat,
  onFileClick,
  onDelete,
  onAddUpdate,
  isMobile,
}: UpdatesViewProps) {
  // Filters state
  const [statusFilter, setStatusFilter] = useState<UpdateStatusId | 'all'>('all')
  const [workTypeFilter, setWorkTypeFilter] = useState<WorkTypeId | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Calculate stats
  const stats = useMemo(() => {
    const result = {
      total: updates.length,
      open: 0,
      inProgress: 0,
      completed: 0,
      disputed: 0,
      byStatus: {} as { [key: string]: number },
      byWorkType: {} as { [key: string]: number },
    }

    updates.forEach(update => {
      // By status
      result.byStatus[update.status] = (result.byStatus[update.status] || 0) + 1
      
      // By work type
      result.byWorkType[update.work_type] = (result.byWorkType[update.work_type] || 0) + 1

      // Quick stats
      if (['open', 'in_review'].includes(update.status)) result.open++
      if (['in_progress', 'approved'].includes(update.status)) result.inProgress++
      if (['completed', 'verified'].includes(update.status)) result.completed++
      if (update.status === 'disputed') result.disputed++
    })

    return result
  }, [updates])

  // Filter updates
  const filteredUpdates = useMemo(() => {
    return updates.filter(update => {
      // Status filter
      if (statusFilter !== 'all' && update.status !== statusFilter) return false
      
      // Work type filter
      if (workTypeFilter !== 'all' && update.work_type !== workTypeFilter) return false
      
      // Category filter
      if (categoryFilter !== 'all' && update.category !== categoryFilter) return false
      
      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const content = update.content.toLowerCase()
        const userName = profiles[update.user_id]?.full_name?.toLowerCase() || ''
        if (!content.includes(query) && !userName.includes(query)) return false
      }

      return true
    })
  }, [updates, statusFilter, workTypeFilter, categoryFilter, searchQuery, profiles])

  const hasActiveFilters = statusFilter !== 'all' || workTypeFilter !== 'all' || categoryFilter !== 'all' || searchQuery

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '24px',
      animation: 'fadeIn 0.3s ease-out',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: theme.colors.text.primary,
            margin: 0,
          }}>
            עדכוני פרויקט
          </h2>
          <p style={{
            fontSize: '14px',
            color: theme.colors.text.tertiary,
            marginTop: '4px',
          }}>
            {stats.total} עדכונים סה"כ
          </p>
        </div>
        
        <button
          onClick={onAddUpdate}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            background: `linear-gradient(135deg, ${theme.colors.primary[500]} 0%, ${theme.colors.primary[600]} 100%)`,
            border: 'none',
            borderRadius: theme.borderRadius.lg,
            color: 'white',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: theme.typography.fontFamily.sans,
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
            transition: `all ${theme.transitions.fast}`,
          }}
        >
          <span>➕</span>
          <span>עדכון חדש</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'flex',
        gap: '12px',
        overflowX: 'auto',
        paddingBottom: '8px',
      }}>
        <StatsCard
          title="פתוחים"
          count={stats.open}
          icon="🔴"
          color={theme.colors.error.main}
          bgColor={theme.colors.error.light}
          onClick={() => setStatusFilter(statusFilter === 'open' ? 'all' : 'open')}
          isActive={statusFilter === 'open'}
        />
        <StatsCard
          title="בעבודה"
          count={stats.inProgress}
          icon="🔵"
          color={theme.colors.info.main}
          bgColor={theme.colors.info.light}
          onClick={() => setStatusFilter(statusFilter === 'in_progress' ? 'all' : 'in_progress')}
          isActive={statusFilter === 'in_progress'}
        />
        <StatsCard
          title="הושלמו"
          count={stats.completed}
          icon="✅"
          color={theme.colors.success.main}
          bgColor={theme.colors.success.light}
          onClick={() => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')}
          isActive={statusFilter === 'completed'}
        />
        {stats.disputed > 0 && (
          <StatsCard
            title="השגות"
            count={stats.disputed}
            icon="⚠️"
            color={theme.colors.warning.main}
            bgColor={theme.colors.warning.light}
            onClick={() => setStatusFilter(statusFilter === 'disputed' ? 'all' : 'disputed')}
            isActive={statusFilter === 'disputed'}
          />
        )}
      </div>

      {/* Search & Filters */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '16px',
        backgroundColor: 'white',
        borderRadius: theme.borderRadius.xl,
        border: `1px solid ${theme.colors.border.light}`,
      }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute',
            right: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '18px',
            opacity: 0.5,
          }}>
            🔍
          </span>
          <input
            type="text"
            placeholder="חיפוש בעדכונים..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px 12px 44px',
              backgroundColor: theme.colors.gray[50],
              border: `1.5px solid ${theme.colors.border.light}`,
              borderRadius: theme.borderRadius.lg,
              fontSize: '14px',
              fontFamily: theme.typography.fontFamily.sans,
              outline: 'none',
              transition: `all ${theme.transitions.fast}`,
            }}
          />
        </div>

        {/* Filter Chips */}
        <div style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
        }}>
          {/* Work Type Filters */}
          <FilterChip
            label="הכל"
            icon="📋"
            isActive={workTypeFilter === 'all'}
            onClick={() => setWorkTypeFilter('all')}
          />
          {Object.entries(WORK_TYPES).map(([key, value]) => (
            <FilterChip
              key={key}
              label={value.name}
              icon={value.icon}
              count={stats.byWorkType[key]}
              isActive={workTypeFilter === key}
              color={value.color}
              onClick={() => setWorkTypeFilter(workTypeFilter === key ? 'all' : key as WorkTypeId)}
            />
          ))}
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={() => {
              setStatusFilter('all')
              setWorkTypeFilter('all')
              setCategoryFilter('all')
              setSearchQuery('')
            }}
            style={{
              alignSelf: 'flex-start',
              padding: '8px 14px',
              backgroundColor: 'transparent',
              border: 'none',
              color: theme.colors.primary[500],
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: theme.typography.fontFamily.sans,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>✕</span>
            <span>נקה פילטרים</span>
          </button>
        )}
      </div>

      {/* Updates List */}
      {filteredUpdates.length === 0 ? (
        <EmptyState filterActive={hasActiveFilters !== ''} />
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          {filteredUpdates.map((update, index) => (
            <div 
              key={update.id}
              style={{
                animation: `fadeInUp 0.3s ease-out ${index * 0.05}s both`,
              }}
            >
              <UpdateCard
                update={update}
                userName={profiles[update.user_id]?.full_name || 'משתמש'}
                userRole={currentUserRole}
                currentUserId={currentUserId}
                projectFiles={projectFiles}
                commentsCount={commentsCounts[update.id] || 0}
                imagesCount={imagesCounts[update.id] || 0}
                onStatusChange={onStatusChange}
                onWorkTypeChange={onWorkTypeChange}
                onDispute={onDispute}
                onOpenChat={onOpenChat}
                onFileClick={onFileClick}
                onDelete={onDelete}
                isMobile={isMobile}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
