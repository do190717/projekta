import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'

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
// BUDGET HOOKS
// ============================================

export function useBudgetSettings(projectId: string) {
  return useQuery({
    queryKey: ['budget-settings', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_budget_settings')
        .select('*')
        .eq('project_id', projectId)
        .single()
      
      if (error) throw error
      return data
    },
    enabled: !!projectId,
  })
}

export function useBudgetData(projectId: string) {
  return useQuery({
    queryKey: ['budget', projectId],
    queryFn: async () => {
      // Load budget data
      const { data: budgetViewData, error: budgetError } = await supabase
        .from('budget_with_committed_costs')
        .select('*')
        .eq('project_id', projectId)
        .order('budgeted_amount', { ascending: false })
      
      if (budgetError) throw budgetError
      if (!budgetViewData) return []

      // ✅ Load all transactions in a SINGLE query (no N+1!)
      const categoryIds = budgetViewData.map(item => item.category_id)
      
      const { data: allTransactions, error: transError } = await supabase
        .from('cash_flow')
        .select('*')
        .eq('project_id', projectId)
        .in('category_id', categoryIds)
        .in('type', ['expense', 'addition_expense'])
        .order('date', { ascending: false })
      
      if (transError) throw transError

      // Group transactions by category_id
      const transactionsByCategory: Record<string, any[]> = {}
      
      if (allTransactions) {
        allTransactions.forEach(transaction => {
          const catId = transaction.category_id
          if (!transactionsByCategory[catId]) {
            transactionsByCategory[catId] = []
          }
          transactionsByCategory[catId].push(transaction)
        })
      }
      
      // Attach recent transactions (max 5 per category)
      const dataWithTransactions = budgetViewData.map(item => ({
        ...item,
        transactions: (transactionsByCategory[item.category_id] || []).slice(0, 5)
      }))
      
      return dataWithTransactions
    },
    enabled: !!projectId,
  })
}

// ============================================
// CASH FLOW HOOKS
// ============================================

export function useCashFlow(projectId: string) {
  return useQuery({
    queryKey: ['cash-flow', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cash_flow')
        .select('*')
        .eq('project_id', projectId)
        .order('date', { ascending: false })
      
      if (error) throw error
      return data || []
    },
    enabled: !!projectId,
  })
}

export function useAddCashFlow() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (cashFlow: any) => {
      const { data, error } = await supabase
        .from('cash_flow')
        .insert(cashFlow)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      // Invalidate relevant queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['cash-flow', data.project_id] })
      queryClient.invalidateQueries({ queryKey: ['budget', data.project_id] })
    },
  })
}

// ============================================
// CATEGORIES HOOKS
// ============================================

export function useCategories(type?: 'expense' | 'income') {
  return useQuery({
    queryKey: ['categories', type],
    queryFn: async () => {
      let query = supabase
        .from('cash_flow_categories')
        .select('*')
        .order('name')
      
      if (type) {
        query = query.eq('type', type)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      return data || []
    },
  })
}

// ============================================
// PURCHASE ORDERS HOOKS
// ============================================

export function usePurchaseOrders(projectId: string, categoryId?: string) {
  return useQuery({
    queryKey: ['purchase-orders', projectId, categoryId],
    queryFn: async () => {
      let query = supabase
        .from('purchase_orders')
        .select('*')
        .eq('project_id', projectId)
        .order('order_date', { ascending: false })
      
      if (categoryId) {
        query = query.eq('category_id', categoryId)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      return data || []
    },
    enabled: !!projectId,
  })
}

export function useAddPurchaseOrder() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (po: any) => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .insert(po)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', data.project_id] })
      queryClient.invalidateQueries({ queryKey: ['budget', data.project_id] })
    },
  })
}

export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', data.project_id] })
      queryClient.invalidateQueries({ queryKey: ['budget', data.project_id] })
    },
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
