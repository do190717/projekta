// ====================================
// 📦 FINANCIALS V2 QUERIES
// ====================================
// React Query hooks for unified financials system
// ====================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'


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
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface FinancialCategory {
  contract_item_id: string
  category_id: string
  category_name: string
  category_icon: string
  category_color: string
  is_system: boolean
  sort_order: number
  contract_amount: number
  actual_expenses: number
  received_income: number
  pending_expenses: number
  pending_income: number
  committed_amount: number
  // Computed client-side from the above
  expected_profit: number
  pending_amount: number
}

export interface FinancialsTotals {
  totalContract: number
  totalExpenses: number
  totalIncome: number
  totalCommitted: number
  expectedProfit: number
  pendingFromClient: number
  percentageComplete: number
}

// ====================================
// 🎯 HOOKS
// ====================================

/**
 * Get all contract items for a project
 */
export function useContractItems(projectId: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['contract-items', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_items')
        .select('*')
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
  const supabase = createClient()
  return useQuery({
    queryKey: ['cash-flow-v2', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cash_flow_v2')
        .select('*')
        .eq('project_id', projectId)
        .order('date', { ascending: false })

      if (error) throw error
      return data as CashFlowTransaction[]
    },
    enabled: !!projectId,
  })
}

/**
 * Get financial overview from DB VIEW (all calculations server-side)
 * 
 * BEFORE: 2 separate queries + ~60 lines of client-side calculations
 * AFTER: 1 query from financials_overview_v2 VIEW
 */
export function useFinancialsOverview(projectId: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['financials-overview', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financials_overview_v2')
        .select('*')
        .eq('project_id', projectId)

      if (error) throw error

      const rows = data || []

      // Map DB rows to typed categories
      const categories: FinancialCategory[] = rows.map(row => ({
        contract_item_id: row.contract_item_id,
        category_id: row.category_id,
        category_name: row.category_name,
        category_icon: row.category_icon,
        category_color: row.category_color,
        is_system: row.is_system,
        sort_order: row.sort_order,
        contract_amount: Number(row.contract_amount),
        actual_expenses: Number(row.actual_expenses),
        received_income: Number(row.received_income),
        pending_expenses: Number(row.pending_expenses),
        pending_income: Number(row.pending_income),
        committed_amount: Number(row.committed_amount),
        // Derived
        expected_profit: Number(row.contract_amount) - Number(row.actual_expenses),
        pending_amount: Number(row.contract_amount) - Number(row.received_income),
      }))

      // Totals — simple reduce over pre-calculated rows
      const totalContract = categories.reduce((s, c) => s + c.contract_amount, 0)
      const totalExpenses = categories.reduce((s, c) => s + c.actual_expenses, 0)
      const totalIncome = categories.reduce((s, c) => s + c.received_income, 0)
      const totalCommitted = categories.reduce((s, c) => s + c.committed_amount, 0)

      const totals: FinancialsTotals = {
        totalContract,
        totalExpenses,
        totalIncome,
        totalCommitted,
        expectedProfit: totalContract - totalExpenses,
        pendingFromClient: totalContract - totalIncome,
        percentageComplete: totalContract > 0 ? (totalExpenses / totalContract) * 100 : 0,
      }

      return { totals, categories }
    },
    enabled: !!projectId,
  })
}

// ====================================
// ✏️ CONTRACT ITEM MUTATIONS
// ====================================

/**
 * Add a contract item
 */
export function useAddContractItem() {
  const supabase = createClient()
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
 * Update a contract item
 */
export function useUpdateContractItem() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      updates,
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
  const supabase = createClient()
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

// ====================================
// 💳 CASH FLOW MUTATIONS
// ====================================

/**
 * Add a cash flow transaction
 */
export function useAddCashFlowTransaction() {
  const supabase = createClient()
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
  const supabase = createClient()
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

// ====================================
// 📦 PURCHASE ORDER HOOKS
// (Moved from useQueries.ts, updated invalidations)
// ====================================

/**
 * Get purchase orders for a project (optionally filtered by category)
 */
export function usePurchaseOrders(projectId: string, categoryId?: string) {
  const supabase = createClient()
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

/**
 * Add a purchase order
 */
export function useAddPurchaseOrder() {
  const supabase = createClient()
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
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', data.project_id] })
      queryClient.invalidateQueries({ queryKey: ['financials-overview', data.project_id] })
    },
  })
}

/**
 * Update a purchase order
 */
export function useUpdatePurchaseOrder() {
  const supabase = createClient()
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
      queryClient.invalidateQueries({ queryKey: ['financials-overview', data.project_id] })
    },
  })
}
