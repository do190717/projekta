'use client'

import { useIsMobile } from '@/hooks/useIsMobile'
import FinancialsDesktop from '@/app/projects/[id]/financials-v2/FinancialsDesktop'
import FinancialsMobile from '@/app/projects/[id]/financials-v2/FinancialsMobile'
/**
 * דף פיננסים V2 - נקודת כניסה
 * מחליט בין Desktop למובייל
 */
export default function FinancialsV2Page() {
  const isMobile = useIsMobile()
  
  return isMobile ? <FinancialsMobile /> : <FinancialsDesktop />
}