'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { showSuccess, showError } from '@/app/utils/toast'
import { createClient } from '@/lib/supabase'
import type { DeliveryStatus, PaymentStatus, PaymentMethod } from '@/types/budget'
import { PAYMENT_METHOD_LABELS, PAYMENT_METHOD_ICONS } from '@/types/budget'

interface AddPOModalProps {
  projectId: string
  categoryId?: string
  categories: Array<{ id: string; name: string; icon: string }>
  onClose: () => void
  onSuccess: () => void
}

export default function AddPOModal({
  projectId,
  categoryId,
  categories,
  onClose,
  onSuccess,
}: AddPOModalProps) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  
  const [formData, setFormData] = useState({
    category_id: categoryId || '',
    supplier_name: '',
    description: '',
    total_amount: '',
    po_number: '',
    order_date: new Date().toISOString().split('T')[0],
    notes: '',
  })
  
  // ✨ NEW: Delivery tracking
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus>('pending')
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('')
  const [actualDeliveryDate, setActualDeliveryDate] = useState('')
  
  // ✨ NEW: Payment tracking
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('unpaid')
  const [paymentDate, setPaymentDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer')
  const [paymentReference, setPaymentReference] = useState('')
  
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!formData.category_id || !formData.supplier_name || !formData.total_amount) {
      setError('אנא מלא את כל השדות החובה')
      return
    }
    
    setSaving(true)
    setError('')
    
    try {
      const { error: insertError } = await supabase
        .from('purchase_orders')
        .insert({
          project_id: projectId,
          category_id: formData.category_id,
          supplier_name: formData.supplier_name,
          description: formData.description || null,
          total_amount: parseFloat(formData.total_amount),
          paid_amount: paymentStatus === 'paid' ? parseFloat(formData.total_amount) : 0,
          po_number: formData.po_number || null,
          order_date: formData.order_date,
          notes: formData.notes || null,
          
          // Legacy status for backward compatibility
          status: paymentStatus === 'paid' ? 'paid' : 'ordered',
          
          // ✨ NEW: Delivery tracking
          delivery_status: deliveryStatus,
          expected_delivery_date: deliveryStatus === 'pending' ? expectedDeliveryDate || null : null,
          actual_delivery_date: deliveryStatus === 'delivered' ? actualDeliveryDate || null : null,
          
          // ✨ NEW: Payment tracking
          payment_status: paymentStatus,
          payment_date: paymentStatus === 'paid' ? paymentDate || null : null,
          payment_method: paymentStatus === 'paid' ? paymentMethod : null,
          payment_reference: paymentStatus === 'paid' ? paymentReference || null : null,
        })
      
      if (insertError) throw insertError
      
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', projectId] })
      queryClient.invalidateQueries({ queryKey: ['financials-overview', projectId] })
    
      showSuccess('✅ הזמנת הרכש נשמרה')
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'שגיאה בשמירת הזמנה')
      showError('שגיאה בשמירת הזמנה')
    } finally {
      setSaving(false)
    }
  }
  
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
        maxWidth: '700px',
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
            📋 הזמנת רכש חדשה
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            תיעוד כסף מחויב שטרם שולם
          </p>
        </div>
        
        {error && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#FEE2E2',
            border: '2px solid #EF4444',
            borderRadius: '8px',
            marginBottom: '20px',
            color: '#991B1B',
            fontSize: '14px',
          }}>
            ⚠️ {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {/* Basic Info */}
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '20px',
          }}>
            {/* Category */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#475569',
              }}>
                קטגוריה *
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                disabled={!!categoryId}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '2px solid #E5E7EB',
                  fontSize: '15px',
                  fontFamily: 'Heebo, sans-serif',
                  backgroundColor: categoryId ? '#F3F4F6' : 'white',
                }}
              >
                <option value="">בחר קטגוריה</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Supplier */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#475569',
              }}>
                שם הספק *
              </label>
              <input
                type="text"
                value={formData.supplier_name}
                onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                placeholder="לדוגמה: ספק חשמל ABC"
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '2px solid #E5E7EB',
                  fontSize: '15px',
                  fontFamily: 'Heebo, sans-serif',
                }}
              />
            </div>
            
            {/* Amount */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#475569',
              }}>
                סכום כולל *
              </label>
              <input
                type="number"
                value={formData.total_amount}
                onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                placeholder="0"
                min="0"
                step="0.01"
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '2px solid #E5E7EB',
                  fontSize: '15px',
                  fontFamily: 'Heebo, sans-serif',
                }}
              />
            </div>
          </div>
          
          {/* Description */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#475569',
            }}>
              תיאור
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="פרטים על ההזמנה..."
              rows={2}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '2px solid #E5E7EB',
                fontSize: '15px',
                fontFamily: 'Heebo, sans-serif',
                resize: 'vertical',
              }}
            />
          </div>

          {/* PO Number & Order Date */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '24px',
          }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#475569',
              }}>
                מספר הזמנה (אופציונלי)
              </label>
              <input
                type="text"
                value={formData.po_number}
                onChange={(e) => setFormData({ ...formData, po_number: e.target.value })}
                placeholder="PO-12345"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '2px solid #E5E7EB',
                  fontSize: '15px',
                  fontFamily: 'Heebo, sans-serif',
                }}
              />
            </div>
            
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#475569',
              }}>
                תאריך הזמנה
              </label>
              <input
                type="date"
                value={formData.order_date}
                onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '2px solid #E5E7EB',
                  fontSize: '15px',
                  fontFamily: 'Heebo, sans-serif',
                }}
              />
            </div>
          </div>

          {/* ✨ NEW: Delivery Status Section */}
          <div style={{
            padding: '20px',
            backgroundColor: '#F8FAFC',
            borderRadius: '12px',
            marginBottom: '20px',
            border: '2px solid #E5E7EB',
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '700',
              margin: '0 0 16px 0',
              color: '#1e293b',
            }}>
              📦 סטטוס משלוח
            </h3>
            
            {/* Radio buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                padding: '12px',
                backgroundColor: deliveryStatus === 'pending' ? '#EFF6FF' : 'white',
                borderRadius: '8px',
                border: `2px solid ${deliveryStatus === 'pending' ? '#3B82F6' : '#E5E7EB'}`,
              }}>
                <input
                  type="radio"
                  name="delivery_status"
                  checked={deliveryStatus === 'pending'}
                  onChange={() => setDeliveryStatus('pending')}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ fontSize: '15px', fontWeight: '600' }}>
                  ⏳ ממתין לאספקה
                </span>
              </label>
              
              {deliveryStatus === 'pending' && (
                <div style={{ marginRight: '32px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#64748b',
                  }}>
                    תאריך אספקה צפוי
                  </label>
                  <input
                    type="date"
                    value={expectedDeliveryDate}
                    onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '2px solid #E5E7EB',
                      fontSize: '14px',
                      fontFamily: 'Heebo, sans-serif',
                    }}
                  />
                </div>
              )}
              
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                padding: '12px',
                backgroundColor: deliveryStatus === 'delivered' ? '#ECFDF5' : 'white',
                borderRadius: '8px',
                border: `2px solid ${deliveryStatus === 'delivered' ? '#10B981' : '#E5E7EB'}`,
              }}>
                <input
                  type="radio"
                  name="delivery_status"
                  checked={deliveryStatus === 'delivered'}
                  onChange={() => setDeliveryStatus('delivered')}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ fontSize: '15px', fontWeight: '600' }}>
                  ✅ כבר סופק
                </span>
              </label>
              
              {deliveryStatus === 'delivered' && (
                <div style={{ marginRight: '32px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#64748b',
                  }}>
                    תאריך אספקה בפועל
                  </label>
                  <input
                    type="date"
                    value={actualDeliveryDate}
                    onChange={(e) => setActualDeliveryDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '2px solid #E5E7EB',
                      fontSize: '14px',
                      fontFamily: 'Heebo, sans-serif',
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ✨ NEW: Payment Status Section */}
          <div style={{
            padding: '20px',
            backgroundColor: '#F8FAFC',
            borderRadius: '12px',
            marginBottom: '20px',
            border: '2px solid #E5E7EB',
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '700',
              margin: '0 0 16px 0',
              color: '#1e293b',
            }}>
              💰 סטטוס תשלום
            </h3>
            
            {/* Radio buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                padding: '12px',
                backgroundColor: paymentStatus === 'unpaid' ? '#FEF3C7' : 'white',
                borderRadius: '8px',
                border: `2px solid ${paymentStatus === 'unpaid' ? '#F59E0B' : '#E5E7EB'}`,
              }}>
                <input
                  type="radio"
                  name="payment_status"
                  checked={paymentStatus === 'unpaid'}
                  onChange={() => setPaymentStatus('unpaid')}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ fontSize: '15px', fontWeight: '600' }}>
                  ⏳ ממתין לתשלום
                </span>
              </label>
              
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                padding: '12px',
                backgroundColor: paymentStatus === 'paid' ? '#ECFDF5' : 'white',
                borderRadius: '8px',
                border: `2px solid ${paymentStatus === 'paid' ? '#10B981' : '#E5E7EB'}`,
              }}>
                <input
                  type="radio"
                  name="payment_status"
                  checked={paymentStatus === 'paid'}
                  onChange={() => setPaymentStatus('paid')}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ fontSize: '15px', fontWeight: '600' }}>
                  ✅ שולם
                </span>
              </label>
              
              {paymentStatus === 'paid' && (
                <div style={{ 
                  marginRight: '32px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}>
                  {/* Payment Date */}
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '6px',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#64748b',
                    }}>
                      תאריך תשלום
                    </label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '8px',
                        border: '2px solid #E5E7EB',
                        fontSize: '14px',
                        fontFamily: 'Heebo, sans-serif',
                      }}
                    />
                  </div>
                  
                  {/* Payment Method */}
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '6px',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#64748b',
                    }}>
                      אמצעי תשלום
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '8px',
                        border: '2px solid #E5E7EB',
                        fontSize: '14px',
                        fontFamily: 'Heebo, sans-serif',
                      }}
                    >
                      {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {PAYMENT_METHOD_ICONS[value as PaymentMethod]} {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Payment Reference */}
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '6px',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#64748b',
                    }}>
                      {paymentMethod === 'check' ? 'מספר צ׳ק' : 'אסמכתא / הערה'}
                    </label>
                    <input
                      type="text"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder={paymentMethod === 'check' ? '123456' : 'מספר אסמכתא...'}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '8px',
                        border: '2px solid #E5E7EB',
                        fontSize: '14px',
                        fontFamily: 'Heebo, sans-serif',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#475569',
            }}>
              הערות נוספות
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="הערות נוספות..."
              rows={2}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '2px solid #E5E7EB',
                fontSize: '15px',
                fontFamily: 'Heebo, sans-serif',
                resize: 'vertical',
              }}
            />
          </div>
          
          {/* Actions */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                padding: '12px 24px',
                backgroundColor: 'white',
                border: '2px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontFamily: 'Heebo, sans-serif',
                color: '#64748b',
              }}
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '12px 24px',
                backgroundColor: saving ? '#9CA3AF' : '#6366F1',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontFamily: 'Heebo, sans-serif',
              }}
            >
              {saving ? '⏳ שומר...' : '💾 שמור הזמנה'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
