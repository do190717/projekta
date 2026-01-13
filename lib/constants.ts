// ===========================================
// Projekta - Constants
// ===========================================

// קטגוריות עדכונים
export const CATEGORIES = [
  { id: 'electric', name: 'חשמל', icon: '⚡', keywords: ['חשמל', 'שקע', 'לוח', 'תאורה', 'נורה', 'חיווט', 'פאזה', 'מפסק', 'פריצה'] },
  { id: 'plumbing', name: 'אינסטלציה', icon: '🔧', keywords: ['אינסטלציה', 'ברז', 'צינור', 'נזילה', 'ביוב', 'מים', 'ניקוז', 'שיפון', 'מטפטף', 'דולף', 'סתום'] },
  { id: 'paint', name: 'צבע', icon: '🎨', keywords: ['צבע', 'צביעה', 'קיר', 'גוון', 'שפכטל', 'מתקלף', 'כתם'] },
  { id: 'tiles', name: 'ריצוף', icon: '🧱', keywords: ['ריצוף', 'אריח', 'ריצפה', 'קרמיקה', 'פורצלן', 'רובה', 'עקום', 'שבור', 'סדוק'] },
  { id: 'ac', name: 'מיזוג', icon: '❄️', keywords: ['מיזוג', 'מזגן', 'קירור', 'חימום', 'מפוצל'] },
  { id: 'kitchen', name: 'מטבח', icon: '🍳', keywords: ['מטבח', 'ארון', 'שיש', 'כיור מטבח', 'מגירה'] },
  { id: 'bathroom', name: 'חדר רחצה', icon: '🚿', keywords: ['אמבטיה', 'מקלחת', 'שירותים', 'אסלה', 'מראה'] },
  { id: 'doors', name: 'דלתות/חלונות', icon: '🚪', keywords: ['דלת', 'חלון', 'ידית', 'צירים', 'תריס', 'משקוף'] },
  { id: 'structure', name: 'קונסטרוקציה', icon: '🏗️', keywords: ['קונסטרוקציה', 'בטון', 'עמוד', 'קורה', 'יסוד', 'ברזל'] },
  { id: 'general', name: 'כללי', icon: '📝', keywords: [] },
] as const

// בניינים
export const BUILDINGS = [
  { id: 'building_1', name: 'בניין 1', icon: '🏢' },
  { id: 'building_2', name: 'בניין 2', icon: '🏢' },
  { id: 'building_3', name: 'בניין 3', icon: '🏢' },
  { id: 'building_4', name: 'בניין 4', icon: '🏢' },
  { id: 'building_5', name: 'בניין 5', icon: '🏢' },
  { id: 'general', name: 'כללי', icon: '📋' },
] as const

// קומות
export const FLOORS = [
  { id: 'basement', name: 'מרתף/חניון', icon: '🅿️' },
  { id: 'ground', name: 'קומת קרקע', icon: '🏠' },
  { id: 'floor_1', name: 'קומה א׳', icon: '1️⃣' },
  { id: 'floor_2', name: 'קומה ב׳', icon: '2️⃣' },
  { id: 'floor_3', name: 'קומה ג׳', icon: '3️⃣' },
  { id: 'floor_4', name: 'קומה ד׳', icon: '4️⃣' },
  { id: 'floor_5', name: 'קומה ה׳', icon: '5️⃣' },
  { id: 'floor_6', name: 'קומה ו׳', icon: '6️⃣' },
  { id: 'floor_7', name: 'קומה ז׳', icon: '7️⃣' },
  { id: 'floor_8', name: 'קומה ח׳', icon: '8️⃣' },
  { id: 'roof', name: 'גג', icon: '🔝' },
  { id: 'general', name: 'כללי', icon: '📋' },
] as const

// שלבי פרויקט
export const STAGES = [
  { id: 'planning', name: 'תכנון', icon: '📋' },
  { id: 'execution', name: 'ביצוע', icon: '🔨' },
  { id: 'finishing', name: 'גמר', icon: '✨' },
  { id: 'general', name: 'כללי', icon: '📁' },
] as const

// מקצועות
export const TRADES = [
  { id: 'electrical', name: 'חשמל', icon: '⚡' },
  { id: 'plumbing', name: 'אינסטלציה', icon: '🔧' },
  { id: 'engineering', name: 'הנדסה', icon: '🏗️' },
  { id: 'construction', name: 'בנייה', icon: '🧱' },
  { id: 'ac', name: 'מיזוג', icon: '❄️' },
  { id: 'elevators', name: 'מעליות', icon: '🛗' },
  { id: 'safety', name: 'בטיחות', icon: '🦺' },
  { id: 'architecture', name: 'אדריכלות', icon: '🏛️' },
  { id: 'interior', name: 'עיצוב פנים', icon: '🎨' },
  { id: 'general', name: 'כללי', icon: '📄' },
] as const

// אייקוני קבצים
export const FILE_ICONS: { [key: string]: string } = {
  pdf: '📕',
  dwg: '📐',
  dxf: '📐',
  jpg: '🖼️',
  jpeg: '🖼️',
  png: '🖼️',
  gif: '🖼️',
  webp: '🖼️',
  xlsx: '📊',
  xls: '📊',
  doc: '📝',
  docx: '📝',
  ppt: '📽️',
  pptx: '📽️',
  zip: '📦',
  rar: '📦',
  default: '📄',
}

