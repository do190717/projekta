'use client'

import { useIsMobile } from '@/hooks/useIsMobile'
import BudgetDesktop from './BudgetDesktop'
import BudgetMobile from './BudgetMobile'

/**
 * דף תקציב - נקודת כניסה ראשית
 * מחליט בין תצוגת Desktop למובייל
 */
export default function BudgetPage() {
  const isMobile = useIsMobile()
  
  // החלף בין תצוגות לפי גודל מסך
  return isMobile ? <BudgetMobile /> : <BudgetDesktop />
}
