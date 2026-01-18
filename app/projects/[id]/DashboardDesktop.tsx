'use client'

import { useState, useMemo, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Sidebar from './components/Sidebar'
import { UPDATE_STATUSES } from '@/lib/constants'
import {
  useProject,
  useDashboardStats,
  useRecentUpdates,
  useRecentFiles,
  useUpdateComments,
  useProfiles
} from '@/hooks/useQueries'

export default function DashboardDesktop() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  // ✨ React Query hooks
  const { data: project, isLoading: projectLoading } = useProject(projectId)
  const { data: stats = { totalUpdates: 0, openUpdates: 0, teamMembers: 0, filesCount: 0 }, isLoading: statsLoading } = useDashboardStats(projectId)
  const { data: recentUpdates = [], isLoading: updatesLoading } = useRecentUpdates(projectId, 20)
  const { data: recentFiles = [], isLoading: filesLoading } = useRecentFiles(projectId, 3)
  
  // Get user IDs from updates
  const userIds = useMemo(() => 
    recentUpdates.map(u => u.user_id).filter(Boolean),
    [recentUpdates]
  )
  
  // Get update IDs
  const updateIds = useMemo(() => 
    recentUpdates.map(u => u.id),
    [recentUpdates]
  )
  
  // Load profiles and comments based on updates
  const { data: profiles = {} } = useProfiles(userIds)
  const { data: comments = {} } = useUpdateComments(updateIds)
  
  // Local UI state
  const [activityLimit, setActivityLimit] = useState(5)
  const [activityTimeFilter, setActivityTimeFilter] = useState<'today' | '3days' | 'week' | 'all'>('all')
  
  const loading = projectLoading || statsLoading || updatesLoading || filesLoading

 const [user, setUser] = useState<any>(null)

  useEffect(() => {
    (async () => {
      const { createClient } = await import('@/lib/supabase')
      const { data: { user: currentUser } } = await createClient().auth.getUser()
      setUser(currentUser)
    })()
  }, [])

  function generateAlerts() {
    const alerts = []
    
    if (stats.openUpdates > 5) {
      alerts.push({
        icon: '🔴',
        message: `יש ${stats.openUpdates} עדכונים פתוחים הממתינים לטיפול`,
        color: '#EF4444',
        action: 'עבור לעדכונים',
        onClick: () => router.push(`/projects/${projectId}/updates`)
      })
    }
    
    if (recentFiles.length > 0) {
      const todayFiles = recentFiles.filter(f => {
        const fileDate = new Date(f.created_at)
        const today = new Date()
        return fileDate.toDateString() === today.toDateString()
      })
      
      if (todayFiles.length > 0) {
        alerts.push({
          icon: '📁',
          message: `${todayFiles.length} קבצים חדשים הועלו היום`,
          color: '#10B981',
          action: 'צפה בקבצים',
          onClick: () => router.push(`/projects/${projectId}/files`)
        })
      }
    }
    
    if (recentUpdates.length > 0) {
      const recentActivity = recentUpdates.filter(u => {
        const updateDate = new Date(u.created_at)
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
        return updateDate > hourAgo
      })
      
      if (recentActivity.length > 0) {
        alerts.push({
          icon: '⚡',
          message: `${recentActivity.length} עדכונים חדשים בשעה האחרונה`,
          color: '#F59E0B',
          action: 'ראה מה חדש',
          onClick: () => router.push(`/projects/${projectId}/updates`)
        })
      }
    }
    
    return alerts
  }

  // סינון עדכונים לפי זמן
  function getFilteredUpdates() {
    let filtered = [...recentUpdates]
    
    const now = new Date()
    
    if (activityTimeFilter === 'today') {
      filtered = filtered.filter(u => {
        const updateDate = new Date(u.created_at)
        return updateDate.toDateString() === now.toDateString()
      })
    } else if (activityTimeFilter === '3days') {
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
      filtered = filtered.filter(u => new Date(u.created_at) > threeDaysAgo)
    } else if (activityTimeFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      filtered = filtered.filter(u => new Date(u.created_at) > weekAgo)
    }
    
    return filtered.slice(0, activityLimit)
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        fontFamily: 'Heebo, sans-serif'
      }}>
        <p>טוען...</p>
      </div>
    )
  }

  if (!project) {
    return <div>פרויקט לא נמצא</div>
  }

  const filteredUpdates = getFilteredUpdates()

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar projectName={project.name} />

      <div style={{ 
        marginRight: '260px',
        flex: 1,
        padding: '32px',
        backgroundColor: '#f8fafc',
        fontFamily: 'Heebo, sans-serif',
        direction: 'rtl',
        display: 'flex',
        justifyContent: 'center',
      }}>
        <div style={{ 
          width: '100%', 
          maxWidth: '1200px'
        }}>
          
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ 
              fontSize: '32px', 
              fontWeight: '700', 
              marginBottom: '8px',
              color: '#1e293b',
            }}>
              👋 שלום!
            </h1>
            <p style={{ color: '#64748b', fontSize: '16px' }}>
              ברוך הבא לדשבורד של {project.name}
            </p>
          </div>

          {/* Stats Cards */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '20px',
            marginBottom: '32px'
          }}>
            <StatCard
              icon="📋"
              title="עדכונים"
              value={stats.totalUpdates}
              subtitle={`${stats.openUpdates} פתוחים`}
              color="#3B82F6"
              onClick={() => router.push(`/projects/${projectId}/updates`)}
            />
            <StatCard
              icon="👥"
              title="חברי צוות"
              value={stats.teamMembers}
              subtitle="אנשים בפרויקט"
              color="#8B5CF6"
            />
            <StatCard
              icon="📁"
              title="קבצים"
              value={stats.filesCount}
              subtitle="מסמכים"
              color="#10B981"
              onClick={() => router.push(`/projects/${projectId}/files`)}
            />
            <StatCard
              icon="💰"
              title="תזרים"
              value="בקרוב"
              subtitle="ממתין לפיתוח"
              color="#F59E0B"
            />
          </div>

          {/* Quick Actions */}
          <div style={{ 
            padding: '28px',
            backgroundColor: 'white',
            borderRadius: '16px',
            marginBottom: '32px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              marginBottom: '20px',
              color: '#1e293b',
            }}>
              🔥 פעולות מהירות
            </h3>
            <div style={{ 
              display: 'flex', 
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <QuickActionButton
                label="➕ עדכון חדש"
                onClick={() => router.push(`/projects/${projectId}/updates`)}
              />
              <QuickActionButton
                label="📁 העלה קובץ"
                onClick={() => router.push(`/projects/${projectId}/files`)}
              />
              <QuickActionButton
                label="👥 נהל צוות"
                onClick={() => router.push(`/projects/${projectId}/updates`)}
              />
            </div>
          </div>

          {/* Alerts Section */}
          {generateAlerts().length > 0 && (
            <div style={{ 
              padding: '28px',
              backgroundColor: 'white',
              borderRadius: '16px',
              marginBottom: '32px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                marginBottom: '20px',
                color: '#1e293b',
              }}>
                📢 התראות חשובות
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {generateAlerts().map((alert, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '12px',
                    borderRight: `4px solid ${alert.color}`,
                  }}>
                    <span style={{ fontSize: '28px' }}>{alert.icon}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ 
                        margin: 0, 
                        fontSize: '14px', 
                        color: '#1e293b',
                        fontWeight: '500' 
                      }}>
                        {alert.message}
                      </p>
                    </div>
                    <button
                      onClick={alert.onClick}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: alert.color,
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        fontFamily: 'Heebo, sans-serif',
                      }}
                    >
                      {alert.action}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Activity - UPGRADED */}
          {recentUpdates.length > 0 && (
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
                    onChange={(e) => setActivityTimeFilter(e.target.value as any)}
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
                    onChange={(e) => setActivityLimit(Number(e.target.value))}
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
                {filteredUpdates.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px', 
                    color: '#94a3b8' 
                  }}>
                    <p style={{ fontSize: '48px', margin: '0 0 12px 0' }}>📭</p>
                    <p style={{ margin: 0, fontSize: '14px' }}>אין פעילות בטווח זמן זה</p>
                  </div>
                ) : (
                  filteredUpdates.map((update) => {
                    const userName = profiles[update.user_id]?.full_name || 'משתמש'
                    const timeAgo = getTimeAgo(update.created_at)
                    const updateStatus = UPDATE_STATUSES[(update.status || 'open') as keyof typeof UPDATE_STATUSES] || UPDATE_STATUSES.open
                    const isCompleted = update.status === 'completed' || update.status === 'verified'
                    const updateComments: any[] = comments[update.id] || []
                    const updateReadStatuses: any[] = []
                    
                    // תגובות שלא נקראו = תגובות שאין להן read status של המשתמש הנוכחי
                    const unreadComments = updateComments.filter((c: any) => {
                      if (c.deleted_at) return false
                      if (c.user_id === user?.id) return false // תגובות שלי לא נחשבות
                      return !updateReadStatuses.some(r => r.comment_id === c.id)
                    })
                    
                    const unreadCount = unreadComments.length
                    
                    return (
                      <div key={update.id} style={{
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
                      onClick={() => {
                        sessionStorage.setItem('highlightUpdateId', update.id)
                        router.push(`/projects/${projectId}/updates`)
                      }}
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
                                  sessionStorage.setItem('openChatForUpdateId', update.id)
                                  router.push(`/projects/${projectId}/updates`)
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
                  })
                )}
              </div>

              {/* View All Button */}
              {filteredUpdates.length > 0 && (
                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                  <button
                    onClick={() => router.push(`/projects/${projectId}/updates`)}
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
                    📋 ראה את כל העדכונים ({stats.totalUpdates})
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Coming Soon */}
          <div style={{
            padding: '40px',
            backgroundColor: 'white',
            borderRadius: '16px',
            border: '2px dashed #6366F1',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <p style={{ fontSize: '56px', marginBottom: '16px' }}>🚀</p>
            <h3 style={{ 
              fontSize: '22px', 
              fontWeight: '700', 
              marginBottom: '12px',
              color: '#1e293b',
            }}>
              עוד פיצ'רים בדרך!
            </h3>
            <p style={{ color: '#64748b', fontSize: '15px', lineHeight: '1.6' }}>
              תזרים מזומנים • ניהול כוח אדם • לוחות זמנים • בקרת איכות • דוחות מתקדמים
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}

// ===== Helper Functions =====

function getTimeAgo(date: string) {
  const now = new Date()
  const past = new Date(date)
  const diffMs = now.getTime() - past.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) return 'עכשיו'
  if (diffMins < 60) return `לפני ${diffMins} דקות`
  if (diffHours < 24) return `לפני ${diffHours} שעות`
  if (diffDays === 1) return 'אתמול'
  if (diffDays < 7) return `לפני ${diffDays} ימים`
  return past.toLocaleDateString('he-IL')
}

// ===== Components =====

function StatCard({ 
  icon, 
  title, 
  value, 
  subtitle, 
  color,
  onClick 
}: { 
  icon: string
  title: string
  value: string | number
  subtitle: string
  color: string
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '24px',
        backgroundColor: 'white',
        borderRadius: '16px',
        border: '2px solid #e5e7eb',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = color
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = '#e5e7eb'
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
        }
      }}
    >
      <div style={{ fontSize: '36px', marginBottom: '16px' }}>
        {icon}
      </div>
      <div style={{ fontSize: '28px', fontWeight: '700', color: color, marginBottom: '8px' }}>
        {value}
      </div>
      <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px', color: '#1e293b' }}>
        {title}
      </div>
      <div style={{ fontSize: '13px', color: '#94a3b8' }}>
        {subtitle}
      </div>
    </div>
  )
}

function QuickActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '14px 24px',
        backgroundColor: 'white',
        border: '2px solid #e5e7eb',
        borderRadius: '10px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        fontFamily: 'Heebo, sans-serif',
        color: '#1e293b',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#6366F1'
        e.currentTarget.style.backgroundColor = '#EFF6FF'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#e5e7eb'
        e.currentTarget.style.backgroundColor = 'white'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {label}
    </button>
  )
}
