// ====================================
// 📦 DASHBOARD TYPES
// ====================================
// טייפים משותפים לכל הדשבורד
// ====================================

// ====================================
// 🔹 Core Entities
// ====================================

/**
 * עדכון בפרויקט
 */
export interface Update {
  id: string
  content: string
  status: string
  created_at: string
  user_id: string
  project_id?: string
  category?: string
  work_type?: string
  tagged_files?: string[]
  completed?: boolean
  [key: string]: any  // שדות נוספים אפשריים
}

/**
 * פרופיל משתמש
 */
export interface Profile {
  id: string
  full_name: string
  phone?: string
  email?: string
  avatar_url?: string
  [key: string]: any
}

/**
 * תגובה לעדכון
 */
export interface Comment {
  id: string
  content: string
  user_id: string
  update_id: string
  reply_to?: string
  created_at: string
  deleted_at: string | null
  tagged_files?: string[]
  [key: string]: any
}

/**
 * קובץ בפרויקט
 */
export interface ProjectFile {
  id: string
  name: string
  url: string
  created_at: string
  user_id: string
  project_id: string
  building?: string
  floor?: string
  unit?: string
  stage?: string
  trade?: string
  category?: string
  tags?: string[]
  [key: string]: any
}

// ====================================
// 🔹 Dashboard Specific
// ====================================

/**
 * סטטיסטיקות דשבורד
 */
export interface DashboardStats {
  totalUpdates: number
  openUpdates: number
  teamMembers: number
  filesCount: number
}

/**
 * התראה בדשבורד
 */
export interface Alert {
  icon: string
  message: string
  color: string
  action?: string
  onClick: () => void
}

/**
 * פעולה מהירה
 */
export interface QuickAction {
  label: string
  onClick: () => void
}

/**
 * כרטיס סטטיסטיקה
 */
export interface StatCard {
  icon: string
  title: string
  value: string | number
  subtitle: string
  color: string
  onClick?: () => void
}

// ====================================
// 🔹 Filters
// ====================================

/**
 * פילטר זמן לפעילות
 */
export type TimeFilter = 'today' | '3days' | 'week' | 'all'

// ====================================
// 🔹 Props Types
// ====================================

/**
 * Props למיפוי profiles
 */
export type ProfilesMap = Record<string, Profile>

/**
 * Props למיפוי comments
 */
export type CommentsMap = Record<string, Comment[]>