import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'

export interface ProjectCategory {
  id: string
  project_id: string
  name: string
  icon: string
  color: string
  is_system: boolean
  sort_order: number
}

/**
 * Fetch all categories for a project (system + custom) from DB.
 * Replaces useAllCategories (which had hardcoded SYSTEM_CATEGORIES in JS)
 * and useCategories (which queried old cash_flow_categories table).
 */
export function useProjectCategories(projectId: string | null) {
  return useQuery({
    queryKey: ['project-categories', projectId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('project_categories')
        .select('*')
        .eq('project_id', projectId!)
        .order('sort_order')

      if (error) throw error
      return data as ProjectCategory[]
    },
    enabled: !!projectId,
  })
}

/**
 * Add a custom category to a project.
 * Replaces AddCustomCategoryModal → custom_categories insert.
 */
export function useAddProjectCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (category: {
      project_id: string
      name: string
      icon: string
    }) => {
      const supabase = createClient()
      const id = crypto.randomUUID()

      const { data, error } = await supabase
        .from('project_categories')
        .insert({
          id,
          project_id: category.project_id,
          name: category.name,
          icon: category.icon,
          color: '#6366F1',
          is_system: false,
          sort_order: 100,
        })
        .select()
        .single()

      if (error) throw error
      return data as ProjectCategory
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['project-categories', data.project_id],
      })
    },
  })
}
