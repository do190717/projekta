// ====================================
// 📦 TIME AGO UTILITY
// ====================================
// המרת תאריך לטקסט "לפני X דקות"
// ====================================

/**
 * ממיר תאריך ל"לפני X זמן" בעברית
 * @param date - תאריך כstring (ISO format)
 * @returns טקסט בעברית - "לפני 5 דקות", "אתמול", וכו'
 * 
 * @example
 * getTimeAgo('2024-01-19T10:00:00Z') // "לפני 2 שעות"
 */
export function getTimeAgo(date: string): string {
  const now = new Date()
  const past = new Date(date)
  const diffMs = now.getTime() - past.getTime()
  
  // חישוב הפרשים
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  // החזרת טקסט מתאים
  if (diffMins < 1) return 'עכשיו'
  if (diffMins < 60) return `לפני ${diffMins} דקות`
  if (diffHours < 24) return `לפני ${diffHours} שעות`
  if (diffDays === 1) return 'אתמול'
  if (diffDays < 7) return `לפני ${diffDays} ימים`
  
  // אם יותר משבוע - תאריך מלא
  return past.toLocaleDateString('he-IL')
}

/**
 * גרסה קצרה למובייל (ד', ש', ימים)
 * @param date - תאריך כstring
 * @returns טקסט מקוצר - "5ד'", "2ש'", "3 ימים"
 */
export function getTimeAgoShort(date: string): string {
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
  
  return past.toLocaleDateString('he-IL', { 
    day: 'numeric', 
    month: 'numeric' 
  })
}