// תפקידים בפרויקט
export const ROLES: { [key: string]: { name: string; icon: string; color: string; permissions: string[] } } = {
  owner: { name: 'בעלים', icon: '🔑', color: '#F59E0B', permissions: ['all'] },
  admin: { name: 'מנהל', icon: '👑', color: '#8B5CF6', permissions: ['edit', 'approve', 'assign'] },
  supervisor: { name: 'מפקח', icon: '👷', color: '#3B82F6', permissions: ['edit', 'approve'] },
  contractor: { name: 'קבלן', icon: '🏗️', color: '#10B981', permissions: ['edit', 'dispute'] },
  engineer: { name: 'מהנדס', icon: '📐', color: '#EC4899', permissions: ['edit', 'approve'] },
  designer: { name: 'מעצב', icon: '🎨', color: '#F97316', permissions: ['edit'] },
  worker: { name: 'מנהל עבודה', icon: '🔨', color: '#06B6D4', permissions: ['edit', 'complete'] },
  member: { name: 'חבר צוות', icon: '👷', color: '#3B82F6', permissions: ['edit'] },
  viewer: { name: 'צופה', icon: '👁️', color: '#6B7280', permissions: ['view'] },
}

// ===========================================
// סטטוסים חדשים - מחזור חיים של בעיה
// ===========================================

export const UPDATE_STATUSES = {
  open: { 
    name: 'נפתח', 
    icon: '🔴', 
    color: '#EF4444',
    bgColor: '#FEF2F2',
    description: 'בעיה חדשה שנפתחה',
    nextStatuses: ['in_review', 'cancelled']
  },
  in_review: { 
    name: 'בבדיקה', 
    icon: '🟡', 
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    description: 'בבדיקה אצל הגורם המקצועי',
    nextStatuses: ['approved', 'rejected', 'disputed']
  },
  disputed: { 
    name: 'השגה', 
    icon: '⚠️', 
    color: '#F97316',
    bgColor: '#FFF7ED',
    description: 'קבלן/גורם חולק על הסיווג',
    nextStatuses: ['in_review', 'approved', 'rejected']
  },
  approved: { 
    name: 'מאושר', 
    icon: '✅', 
    color: '#10B981',
    bgColor: '#ECFDF5',
    description: 'אושר לביצוע',
    nextStatuses: ['in_progress']
  },
  rejected: { 
    name: 'נדחה', 
    icon: '❌', 
    color: '#6B7280',
    bgColor: '#F9FAFB',
    description: 'נדחה - לא יבוצע',
    nextStatuses: ['open']
  },
  in_progress: { 
    name: 'בביצוע', 
    icon: '🔵', 
    color: '#3B82F6',
    bgColor: '#EFF6FF',
    description: 'בתהליך ביצוע',
    nextStatuses: ['completed']
  },
  completed: { 
    name: 'בוצע', 
    icon: '✔️', 
    color: '#059669',
    bgColor: '#D1FAE5',
    description: 'בוצע - ממתין לאישור',
    nextStatuses: ['verified', 'in_progress']
  },
  verified: { 
    name: 'אושר סופית', 
    icon: '🏆', 
    color: '#7C3AED',
    bgColor: '#EDE9FE',
    description: 'אושר ונסגר',
    nextStatuses: []
  },
  cancelled: { 
    name: 'בוטל', 
    icon: '🚫', 
    color: '#9CA3AF',
    bgColor: '#F3F4F6',
    description: 'בוטל',
    nextStatuses: ['open']
  },
} as const

// סוג עבודה - חוזה או תוספת
export const WORK_TYPES = {
  contract: { 
    name: 'בחוזה', 
    icon: '📄', 
    color: '#10B981',
    bgColor: '#ECFDF5',
    description: 'עבודה שנכללת בחוזה המקורי'
  },
  addition: { 
    name: 'תוספת', 
    icon: '➕', 
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    description: 'עבודה מעבר לחוזה - דורש תמחור'
  },
  pending: { 
    name: 'לא נקבע', 
    icon: '❓', 
    color: '#6B7280',
    bgColor: '#F9FAFB',
    description: 'עדיין לא הוחלט'
  },
} as const

// סוגי עדכונים
export const UPDATE_TYPES = {
  issue: { name: 'בעיה', icon: '🔴', color: '#EF4444' },
  change: { name: 'שינוי תכנית', icon: '📝', color: '#3B82F6' },
  approval: { name: 'אישור נדרש', icon: '✋', color: '#F59E0B' },
  info: { name: 'עדכון', icon: 'ℹ️', color: '#6B7280' },
  completed: { name: 'הושלם', icon: '✅', color: '#10B981' },
} as const

// ===========================================
// Helper Functions
// ===========================================

export const getFileIcon = (fileType: string): string => {
  return FILE_ICONS[fileType?.toLowerCase()] || FILE_ICONS.default
}

export const formatFileSize = (bytes: number): string => {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export const detectCategory = (text: string) => {
  const lowerText = text.toLowerCase()
  for (const category of CATEGORIES) {
    if (category.keywords) {
      for (const keyword of category.keywords) {
        if (lowerText.includes(keyword)) return category
      }
    }
  }
  return CATEGORIES.find(c => c.id === 'general')!
}

export const canPreviewFile = (fileType: string): boolean => {
  return ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileType?.toLowerCase())
}

export const generateToken = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

// Types
export type CategoryId = typeof CATEGORIES[number]['id']
export type BuildingId = typeof BUILDINGS[number]['id']
export type FloorId = typeof FLOORS[number]['id']
export type StageId = typeof STAGES[number]['id']
export type TradeId = typeof TRADES[number]['id']
export type RoleId = keyof typeof ROLES
export type UpdateStatusId = keyof typeof UPDATE_STATUSES
export type WorkTypeId = keyof typeof WORK_TYPES
export type UpdateTypeId = keyof typeof UPDATE_TYPES
