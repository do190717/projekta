'use client'

import { useState } from 'react'
import { useCategories } from '@/hooks/useQueries'
import { useAddCashFlowTransaction } from '@/hooks/useFinancialsQueries'

interface Props {
  projectId: string
  onClose: () => void
}

export function AddTransactionModal({ projectId, onClose }: Props) {
  const { data: categories = [] } = useCategories()
  const addMutation = useAddCashFlowTransaction()

  const [formData, setFormData] = useState({
    type: 'expense' as 'income' | 'expense',
    amount: '',
    description: '',
    category_id: '',
    date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    status: 'paid' as 'paid' | 'pending',
  })

  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!formData.amount || !formData.description) {
      setError('נא למלא את כל השדות החובה')
      return
    }

    try {
      await addMutation.mutateAsync({
        project_id: projectId,
        type: formData.type,
        amount: parseFloat(formData.amount),
        description: formData.description,
        category_id: formData.category_id || null,
        date: formData.date,
        status: formData.status,
        created_by: null, // TODO: add user ID when auth is ready
      })
      onClose()
    } catch (err: any) {
      setError(err.message || 'שגיאה בהוספת תנועה')
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
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
        width: '90%',
        maxWidth: '500px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: '700', 
          marginBottom: '24px',
          color: '#1e293b',
        }}>
          💸 הוסף תנועה כספית
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Type Selection */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '600', 
              marginBottom: '8px',
              color: '#64748b',
            }}>
              סוג תנועה *
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'expense' })}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: formData.type === 'expense' ? '#FEE2E2' : 'white',
                  border: `2px solid ${formData.type === 'expense' ? '#EF4444' : '#E5E7EB'}`,
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontFamily: 'Heebo, sans-serif',
                  color: formData.type === 'expense' ? '#EF4444' : '#64748b',
                }}
              >
                📉 הוצאה
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'income' })}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: formData.type === 'income' ? '#D1FAE5' : 'white',
                  border: `2px solid ${formData.type === 'income' ? '#10B981' : '#E5E7EB'}`,
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontFamily: 'Heebo, sans-serif',
                  color: formData.type === 'income' ? '#10B981' : '#64748b',
                }}
              >
                📈 הכנסה
              </button>
            </div>
          </div>

          {/* Amount */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '600', 
              marginBottom: '8px',
              color: '#64748b',
            }}>
              סכום *
            </label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0"
              required
              min="0"
              step="0.01"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '15px',
                fontFamily: 'Heebo, sans-serif',
              }}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '600', 
              marginBottom: '8px',
              color: '#64748b',
            }}>
              תיאור *
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="לדוגמה: תשלום לקבלן - סיום חשמל"
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '15px',
                fontFamily: 'Heebo, sans-serif',
              }}
            />
          </div>

          {/* Category */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '600', 
              marginBottom: '8px',
              color: '#64748b',
            }}>
              קטגוריה (אופציונלי)
            </label>
            <select
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '15px',
                fontFamily: 'Heebo, sans-serif',
              }}
            >
              <option value="">ללא קטגוריה</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '600', 
              marginBottom: '8px',
              color: '#64748b',
            }}>
              תאריך *
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '15px',
                fontFamily: 'Heebo, sans-serif',
              }}
            />
          </div>

          {/* Status */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '600', 
              marginBottom: '8px',
              color: '#64748b',
            }}>
              סטטוס תשלום *
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, status: 'paid' })}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: formData.status === 'paid' ? '#D1FAE5' : 'white',
                  border: `2px solid ${formData.status === 'paid' ? '#10B981' : '#E5E7EB'}`,
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontFamily: 'Heebo, sans-serif',
                  color: formData.status === 'paid' ? '#10B981' : '#64748b',
                }}
              >
                ✅ שולם
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, status: 'pending' })}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: formData.status === 'pending' ? '#FEF3C7' : 'white',
                  border: `2px solid ${formData.status === 'pending' ? '#F59E0B' : '#E5E7EB'}`,
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontFamily: 'Heebo, sans-serif',
                  color: formData.status === 'pending' ? '#F59E0B' : '#64748b',
                }}
              >
                ⏳ ממתין
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '12px',
              backgroundColor: '#FEE2E2',
              color: '#DC2626',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '14px',
            }}>
              {error}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px',
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
              ביטול
            </button>
            <button
              type="submit"
              disabled={addMutation.isPending}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: '#6366F1',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: addMutation.isPending ? 'not-allowed' : 'pointer',
                fontFamily: 'Heebo, sans-serif',
                color: 'white',
                opacity: addMutation.isPending ? 0.6 : 1,
              }}
            >
              {addMutation.isPending ? 'שומר...' : '💾 הוסף תנועה'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
