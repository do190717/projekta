'use client'

import { useEffect, useState } from 'react'

/**
 * Hook לזיהוי מובייל/דסקטופ
 * @param breakpoint - ברירת מחדל 768px
 * @returns boolean - האם מובייל
 */
export function useIsMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < breakpoint)
    
    // בדיקה ראשונית
    checkMobile()
    
    // האזנה לשינויי גודל
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [breakpoint])
  
  return isMobile
}

/**
 * Hook לזיהוי tablet
 */
export function useIsTablet(): boolean {
  const [isTablet, setIsTablet] = useState(false)
  
  useEffect(() => {
    const checkTablet = () => {
      const width = window.innerWidth
      setIsTablet(width >= 768 && width < 1024)
    }
    
    checkTablet()
    window.addEventListener('resize', checkTablet)
    
    return () => window.removeEventListener('resize', checkTablet)
  }, [])
  
  return isTablet
}

/**
 * Hook מתקדם - מחזיר את סוג המכשיר
 */
export function useDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')
  
  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth
      if (width < 768) {
        setDeviceType('mobile')
      } else if (width < 1024) {
        setDeviceType('tablet')
      } else {
        setDeviceType('desktop')
      }
    }
    
    checkDevice()
    window.addEventListener('resize', checkDevice)
    
    return () => window.removeEventListener('resize', checkDevice)
  }, [])
  
  return deviceType
}

/**
 * Hook לזיהוי touch device
 */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false)
  
  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])
  
  return isTouch
}

export default useIsMobile
