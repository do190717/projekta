'use client'

import { useIsMobile } from '@/hooks/useIsMobile'
import CashFlowDesktop from './CashFlowDesktop'  // ✅
import CashFlowMobile from './CashFlowMobile'    // ✅
/**
 * דף תזרים מזומנים - נקודת כניסה ראשית
 * מחליט בין תצוגת Desktop למובייל
 */
export default function CashFlowPage() {
  const isMobile = useIsMobile()
  
  // החלף בין תצוגות לפי גודל מסך
  return isMobile ? <CashFlowMobile /> : <CashFlowDesktop />
}
