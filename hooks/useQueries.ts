import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { showSuccess, showError } from '@/app/utils/toast'


// ============================================
// PROJECT HOOKS
// ============================================

export function useProject(projectId: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()
      
      if (error) throw error
      return data
    },
    enabled: !!projectId,
  })
}

export function useProjects(userId: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['projects', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    },
    enabled: !!userId,
  })
}

// ============================================
// DASHBOARD HOOKS
// ============================================

export function useDashboardStats(projectId: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['dashboard-stats', projectId],
    queryFn: async () => {
      const [updatesCount, openCount, teamCount, filesCount] = await Promise.all([
        supabase
          .from('updates')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', projectId),
        supabase
          .from('updates')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', projectId)
          .in('status', ['open', 'in_review', 'in_progress']),
        supabase
          .from('project_members')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', projectId),
        supabase
          .from('project_files')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', projectId)
      ])

      return {
        totalUpdates: updatesCount.count || 0,
        openUpdates: openCount.count || 0,
        teamMembers: (teamCount.count || 0) + 1,
        filesCount: filesCount.count || 0,
      }
    },
    enabled: !!projectId,
  })
}

export function useRecentUpdates(projectId: string, limit = 20) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['recent-updates', projectId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('updates')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(limit)
      
      if (error) throw error
      return data || []
    },
    enabled: !!projectId,
  })
}

export function useRecentFiles(projectId: string, limit = 3) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['recent-files', projectId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_files')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(limit)
      
      if (error) throw error
      return data || []
    },
    enabled: !!projectId,
  })
}

export function useUpdateComments(updateIds: string[]) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['update-comments', updateIds],
    queryFn: async () => {
      if (!updateIds.length) return {}
      
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .in('update_id', updateIds)
      
      if (error) throw error
      
      // Group by update_id
      const grouped: Record<string, any[]> = {}
      data?.forEach(comment => {
        if (!grouped[comment.update_id]) {
          grouped[comment.update_id] = []
        }
        grouped[comment.update_id].push(comment)
      })
      
      return grouped
    },
    enabled: updateIds.length > 0,
  })
}

export function useProfiles(userIds: string[]) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['profiles', userIds],
    queryFn: async () => {
      if (!userIds.length) return {}
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds)
      
      if (error) throw error
      
      // Convert to map
      const profilesMap: Record<string, any> = {}
      data?.forEach(p => { profilesMap[p.id] = p })
      
      return profilesMap
    },
    enabled: userIds.length > 0,
  })
}
