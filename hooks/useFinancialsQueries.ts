// ====================================
// 📦 FINANCIALS V2 QUERIES
// ====================================
// React Query hooks for new financials system
// ====================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

// ====================================
// 📘 TYPES
// ====================================

export interface ContractItem {
  id: string
  project_id: string
  category_id: string
  contract_amount: number
  description: string | null
  created_at: string
  updated_at: string
  category?: {
    id: string
    name: string
    icon: string
    color: string
  }
}

export interface CashFlowTransaction {
  id: string
  project_id: string
  type: 'income' | 'expense'
  amount: number
  description: string
  category_id: string | null
  date: string
  status: 'paid' | 'pending'
  created_by: string | null
  created_at: string
  updated_at: string
  category?: {
    id: string
    name: string
    icon: string
    color: string
  }
}

export interface FinancialCategory {
  category_id: string
  category_name: string
  category_icon: string
  category_color: string
  contract_amount: number
  actual_expenses: number
  received_income: number
  expected_profit: number
  pending_amount: number
}

// ====================================
// 🎯 HOOKS
// ====================================

/**
 * Get all contract items for a project
 */
export function useContractItems(projectId: string) {
  return useQuery({
    queryKey: ['contract-items', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_items')
        .select(`
          *,
          category:cash_flow_categories(id, name, icon, color)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as ContractItem[]
    },
    enabled: !!projectId,
  })
}

/**
 * Get all cash flow transactions for a project
 */
export function useCashFlowV2(projectId: string) {
  return useQuery({
    queryKey: ['cash-flow-v2', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cash_flow_v2')
        .select(`
          *,
          category:cash_flow_categories(id, name, icon, color)
        `)
        .eq('project_id', projectId)
        .order('date', { ascending: false })

      if (error) throw error
      return data as CashFlowTransaction[]
    },
    enabled: !!projectId,
  })
}

/**
 * Get financial overview (aggregated data)
 */
export function useFinancialsOverview(projectId: string) {
  return useQuery({
    queryKey: ['financials-overview', projectId],
    queryFn: async () => {
      // Get all contract items
      const { data: contractItems, error: contractError } = await supabase
        .from('contract_items')
        .select('*, category:cash_flow_categories(*)')
        .eq('project_id', projectId)

      if (contractError) throw contractError

      // Get all cash flow transactions
      const { data: transactions, error: transError } = await supabase
        .from('cash_flow_v2')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'paid')

      if (transError) throw transError

      // Calculate totals
      const totalContract = contractItems?.reduce((sum, item) => 
        sum + Number(item.contract_amount || 0), 0
      ) || 0

      const totalExpenses = transactions
        ?.filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0) || 0

      const totalIncome = transactions
        ?.filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0) || 0

      const expectedProfit = totalContract - totalExpenses
      const pendingFromClient = totalContract - totalIncome
      const percentageComplete = totalContract > 0 ? (totalExpenses / totalContract) * 100 : 0

      // Calculate per category
      const categories: FinancialCategory[] = contractItems?.map(item => {
        const categoryExpenses = transactions
          ?.filter(t => t.type === 'expense' && t.category_id === item.category_id)
          .reduce((sum, t) => sum + Number(t.amount || 0), 0) || 0

        const categoryIncome = transactions
          ?.filter(t => t.type === 'income' && t.category_id === item.category_id)
          .reduce((sum, t) => sum + Number(t.amount || 0), 0) || 0

        return {
          category_id: item.category_id,
          category_name: item.category?.name || '',
          category_icon: item.category?.icon || '📦',
          category_color: item.category?.color || '#6366F1',
          contract_amount: Number(item.contract_amount || 0),
          actual_expenses: categoryExpenses,
          received_income: categoryIncome,
          expected_profit: Number(item.contract_amount || 0) - categoryExpenses,
          pending_amount: Number(item.contract_amount || 0) - categoryIncome,
        }
      }) || []

      return {
        totals: {
          totalContract,
          totalExpenses,
          totalIncome,
          expectedProfit,
          pendingFromClient,
          percentageComplete,
        },
        categories,
      }
    },
    enabled: !!projectId,
  })
}

/**
 * Add a contract item
 */
export function useAddContractItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (item: Omit<ContractItem, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('contract_items')
        .insert(item)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contract-items', variables.project_id] })
      queryClient.invalidateQueries({ queryKey: ['financials-overview', variables.project_id] })
    },
  })
}

/**
 * Add a cash flow transaction
 */
export function useAddCashFlowTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (transaction: Omit<CashFlowTransaction, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('cash_flow_v2')
        .insert(transaction)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cash-flow-v2', variables.project_id] })
      queryClient.invalidateQueries({ queryKey: ['financials-overview', variables.project_id] })
    },
  })
}

/**
 * Delete a cash flow transaction
 */
export function useDeleteCashFlowTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase
        .from('cash_flow_v2')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cash-flow-v2', variables.projectId] })
      queryClient.invalidateQueries({ queryKey: ['financials-overview', variables.projectId] })
    },
  })
}
/**
 * Update a contract item
 */
export function useUpdateContractItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string
      updates: Partial<Omit<ContractItem, 'id' | 'created_at' | 'updated_at'>> 
    }) => {
      const { data, error } = await supabase
        .from('contract_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contract-items', data.project_id] })
      queryClient.invalidateQueries({ queryKey: ['financials-overview', data.project_id] })
    },
  })
}

/**
 * Delete a contract item
 */
export function useDeleteContractItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase
        .from('contract_items')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contract-items', variables.projectId] })
      queryClient.invalidateQueries({ queryKey: ['financials-overview', variables.projectId] })
    },
  })
}
