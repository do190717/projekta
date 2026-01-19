// ====================================
// 📦 DASHBOARD FILTERS HOOK
// ====================================
// ניהול פילטרים של פעילות אחרונה
// ====================================

import { useState, useMemo } from 'react'

// ====================================
// 📘 TYPES
// ====================================

import type { TimeFilter, Update } from '../types'

export interface UseDashboardFiltersReturn {
  // State
  activityLimit: number
  activityTimeFilter: TimeFilter
  
  // Setters
  setActivityLimit: (limit: number) => void
  setActivityTimeFilter: (filter: TimeFilter) => void
  
  // Filtered data
  getFilteredUpdates: (updates: Update[]) => Update[]
}

// ====================================
// 🎨 HOOK
// ====================================

/**
 * מנהל פילטרים עבור תצוגת הפעילות האחרונה
 * 
 * @returns אובייקט עם state, setters, ו-getFilteredUpdates
 * 
 * @example
 * const { 
 *   activityLimit, 
 *   setActivityLimit, 
 *   getFilteredUpdates 
 * } = useDashboardFilters()
 */
export function useDashboardFilters(): UseDashboardFiltersReturn {
  // 🔹 State
  const [activityLimit, setActivityLimit] = useState(5)
  const [activityTimeFilter, setActivityTimeFilter] = useState<TimeFilter>('all')

  // 🔹 סינון עדכונים
  const getFilteredUpdates = useMemo(
    () => (updates: Update[]) => {
      let filtered = [...updates]
      const now = new Date()

      // סינון לפי זמן
      if (activityTimeFilter === 'today') {
        filtered = filtered.filter((u) => {
          const updateDate = new Date(u.created_at)
          return updateDate.toDateString() === now.toDateString()
        })
      } else if (activityTimeFilter === '3days') {
        const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
        filtered = filtered.filter((u) => new Date(u.created_at) > threeDaysAgo)
      } else if (activityTimeFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        filtered = filtered.filter((u) => new Date(u.created_at) > weekAgo)
      }

      // הגבלת כמות
      return filtered.slice(0, activityLimit)
    },
    [activityLimit, activityTimeFilter]
  )

  return {
    activityLimit,
    activityTimeFilter,
    setActivityLimit,
    setActivityTimeFilter,
    getFilteredUpdates,
  }
}