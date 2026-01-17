'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { UPDATE_STATUSES } from '@/lib/constants'
import MobileSidebar from './components/MobileSidebar'

/**
 * Dashboard - גרסת מובייל
 * ממוטב למסכים קטנים עם כרטיסים אנכיים
 */
export default function DashboardMobile() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const supabase = createClient()

  const [project, setProject] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUpdates: 0,
    openUpdates: 0,
    teamMembers: 0,
    filesCount: 0,
  })
  const [recentUpdates, setRecentUpdates] = useState<any[]>([])
  const [recentFiles, setRecentFiles] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any>({})
  const [comments, setComments] = useState<{ [key: string]: any[] }>({})
  const [readStatuses, setReadStatuses] = useState<{ [key: string]: any[] }>({})

  useEffect(() => {
    loadDashboard()
  }, [projectId])

  async function loadDashboard() {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      setUser(currentUser)

      const { data: projectData } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()
      
      setProject(projectData)

      const { count: updatesCount } = await supabase
        .from('updates')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)

      const { count: openCount } = await supabase
        .from('updates')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .in('status', ['open', 'in_review', 'in_progress'])

      const { count: teamCount } = await supabase
        .from('project_members')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)

      const { count: filesCount } = await supabase
        .from('project_files')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)

      setStats({
        totalUpdates: updatesCount || 0,
        openUpdates: openCount || 0,
        teamMembers: (teamCount || 0) + 1,
        filesCount: filesCount || 0,
      })

      const { data: recentUpdatesData } = await supabase
        .from('updates')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(10)
      
      setRecentUpdates(recentUpdatesData || [])

      if (recentUpdatesData && recentUpdatesData.length > 0) {
        for (const update of recentUpdatesData) {
          const { data: commentsData } = await supabase
            .from('comments')
            .select('*')
            .eq('update_id', update.id)
          
          if (commentsData) {
            setComments((prev: any) => ({ ...prev, [update.id]: commentsData }))
            
            const commentIds = commentsData.map(c => c.id)
            if (commentIds.length > 0 && currentUser) {
              const { data: readData } = await supabase
                .from('comment_reads')
                .select('*')
                .in('comment_id', commentIds)
                .eq('user_id', currentUser.id)
              
              if (readData) {
                setReadStatuses((prev: any) => ({ ...prev, [update.id]: readData }))
              }
            }
          }
        }
      }

      const { data: recentFilesData } = await supabase
        .from('project_files')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(3)
      
      setRecentFiles(recentFilesData || [])

      if (recentUpdatesData && recentUpdatesData.length > 0) {
        const userIds = recentUpdatesData.map(u => u.user_id).filter(Boolean)
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds)
        
        if (profilesData) {
          const profilesMap: any = {}
          profilesData.forEach(p => { profilesMap[p.id] = p })
          setProfiles(profilesMap)
        }
      }

    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  function generateAlerts() {
    const alerts = []
    
    if (stats.openUpdates > 5) {
      alerts.push({
        icon: '🔴',
        message: `${stats.openUpdates} עדכונים פתוחים`,
        color: '#EF4444',
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
          message: `${todayFiles.length} קבצים חדשים היום`,
          color: '#10B981',
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
          message: `${recentActivity.length} עדכונים בשעה האחרונה`,
          color: '#F59E0B',
          onClick: () => router.push(`/projects/${projectId}/updates`)
        })
      }
    }
    
    return alerts
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
    return <div style={{ padding: '20px', textAlign: 'center' }}>פרויקט לא נמצא</div>
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f8fafc',
      fontFamily: 'Heebo, sans-serif',
      direction: 'rtl',
      paddingBottom: '80px',
    }}>

      {/* Mobile Sidebar */}
      <MobileSidebar projectName={project.name} currentPage="dashboard" />

      {/* Header - Mobile */}
      <div style={{ 
        padding: '16px',
        paddingRight: '64px', // Space for hamburger button
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <h1 style={{ 
          fontSize: '24px', 
          fontWeight: '700', 
          margin: '0 0 4px 0',
          color: '#1e293b',
        }}>
          👋 שלום!
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
          {project.name}
        </p>
      </div>

      {/* Content */}
      <div style={{ padding: '16px' }}>
        {/* Stats Cards - Mobile Grid */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <StatCardMobile
            icon="📋"
            title="עדכונים"
            value={stats.totalUpdates}
            subtitle={`${stats.openUpdates} פתוחים`}
            color="#3B82F6"
            onClick={() => router.push(`/projects/${projectId}/updates`)}
          />
          <StatCardMobile
            icon="👥"
            title="צוות"
            value={stats.teamMembers}
            subtitle="אנשים"
            color="#8B5CF6"
          />
          <StatCardMobile
            icon="📁"
            title="קבצים"
            value={stats.filesCount}
            subtitle="מסמכים"
            color="#10B981"
            onClick={() => router.push(`/projects/${projectId}/files`)}
          />
          <StatCardMobile
            icon="📊"
            title="תקציב"
            value="✓"
            subtitle="מעקב"
            color="#6366F1"
            onClick={() => router.push(`/projects/${projectId}/budget`)}
          />
        </div>

        {/* Quick Actions - Mobile */}
        <div style={{ 
          padding: '16px',
          backgroundColor: 'white',
          borderRadius: '12px',
          marginBottom: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: '600', 
            marginBottom: '12px',
            color: '#1e293b',
          }}>
            🔥 פעולות מהירות
          </h3>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: '8px',
          }}>
            <QuickActionButtonMobile
              label="➕ עדכון חדש"
              onClick={() => router.push(`/projects/${projectId}/updates`)}
            />
            <QuickActionButtonMobile
              label="📁 העלה קובץ"
              onClick={() => router.push(`/projects/${projectId}/files`)}
            />
            <QuickActionButtonMobile
              label="📊 צפה בתקציב"
              onClick={() => router.push(`/projects/${projectId}/budget`)}
            />
          </div>
        </div>

        {/* Alerts - Mobile */}
        {generateAlerts().length > 0 && (
          <div style={{ 
            padding: '16px',
            backgroundColor: 'white',
            borderRadius: '12px',
            marginBottom: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              marginBottom: '12px',
              color: '#1e293b',
            }}>
              📢 התראות
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {generateAlerts().map((alert, idx) => (
                <div 
                  key={idx} 
                  onClick={alert.onClick}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    borderRight: `4px solid ${alert.color}`,
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: '24px' }}>{alert.icon}</span>
                  <p style={{ 
                    margin: 0, 
                    fontSize: '13px', 
                    color: '#1e293b',
                    fontWeight: '500',
                    flex: 1,
                  }}>
                    {alert.message}
                  </p>
                  <span style={{ fontSize: '18px', color: '#94a3b8' }}>→</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity - Mobile */}
        {recentUpdates.length > 0 && (
          <div style={{ 
            padding: '16px',
            backgroundColor: 'white',
            borderRadius: '12px',
            marginBottom: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              marginBottom: '12px',
              color: '#1e293b',
            }}>
              📊 פעילות אחרונה
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentUpdates.slice(0, 5).map((update) => {
                const userName = profiles[update.user_id]?.full_name || 'משתמש'
                const timeAgo = getTimeAgo(update.created_at)
                const updateStatus = UPDATE_STATUSES[(update.status || 'open') as keyof typeof UPDATE_STATUSES] || UPDATE_STATUSES.open
                const isCompleted = update.status === 'completed' || update.status === 'verified'
                const updateComments: any[] = comments[update.id] || []
                const updateReadStatuses: any[] = readStatuses[update.id] || []
                
                const unreadComments = updateComments.filter((c: any) => {
                  if (c.deleted_at) return false
                  if (c.user_id === user?.id) return false
                  return !updateReadStatuses.some(r => r.comment_id === c.id)
                })
                
                const unreadCount = unreadComments.length
                
                return (
                  <div 
                    key={update.id} 
                    onClick={() => {
                      sessionStorage.setItem('highlightUpdateId', update.id)
                      router.push(`/projects/${projectId}/updates`)
                    }}
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
              })}
            </div>

            <button
              onClick={() => router.push(`/projects/${projectId}/updates`)}
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
              📋 כל העדכונים ({stats.totalUpdates})
            </button>
          </div>
        )}

        {/* Coming Soon - Mobile */}
        <div style={{
          padding: '24px',
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '2px dashed #6366F1',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <p style={{ fontSize: '40px', marginBottom: '12px' }}>🚀</p>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '700', 
            marginBottom: '8px',
            color: '#1e293b',
          }}>
            עוד פיצ'רים בדרך!
          </h3>
          <p style={{ color: '#64748b', fontSize: '13px', lineHeight: '1.6' }}>
            ניהול כוח אדם • לוחות זמנים • דוחות מתקדמים
          </p>
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
  if (diffMins < 60) return `${diffMins}ד'`
  if (diffHours < 24) return `${diffHours}ש'`
  if (diffDays === 1) return 'אתמול'
  if (diffDays < 7) return `${diffDays} ימים`
  return past.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })
}

// ===== Components =====

function StatCardMobile({ 
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
        padding: '16px',
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '2px solid #e5e7eb',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}
    >
      <div style={{ fontSize: '28px', marginBottom: '8px' }}>
        {icon}
      </div>
      <div style={{ fontSize: '22px', fontWeight: '700', color: color, marginBottom: '4px' }}>
        {value}
      </div>
      <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '2px', color: '#1e293b' }}>
        {title}
      </div>
      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
        {subtitle}
      </div>
    </div>
  )
}

function QuickActionButtonMobile({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        padding: '12px',
        backgroundColor: 'white',
        border: '2px solid #e5e7eb',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        fontFamily: 'Heebo, sans-serif',
        color: '#1e293b',
        textAlign: 'right',
      }}
    >
      {label}
    </button>
  )
}
