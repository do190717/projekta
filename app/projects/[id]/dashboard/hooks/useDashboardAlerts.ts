// ====================================
// 📦 DASHBOARD ALERTS HOOK
// ====================================
// לוגיקה לייצור התראות חכמות בדשבורד
// ====================================

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'

// ====================================
// 📘 TYPES
// ====================================

import type { Alert, DashboardStats, ProjectFile, Update } from '../types'

interface UseDashboardAlertsParams {
  projectId: string
  stats: DashboardStats
  recentFiles: ProjectFile[]
  recentUpdates: Update[]
}

// ====================================
// 🎨 HOOK
// ====================================

/**
 * מייצר רשימת התראות דינמית בהתאם למצב הפרויקט
 * 
 * @param projectId - מזהה הפרויקט
 * @param stats - סטטיסטיקות הפרויקט
 * @param recentFiles - קבצים אחרונים
 * @param recentUpdates - עדכונים אחרונים
 * @returns מערך התראות למשתמש
 * 
 * @example
 * const alerts = useDashboardAlerts({
 *   projectId: '123',
 *   stats,
 *   recentFiles,
 *   recentUpdates
 * })
 */
export function useDashboardAlerts({
  projectId,
  stats,
  recentFiles,
  recentUpdates,
}: UseDashboardAlertsParams): Alert[] {
  const router = useRouter()

  return useMemo(() => {
    const alerts: Alert[] = []

    // 🔴 התראה: יותר מדי עדכונים פתוחים
    if (stats.openUpdates > 5) {
      alerts.push({
        icon: '🔴',
        message: `יש ${stats.openUpdates} עדכונים פתוחים הממתינים לטיפול`,
        color: '#EF4444',
        action: 'עבור לעדכונים',
        onClick: () => router.push(`/projects/${projectId}/updates`),
      })
    }

    // 📁 התראה: קבצים חדשים היום
    if (recentFiles.length > 0) {
      const todayFiles = recentFiles.filter((f) => {
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
          onClick: () => router.push(`/projects/${projectId}/files`),
        })
      }
    }

    // ⚡ התראה: פעילות אחרונה
    if (recentUpdates.length > 0) {
      const recentActivity = recentUpdates.filter((u) => {
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
          onClick: () => router.push(`/projects/${projectId}/updates`),
        })
      }
    }

    return alerts
  }, [projectId, stats.openUpdates, recentFiles, recentUpdates, router])
}

// ====================================
// 🔧 HELPER FUNCTIONS
// ====================================

/**
 * בודק אם תאריך הוא היום
 */
function isToday(date: Date): boolean {
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

/**
 * בודק אם תאריך הוא בשעה האחרונה
 */
function isLastHour(date: Date): boolean {
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
  return date > hourAgo
}