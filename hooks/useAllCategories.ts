import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export interface Category {
  id: string
  name: string
  icon: string
  isCustom?: boolean
}

// System categories - הקטגוריות המוגדרות מראש
const SYSTEM_CATEGORIES: Category[] = [
  { id: 'materials', name: 'חומרים ואבנות', icon: '🏗️' },
  { id: 'aluminum', name: 'אלומיניום וזכוכית', icon: '🔌' },
  { id: 'plumbing', name: 'אינסטלציה', icon: '🚰' },
  { id: 'electricity', name: 'חשמל', icon: '⚡' },
  { id: 'painting', name: 'צביעה', icon: '🎨' },
  { id: 'flooring', name: 'ריצוף', icon: '📐' },
  { id: 'carpentry', name: 'נגרות', icon: '🪵' },
  { id: 'hvac', name: 'מיזוג אוויר', icon: '❄️' },
  { id: 'security', name: 'אבטחה', icon: '🔒' },
  { id: 'landscaping', name: 'גינון', icon: '🌳' },
  { id: 'equipment', name: 'ציוד וכלים', icon: '🔧' },
  { id: 'labor', name: 'שכר עבודה', icon: '👷' },
  { id: 'permits', name: 'אגרות והיטלים', icon: '📋' },
  { id: 'other', name: 'אחר', icon: '📦' }
]

export function useAllCategories(projectId: string | null) {
  const [customCategories, setCustomCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)

  console.log('🔍 useAllCategories - projectId:', projectId)

  useEffect(() => {
    if (!projectId) {
      console.log('⚠️ No projectId - skipping fetch')
      setCustomCategories([])
      return
    }

    const fetchCustomCategories = async () => {
      setLoading(true)
      const supabase = createClient()
      
      console.log('📡 Fetching custom categories for project:', projectId)
      
      try {
        const { data, error } = await supabase
          .from('custom_categories')
          .select('*')
          .eq('project_id', projectId)
          .order('name')

        console.log('📦 Custom categories data:', data)
        console.log('❌ Custom categories error:', error)

        if (error) throw error

        const customCats: Category[] = (data || []).map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          icon: cat.icon,
          isCustom: true
        }))

        console.log('✅ Mapped custom categories:', customCats)
        setCustomCategories(customCats)
      } catch (error) {
        console.error('💥 Error fetching custom categories:', error)
        setCustomCategories([])
      } finally {
        setLoading(false)
      }
    }

    fetchCustomCategories()

    // Subscribe to changes
    const supabase = createClient()
    const subscription = supabase
      .channel(`custom_categories_${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'custom_categories',
          filter: `project_id=eq.${projectId}`
        },
        () => {
          fetchCustomCategories()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [projectId])

  const addCategory = (category: Category) => {
    setCustomCategories(prev => [...prev, { ...category, isCustom: true }])
  }

  // ALWAYS return system categories + custom categories
  const allCategories = [...SYSTEM_CATEGORIES, ...customCategories]

  return { categories: allCategories, loading, addCategory, systemCategories: SYSTEM_CATEGORIES }
}