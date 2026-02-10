'use client'

import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { showSuccess, showError } from '@/app/utils/toast'
import { createClient } from '@/lib/supabase'
import type { PurchaseOrder, PaymentStatus } from '@/types/budget'
import { 
  getPOComprehensiveStatus, 
  getPaymentMethodLabel, 
  getPaymentMethodIcon,
  getDeliveryStatusLabel,
  getPaymentStatusLabel
} from '@/types/budget'

interface POListModalProps {
  projectId: string
  categoryId?: string
  categoryName?: string
  onClose: () => void
  onUpdate?: () => void
}

type TabType = 'all' | 'unpaid' | 'paid'

export default function POListModal({
  projectId,
  categoryId,
  categoryName,
  onClose,
  onUpdate,
}: POListModalProps) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [pos, setPOs] = useState<PurchaseOrder[]>([])
  const [filteredPOs, setFilteredPOs] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('unpaid')
  const [processingId, setProcessingId] = useState<string | null>(null)
  
  useEffect(() => {
    loadPOs()
  }, [])
  
  useEffect(() => {
    filterPOs()
  }, [activeTab, pos])
  
  async function loadPOs() {
    try {
      let query = supabase
        .from('purchase_orders')
        .select('*')
        .eq('project_id', projectId)
        .order('order_date', { ascending: false })
      
      if (categoryId) {
        query = query.eq('category_id', categoryId)
      }
      
      const { data } = await query
      setPOs(data || [])
    } catch (error) {
      console.error('Error loading POs:', error)
    } finally {
      setLoading(false)
    }
  }
  
  function filterPOs() {
    if (activeTab === 'all') {
      setFilteredPOs(pos)
    } else if (activeTab === 'unpaid') {
      setFilteredPOs(pos.filter(po => po.payment_status === 'unpaid'))
    } else if (activeTab === 'paid') {
      setFilteredPOs(pos.filter(po => po.payment_status === 'paid'))
    }
  }
  
  async function handleDelete(poId: string) {
    if (!confirm('האם אתה בטוח שברצונך למחוק הזמנה זו? פעולה זו לא ניתנת לביטול.')) {
      return
    }
    
    setProcessingId(poId)
    
    try {
      const { error } = await supabase
        .from('purchase_orders')
        .delete()
        .eq('id', poId)
      
      if (error) throw error
      
      // Remove from local state
      setPOs(pos.filter(po => po.id !== poId))
      showSuccess('✅ ההזמנה נמחקה')
      
      // Invalidate React Query caches
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', projectId] })
      queryClient.invalidateQueries({ queryKey: ['financials-overview', projectId] })
      queryClient.invalidateQueries({ queryKey: ['cash-flow-v2', projectId] })
      
      // Notify parent to refresh
      if (onUpdate) onUpdate()
      
    } catch (error) {
      console.error('Error deleting PO:', error)
      showError('שגיאה במחיקת ההזמנה')
    } finally {
      setProcessingId(null)
    }
  }
  
  // ✨ NEW: Mark as paid - creates cash flow entry
  async function handleMarkAsPaid(po: PurchaseOrder) {
    if (!confirm(`האם לסמן הזמנה זו כשולמה?\n\nזה יצור רשומת הוצאה של ₪${po.total_amount.toLocaleString()} בתזרים המזומנים.`)) {
      return
    }
    
    setProcessingId(po.id)
    
    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Step 1: Create cash flow entry
      const { error: cashFlowError } = await supabase
        .from('cash_flow_v2')
        .insert({
          project_id: po.project_id,
          category_id: po.category_id,
          type: 'expense',
          amount: po.total_amount,
          description: `תשלום עבור הזמנה: ${po.supplier_name}${po.description ? ' - ' + po.description : ''}${po.po_number ? ' (PO: ' + po.po_number + ')' : ''}`,
          date: today,
          status: 'paid',
          notes: `נוצר אוטומטית מהזמנת רכש #${po.po_number || po.id.slice(0, 8)}`,
        })
      
      if (cashFlowError) throw cashFlowError
      
      // Step 2: Update PO status
      const { error: poError } = await supabase
        .from('purchase_orders')
        .update({
          payment_status: 'paid',
          paid_amount: po.total_amount,
          payment_date: today,
        })
        .eq('id', po.id)
      
      if (poError) throw poError
      
      // Reload
      await loadPOs()
      showSuccess('✅ ההזמנה סומנה כשולמה')
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', projectId] })
      queryClient.invalidateQueries({ queryKey: ['financials-overview', projectId] })
      queryClient.invalidateQueries({ queryKey: ['cash-flow-v2', projectId] })
      if (onUpdate) onUpdate()
      
    } catch (error) {
      console.error('Error marking as paid:', error)
      showError('שגיאה בסימון ההזמנה כשולמה')
    } finally {
      setProcessingId(null)
    }
  }
  
  // ✨ NEW: Undo paid status - removes cash flow entry
  async function handleUndoPaid(po: PurchaseOrder) {
    if (!confirm('האם לבטל את סטטוס "שולם"?\n\nזה ימחק את רשומת ההוצאה מתזרים המזומנים.')) {
      return
    }
    
    setProcessingId(po.id)
    
    try {
      // Step 1: Find and delete the cash flow entry created by this PO
      const { error: deleteError } = await supabase
        .from('cash_flow_v2')
        .delete()
        .eq('project_id', po.project_id)
        .eq('category_id', po.category_id)
        .eq('amount', po.total_amount)
        .eq('type', 'expense')
        .ilike('notes', `%${po.id.slice(0, 8)}%`)
      
      if (deleteError) throw deleteError
      
      // Step 2: Update PO back to unpaid
      const { error: poError } = await supabase
        .from('purchase_orders')
        .update({
          payment_status: 'unpaid',
          paid_amount: 0,
          payment_date: null,
          payment_method: null,
          payment_reference: null,
        })
        .eq('id', po.id)
      
      if (poError) throw poError
      
      // Reload
      await loadPOs()
      showSuccess('↩️ סטטוס התשלום בוטל')
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', projectId] })
      queryClient.invalidateQueries({ queryKey: ['financials-overview', projectId] })
      queryClient.invalidateQueries({ queryKey: ['cash-flow-v2', projectId] })
      if (onUpdate) onUpdate()
      
    } catch (error) {
      console.error('Error undoing paid status:', error)
      showError('שגיאה בביטול סטטוס התשלום')
    } finally {
      setProcessingId(null)
    }
  }
  
  // ✨ Mark as delivered
  async function handleMarkAsDelivered(po: PurchaseOrder) {
    setProcessingId(po.id)
    
    try {
      const { error } = await supabase
        .from('purchase_orders')
        .update({
          delivery_status: 'delivered',
          actual_delivery_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', po.id)
      
      if (error) throw error
      
      // Reload
      await loadPOs()
      showSuccess('✅ ההזמנה סומנה כסופקה')
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', projectId] })
      queryClient.invalidateQueries({ queryKey: ['financials-overview', projectId] })
      if (onUpdate) onUpdate()
      
    } catch (error) {
      console.error('Error updating delivery status:', error)
      showError('שגיאה בעדכון סטטוס המשלוח')
    } finally {
      setProcessingId(null)
    }
  }
  
  // ✨ NEW: Undo delivered status
  async function handleUndoDelivered(po: PurchaseOrder) {
    setProcessingId(po.id)
    
    try {
      const { error } = await supabase
        .from('purchase_orders')
        .update({
          delivery_status: 'pending',
          actual_delivery_date: null,
        })
        .eq('id', po.id)
      
      if (error) throw error
      
      // Reload
      await loadPOs()
      showSuccess('↩️ סטטוס המשלוח בוטל')
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', projectId] })
      queryClient.invalidateQueries({ queryKey: ['financials-overview', projectId] })
      if (onUpdate) onUpdate()
      
    } catch (error) {
      console.error('Error undoing delivery status:', error)
      showError('שגיאה בביטול סטטוס המשלוח')
    } finally {
      setProcessingId(null)
    }
  }
  
  function getCommittedAmount(po: PurchaseOrder): number {
    return po.total_amount - po.paid_amount
  }
  
  // Count for badges
  const unpaidCount = pos.filter(po => po.payment_status === 'unpaid').length
  const paidCount = pos.filter(po => po.payment_status === 'paid').length
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      fontFamily: 'Heebo, sans-serif',
      direction: 'rtl',
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '1000px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto',
      }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '700',
            margin: '0 0 8px 0',
            color: '#1e293b',
          }}>
            📋 הזמנות רכש
          </h2>
          {categoryName && (
            <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
              {categoryName}
            </p>
          )}
        </div>
        
        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          borderBottom: '2px solid #E5E7EB',
          paddingBottom: '8px',
        }}>
          <button
            onClick={() => setActiveTab('unpaid')}
            style={{
              padding: '10px 20px',
              backgroundColor: activeTab === 'unpaid' ? '#FEF3C7' : 'transparent',
              border: activeTab === 'unpaid' ? '2px solid #F59E0B' : '2px solid transparent',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              fontFamily: 'Heebo, sans-serif',
              color: activeTab === 'unpaid' ? '#92400E' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            ⏳ פתוחים
            {unpaidCount > 0 && (
              <span style={{
                padding: '2px 8px',
                backgroundColor: '#F59E0B',
                color: 'white',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '700',
              }}>
                {unpaidCount}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('paid')}
            style={{
              padding: '10px 20px',
              backgroundColor: activeTab === 'paid' ? '#ECFDF5' : 'transparent',
              border: activeTab === 'paid' ? '2px solid #10B981' : '2px solid transparent',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              fontFamily: 'Heebo, sans-serif',
              color: activeTab === 'paid' ? '#065F46' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            ✅ שולמו
            {paidCount > 0 && (
              <span style={{
                padding: '2px 8px',
                backgroundColor: '#10B981',
                color: 'white',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '700',
              }}>
                {paidCount}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('all')}
            style={{
              padding: '10px 20px',
              backgroundColor: activeTab === 'all' ? '#EFF6FF' : 'transparent',
              border: activeTab === 'all' ? '2px solid #3B82F6' : '2px solid transparent',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              fontFamily: 'Heebo, sans-serif',
              color: activeTab === 'all' ? '#1E40AF' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            📊 הכל
            <span style={{
              padding: '2px 8px',
              backgroundColor: '#3B82F6',
              color: 'white',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '700',
            }}>
              {pos.length}
            </span>
          </button>
        </div>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            טוען...
          </div>
        ) : filteredPOs.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            backgroundColor: '#F8FAFC',
            borderRadius: '12px',
            color: '#64748b',
          }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '16px' }}>
              {activeTab === 'unpaid' && 'אין הזמנות רכש פתוחות'}
              {activeTab === 'paid' && 'אין הזמנות ששולמו'}
              {activeTab === 'all' && 'אין הזמנות רכש'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredPOs.map(po => {
              const status = getPOComprehensiveStatus(po)
              const isProcessing = processingId === po.id
              
              return (
                <div key={po.id} style={{
                  padding: '20px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '12px',
                  border: '2px solid #E5E7EB',
                  opacity: isProcessing ? 0.5 : 1,
                  pointerEvents: isProcessing ? 'none' : 'auto',
                }}>
                  {/* Header Row */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '12px',
                  }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{
                        margin: '0 0 4px 0',
                        fontSize: '18px',
                        fontWeight: '700',
                        color: '#1e293b',
                      }}>
                        {po.supplier_name}
                      </h4>
                      {po.description && (
                        <p style={{
                          margin: '0 0 8px 0',
                          fontSize: '14px',
                          color: '#64748b',
                        }}>
                          {po.description}
                        </p>
                      )}
                      {po.po_number && (
                        <p style={{
                          margin: 0,
                          fontSize: '12px',
                          color: '#94A3B8',
                        }}>
                          מס׳ הזמנה: {po.po_number}
                        </p>
                      )}
                    </div>
                    
                    {/* Status Badge */}
                    <div style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      backgroundColor: status.color + '20',
                      color: status.color,
                      fontSize: '13px',
                      fontWeight: '700',
                      whiteSpace: 'nowrap',
                    }}>
                      {status.label}
                    </div>
                  </div>
                  
                  {/* Amount Info */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '16px',
                    marginBottom: '16px',
                    paddingBottom: '16px',
                    borderBottom: '1px solid #E5E7EB',
                  }}>
                    <div>
                      <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b' }}>
                        סכום כולל
                      </p>
                      <p style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>
                        ₪{po.total_amount.toLocaleString()}
                      </p>
                    </div>
                    
                    <div>
                      <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b' }}>
                        שולם
                      </p>
                      <p style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#10B981' }}>
                        ₪{po.paid_amount.toLocaleString()}
                      </p>
                    </div>
                    
                    <div>
                      <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b' }}>
                        {po.payment_status === 'unpaid' ? 'מחויב' : 'יתרה'}
                      </p>
                      <p style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: po.payment_status === 'unpaid' ? '#F59E0B' : '#64748b' }}>
                        ₪{getCommittedAmount(po).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  {/* Delivery & Payment Status */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '16px',
                    marginBottom: '16px',
                  }}>
                    {/* Delivery Status */}
                    <div style={{
                      padding: '12px',
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      border: '1px solid #E5E7EB',
                    }}>
                      <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                        📦 סטטוס משלוח
                      </p>
                      <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                        {getDeliveryStatusLabel(po.delivery_status)}
                      </p>
                      {po.delivery_status === 'pending' && po.expected_delivery_date && (
                        <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                          צפוי: {new Date(po.expected_delivery_date).toLocaleDateString('he-IL')}
                        </p>
                      )}
                      {po.delivery_status === 'delivered' && po.actual_delivery_date && (
                        <p style={{ margin: 0, fontSize: '12px', color: '#10B981' }}>
                          סופק: {new Date(po.actual_delivery_date).toLocaleDateString('he-IL')}
                        </p>
                      )}
                    </div>
                    
                    {/* Payment Status */}
                    <div style={{
                      padding: '12px',
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      border: '1px solid #E5E7EB',
                    }}>
                      <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                        💰 סטטוס תשלום
                      </p>
                      <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                        {getPaymentStatusLabel(po.payment_status)}
                      </p>
                      {po.payment_status === 'paid' && po.payment_method && (
                        <>
                          <p style={{ margin: '0 0 2px 0', fontSize: '12px', color: '#64748b' }}>
                            {getPaymentMethodIcon(po.payment_method)} {getPaymentMethodLabel(po.payment_method)}
                          </p>
                          {po.payment_date && (
                            <p style={{ margin: 0, fontSize: '12px', color: '#10B981' }}>
                              {new Date(po.payment_date).toLocaleDateString('he-IL')}
                            </p>
                          )}
                          {po.payment_reference && (
                            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#94A3B8' }}>
                              אסמכתא: {po.payment_reference}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Order Date & Notes */}
                  <div style={{ 
                    marginBottom: '16px', 
                    paddingBottom: '16px', 
                    borderBottom: '1px solid #E5E7EB' 
                  }}>
                    <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8' }}>
                      📅 הוזמן ב: {new Date(po.order_date).toLocaleDateString('he-IL')}
                    </p>
                    {po.notes && (
                      <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>
                        💬 {po.notes}
                      </p>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '8px',
                  }}>
                    {/* Delivery Actions */}
                    {po.delivery_status === 'pending' ? (
                      <button
                        onClick={() => handleMarkAsDelivered(po)}
                        disabled={isProcessing}
                        style={{
                          padding: '10px',
                          backgroundColor: '#ECFDF5',
                          border: '2px solid #10B981',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: isProcessing ? 'not-allowed' : 'pointer',
                          fontFamily: 'Heebo, sans-serif',
                          color: '#065F46',
                        }}
                      >
                        ✅ סופק
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUndoDelivered(po)}
                        disabled={isProcessing}
                        style={{
                          padding: '10px',
                          backgroundColor: '#FEF3C7',
                          border: '2px solid #F59E0B',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: isProcessing ? 'not-allowed' : 'pointer',
                          fontFamily: 'Heebo, sans-serif',
                          color: '#92400E',
                        }}
                      >
                        ↩️ ביטול סופק
                      </button>
                    )}
                    
                    {/* Payment Actions */}
                    {po.payment_status === 'unpaid' ? (
                      <button
                        onClick={() => handleMarkAsPaid(po)}
                        disabled={isProcessing}
                        style={{
                          padding: '10px',
                          backgroundColor: '#ECFDF5',
                          border: '2px solid #10B981',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: isProcessing ? 'not-allowed' : 'pointer',
                          fontFamily: 'Heebo, sans-serif',
                          color: '#065F46',
                        }}
                      >
                        💰 שולם
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUndoPaid(po)}
                        disabled={isProcessing}
                        style={{
                          padding: '10px',
                          backgroundColor: '#FEF3C7',
                          border: '2px solid #F59E0B',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: isProcessing ? 'not-allowed' : 'pointer',
                          fontFamily: 'Heebo, sans-serif',
                          color: '#92400E',
                        }}
                      >
                        ↩️ ביטול שולם
                      </button>
                    )}
                    
                    {/* Delete Button */}
                    <button
                      onClick={() => handleDelete(po.id)}
                      disabled={isProcessing}
                      style={{
                        padding: '10px',
                        backgroundColor: '#FEE2E2',
                        border: '2px solid #EF4444',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: isProcessing ? 'not-allowed' : 'pointer',
                        fontFamily: 'Heebo, sans-serif',
                        color: '#991B1B',
                      }}
                    >
                      {isProcessing ? '⏳ מעבד...' : '🗑️ מחק'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        
        {/* Info Box */}
        {activeTab === 'paid' && paidCount > 0 && (
          <div style={{
            marginTop: '16px',
            padding: '16px',
            backgroundColor: '#EFF6FF',
            border: '2px solid #3B82F6',
            borderRadius: '12px',
          }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#1E40AF' }}>
              💡 <strong>שים לב:</strong> הזמנות ששולמו יצרו רשומות הוצאה בתזרים המזומנים. אם תבטל את הסטטוס "שולם", רשומת ההוצאה תימחק.
            </p>
          </div>
        )}
        
        {/* Close Button */}
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <button
            onClick={onClose}
            style={{
              padding: '12px 32px',
              backgroundColor: 'white',
              border: '2px solid #E5E7EB',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              fontFamily: 'Heebo, sans-serif',
              color: '#64748b',
            }}
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  )
}
