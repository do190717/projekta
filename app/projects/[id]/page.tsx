'use client'

import { useIsMobile } from '@/hooks/useIsMobile'
import DashboardDesktop from './DashboardDesktop'
import DashboardMobile from './DashboardMobile'

/**
 * Dashboard - נקודת כניסה ראשית
 * מחליט בין תצוגת Desktop למובייל
 */
export default function ProjectDashboard() {
  const isMobile = useIsMobile()
  
  // החלף בין תצוגות לפי גודל מסך
  return isMobile ? <DashboardMobile /> : <DashboardDesktop />
}
