import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { showSuccess, showError } from '@/app/utils/toast'

const supabase = createClient()

// ============================================
// PROJECT HOOKS
// ============================================

export function useProject(projectId: string) {
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
  return useQuery({
    queryKey: ['projects', userId],
    queryFn: async () => {
      // 1. פרויקטים שאני בעלים
      const { data: owned, error } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const ownedProjects = owned || []

      // 2. פרויקטים שאני חבר בהם
      const { data: memberOf } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', userId)

      const memberProjectIds = (memberOf || [])
        .map(m => m.project_id)
        .filter(id => !ownedProjects.some((p: any) => p.id === id))

      let memberProjects: any[] = []
      if (memberProjectIds.length > 0) {
        const { data } = await supabase
          .from('projects')
          .select('*')
          .in('id', memberProjectIds)
          .order('created_at', { ascending: false })
        memberProjects = data || []
      }

      return [...ownedProjects, ...memberProjects]
    },
    enabled: !!userId,
  })
}

// ============================================
// DASHBOARD HOOKS
// ============================================

export function useDashboardStats(projectId: string) {
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
