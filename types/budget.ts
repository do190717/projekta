// types/budget.ts - UPDATED VERSION

export type POStatus = 'ordered' | 'partial' | 'received' | 'paid' | 'cancelled'
export type DeliveryStatus = 'pending' | 'delivered'
export type PaymentStatus = 'unpaid' | 'paid'
export type PaymentMethod = 'bank_transfer' | 'check' | 'cash' | 'credit'

export interface PurchaseOrder {
  id: string
  project_id: string
  category_id: string
  
  po_number?: string
  supplier_name: string
  description?: string
  
  total_amount: number
  paid_amount: number
  
  status: POStatus // Keep for backward compatibility
  
  // ✨ NEW: Delivery tracking
  delivery_status: DeliveryStatus
  actual_delivery_date?: string
  
  // ✨ NEW: Payment tracking
  payment_status: PaymentStatus
  payment_method?: PaymentMethod
  payment_reference?: string // מספר צ'ק / אסמכתא
  
  order_date: string
  expected_delivery_date?: string
  payment_date?: string
  
  notes?: string
  
  created_by?: string
  created_at: string
  updated_at: string
}

export interface BudgetWithCommitted {
  id: string
  project_id: string
  category_id: string
  category_name: string
  category_icon: string
  category_color: string
  
  budgeted_amount: number
  spent_amount: number
  committed_amount: number
  available_amount: number
  
  percentage_spent: number
  percentage_committed: number
  percentage_used: number
  
  transactions?: any[]
}

export interface BudgetSummary {
  total_budgeted: number
  total_spent: number
  total_committed: number
  total_available: number
  
  percentage_used: number
  
  categories_over_budget: number
  categories_near_limit: number
  categories_at_risk: number
}

// Status helpers
export const PO_STATUS_LABELS: Record<POStatus, string> = {
  ordered: 'הוזמן',
  partial: 'בביצוע',
  received: 'התקבל',
  paid: 'שולם',
  cancelled: 'בוטל',
}

export const PO_STATUS_COLORS: Record<POStatus, string> = {
  ordered: '#F59E0B',
  partial: '#3B82F6',
  received: '#8B5CF6',
  paid: '#10B981',
  cancelled: '#6B7280',
}

// ✨ NEW: Delivery status helpers
export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: 'ממתין לאספקה',
  delivered: 'סופק',
}

export const DELIVERY_STATUS_COLORS: Record<DeliveryStatus, string> = {
  pending: '#F59E0B',
  delivered: '#10B981',
}

// ✨ NEW: Payment status helpers
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'ממתין לתשלום',
  paid: 'שולם',
}

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  unpaid: '#F59E0B',
  paid: '#10B981',
}

// ✨ NEW: Payment method helpers
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  bank_transfer: 'העברה בנקאית',
  check: 'צ׳ק',
  cash: 'מזומן',
  credit: 'אשראי',
}

export const PAYMENT_METHOD_ICONS: Record<PaymentMethod, string> = {
  bank_transfer: '🏦',
  check: '📝',
  cash: '💵',
  credit: '💳',
}

// Helper functions
export function getCommittedAmount(po: PurchaseOrder): number {
  // Only committed if not paid yet
  if (po.payment_status === 'paid') {
    return 0
  }
  return po.total_amount - po.paid_amount
}

export function getPOStatusColor(status: POStatus): string {
  return PO_STATUS_COLORS[status]
}

export function getPOStatusLabel(status: POStatus): string {
  return PO_STATUS_LABELS[status]
}

export function getDeliveryStatusColor(status: DeliveryStatus): string {
  return DELIVERY_STATUS_COLORS[status]
}

export function getDeliveryStatusLabel(status: DeliveryStatus): string {
  return DELIVERY_STATUS_LABELS[status]
}

export function getPaymentStatusColor(status: PaymentStatus): string {
  return PAYMENT_STATUS_COLORS[status]
}

export function getPaymentStatusLabel(status: PaymentStatus): string {
  return PAYMENT_STATUS_LABELS[status]
}

export function getPaymentMethodLabel(method: PaymentMethod): string {
  return PAYMENT_METHOD_LABELS[method]
}

export function getPaymentMethodIcon(method: PaymentMethod): string {
  return PAYMENT_METHOD_ICONS[method]
}

// ✨ NEW: Get comprehensive status
export function getPOComprehensiveStatus(po: PurchaseOrder): {
  label: string
  color: string
  icon: string
} {
  if (po.payment_status === 'paid' && po.delivery_status === 'delivered') {
    return { label: '✅ הושלם', color: '#10B981', icon: '✅' }
  }
  if (po.payment_status === 'paid' && po.delivery_status === 'pending') {
    return { label: '💰 שולם - ממתין לאספקה', color: '#3B82F6', icon: '💰' }
  }
  if (po.payment_status === 'unpaid' && po.delivery_status === 'delivered') {
    return { label: '📦 סופק - ממתין לתשלום', color: '#F59E0B', icon: '📦' }
  }
  return { label: '⏳ בתהליך', color: '#F59E0B', icon: '⏳' }
}
