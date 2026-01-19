// ====================================
// 📦 DASHBOARD MOBILE
// ====================================
// דשבורד ראשי - גרסת Mobile
// ====================================

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import MobileSidebar from './components/MobileSidebar'
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
import { StatsCardsMobile } from './dashboard/components/mobile/StatsCardsMobile'
import { RecentActivityMobile } from './dashboard/components/mobile/RecentActivityMobile'

// Hooks
import { useDashboardAlerts } from './dashboard/hooks/useDashboardAlerts'

// ====================================
// 🎨 COMPONENT
// ====================================

export default function DashboardMobile() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  // ====================================
  // 📊 Data Loading
  // ====================================

  const { data: project, isLoading: projectLoading } = useProject(projectId)
  const { data: stats = { totalUpdates: 0, openUpdates: 0, teamMembers: 0, filesCount: 0 }, isLoading: statsLoading } = useDashboardStats(projectId)
  const { data: recentUpdates = [], isLoading: updatesLoading } = useRecentUpdates(projectId, 5)
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
      title: 'צוות',
      value: stats.teamMembers,
      subtitle: 'אנשים',
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
      subtitle: 'ממתין',
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
    <div style={{ 
      minHeight: '100vh', 
      paddingBottom: '80px',
      backgroundColor: '#f8fafc',
      fontFamily: 'Heebo, sans-serif',
      direction: 'rtl',
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

      <div style={{ padding: '16px' }}>
        
        {/* Stats Cards */}
        <StatsCardsMobile stats={statsCards} />

        {/* Quick Actions */}
        <QuickActions actions={quickActions} variant="mobile" />

        {/* Alerts Section */}
        <AlertsSection alerts={alerts} variant="mobile" />

        {/* Recent Activity */}
        <RecentActivityMobile
          updates={recentUpdates}
          profiles={profiles}
          comments={comments}
          currentUserId={user?.id}
          totalUpdates={stats.totalUpdates}
          onUpdateClick={handleUpdateClick}
          onViewAllClick={handleViewAllClick}
        />

        {/* Coming Soon */}
        <div style={{
          padding: '32px 16px',
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '2px dashed #6366F1',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <p style={{ fontSize: '48px', marginBottom: '12px' }}>🚀</p>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '700', 
            marginBottom: '8px',
            color: '#1e293b',
          }}>
            עוד פיצ'רים בדרך!
          </h3>
          <p style={{ color: '#64748b', fontSize: '13px', lineHeight: '1.6' }}>
            תזרים מזומנים • ניהול צוות • דוחות
          </p>
        </div>

      </div>
    </div>
  )
}