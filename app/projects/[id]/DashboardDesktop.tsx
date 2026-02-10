// ====================================
// 📦 DASHBOARD DESKTOP
// ====================================
// דשבורד ראשי - גרסת Desktop
// ====================================

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Sidebar from './components/Sidebar'
import {
  useProject,
  useDashboardStats,
  useRecentUpdates,
  useRecentFiles,
  useUpdateComments,
  useProfiles
} from '@/hooks/useQueries'

// Dashboard components
import { AlertsSection } from './dashboard/components/shared/AlertsSection'
import { QuickActions } from './dashboard/components/shared/QuickActions'
import { StatsCards } from './dashboard/components/desktop/StatsCards'
import { RecentActivity } from './dashboard/components/desktop/RecentActivity'

// Hooks
import { useDashboardAlerts } from './dashboard/hooks/useDashboardAlerts'
import { useDashboardFilters } from './dashboard/hooks/useDashboardFilters'

// ====================================
// 🎨 COMPONENT
// ====================================

export default function DashboardDesktop() {
  const params = useParams()
  const router = useRouter()
  if (!params?.id) {
  return <div>Invalid project ID</div>
}
const projectId = params.id as string

  // ====================================
  // 📊 Data Loading
  // ====================================

  const { data: project, isLoading: projectLoading } = useProject(projectId)
  const { data: stats = { totalUpdates: 0, openUpdates: 0, teamMembers: 0, filesCount: 0 }, isLoading: statsLoading } = useDashboardStats(projectId)
  const { data: recentUpdates = [], isLoading: updatesLoading } = useRecentUpdates(projectId, 20)
  const { data: recentFiles = [], isLoading: filesLoading } = useRecentFiles(projectId, 3)
  
  // Get user IDs and update IDs for nested queries
  const userIds = recentUpdates.map(u => u.user_id).filter(Boolean)
  const updateIds = recentUpdates.map(u => u.id)
  
  const { data: profiles = {} } = useProfiles(userIds)
  const { data: comments = {} } = useUpdateComments(updateIds)
  
  const loading = projectLoading || statsLoading || updatesLoading || filesLoading

  // ====================================
  // 🔹 Local State
  // ====================================

  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    (async () => {
      const { createClient } = await import('@/lib/supabase')
      const { data: { user: currentUser } } = await createClient().auth.getUser()
      setUser(currentUser)
    })()
  }, [])

  // ====================================
  // 🎯 Custom Hooks
  // ====================================

  // התראות
  const alerts = useDashboardAlerts({
    projectId,
    stats,
    recentFiles,
    recentUpdates,
  })

  // פילטרים
  const {
    activityLimit,
    activityTimeFilter,
    setActivityLimit,
    setActivityTimeFilter,
    getFilteredUpdates,
  } = useDashboardFilters()

  const filteredUpdates = getFilteredUpdates(recentUpdates)

  // ====================================
  // 🎨 Stats Configuration
  // ====================================

  const statsCards = [
    {
      icon: '📋',
      title: 'עדכונים',
      value: stats.totalUpdates,
      subtitle: `${stats.openUpdates} פתוחים`,
      color: '#3B82F6',
      onClick: () => router.push(`/projects/${projectId}/updates`),
    },
    {
      icon: '👥',
      title: 'חברי צוות',
      value: stats.teamMembers,
      subtitle: 'אנשים בפרויקט',
      color: '#8B5CF6',
    },
    {
      icon: '📁',
      title: 'קבצים',
      value: stats.filesCount,
      subtitle: 'מסמכים',
      color: '#10B981',
      onClick: () => router.push(`/projects/${projectId}/files`),
    },
    {
      icon: '💰',
      title: 'תזרים',
      value: 'בקרוב',
      subtitle: 'ממתין לפיתוח',
      color: '#F59E0B',
    },
  ]

  // ====================================
  // 🔥 Quick Actions Configuration
  // ====================================

  const quickActions = [
    {
      label: '➕ עדכון חדש',
      onClick: () => router.push(`/projects/${projectId}/updates`),
    },
    {
      label: '📁 העלה קובץ',
      onClick: () => router.push(`/projects/${projectId}/files`),
    },
    {
      label: '👥 נהל צוות',
      onClick: () => router.push(`/projects/${projectId}/updates`),
    },
  ]

  // ====================================
  // 🎬 Event Handlers
  // ====================================

  const handleUpdateClick = (updateId: string) => {
    sessionStorage.setItem('highlightUpdateId', updateId)
    router.push(`/projects/${projectId}/updates`)
  }

  const handleCommentClick = (updateId: string) => {
    sessionStorage.setItem('openChatForUpdateId', updateId)
    router.push(`/projects/${projectId}/updates`)
  }

  const handleViewAllClick = () => {
    router.push(`/projects/${projectId}/updates`)
  }

  // ====================================
  // 🔄 Loading State
  // ====================================

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

  // ====================================
  // 🎨 Render
  // ====================================

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
          
          {/* Header */}
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
          <StatsCards stats={statsCards} />

          {/* Quick Actions */}
          <QuickActions actions={quickActions} variant="desktop" />

          {/* Alerts Section */}
          <AlertsSection alerts={alerts} variant="desktop" />

          {/* Recent Activity */}
          <RecentActivity
            updates={filteredUpdates}
            profiles={profiles}
            comments={comments}
            currentUserId={user?.id}
            projectId={projectId}
            totalUpdates={stats.totalUpdates}
            activityLimit={activityLimit}
            activityTimeFilter={activityTimeFilter}
            onLimitChange={setActivityLimit}
            onTimeFilterChange={setActivityTimeFilter}
            onUpdateClick={handleUpdateClick}
            onCommentClick={handleCommentClick}
            onViewAllClick={handleViewAllClick}
          />

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
