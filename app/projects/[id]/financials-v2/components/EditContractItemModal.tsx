'use client'

import { useState } from 'react'
import { useCategories } from '@/hooks/useQueries'
import { useUpdateContractItem, useDeleteContractItem } from '@/hooks/useFinancialsQueries'

interface Props {
  projectId: string
  item: {
    id: string
    category_id: string | any // Can be string or object from the query
    contract_amount: number
    description: string | null
    category?: {
      id: string
      name: string
      icon: string
      color: string
    }
  }
  onClose: () => void
}

export function EditContractItemModal({ projectId, item, onClose }: Props) {
  const { data: categories = [] } = useCategories('expense')
  const updateMutation = useUpdateContractItem()
  const deleteMutation = useDeleteContractItem()

  // Extract the actual category_id (it might be an object or a string)
  const getCategoryId = () => {
    const catId = item.category_id
    
    // If it's already a string UUID, return it
    if (typeof catId === 'string') {
      return catId
    }
    
    // If it's an object with an 'id' property, extract it
    if (catId && typeof catId === 'object') {
      if ('id' in catId) {
        return catId.id
      }
      // Some queries might return the full category object directly
      if ('category_id' in catId) {
        return catId.category_id
      }
    }
    
    // Fallback - try to get from item.category if available
    if (item.category?.id) {
      return item.category.id
    }
    
    return ''
  }

  const [formData, setFormData] = useState({
    category_id: getCategoryId(),
    contract_amount: item.contract_amount.toString(),
    description: item.description || '',
  })

  const [error, setError] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!formData.category_id || !formData.contract_amount) {
      setError('נא למלא את כל השדות החובה')
      return
    }
    // Check if we have a valid item ID
    if (!item.id || item.id === "undefined") {
      setError("לא ניתן לעדכן סעיף זה. אנא סגור ופתח מחדש.")
      return
    }


    // Make absolutely sure category_id is a string UUID
    const cleanCategoryId = typeof formData.category_id === 'string' 
      ? formData.category_id 
      : formData.category_id?.id || formData.category_id

    try {
      await updateMutation.mutateAsync({
        id: item.id,
        updates: {
          category_id: cleanCategoryId,
          contract_amount: parseFloat(formData.contract_amount),
          description: formData.description || null,
        }
      })
      onClose()
    } catch (err: any) {
      setError(err.message || 'שגיאה בעדכון סעיף')
    }
  }

  async function handleDelete() {
    // Check if we have a valid item ID
    if (!item.id || item.id === "undefined") {
      setError("לא ניתן למחוק סעיף זה")
      setShowDeleteConfirm(false)
      return
    }

    try {
      await deleteMutation.mutateAsync({ 
        id: item.id, 
        projectId 
      })
      onClose()
    } catch (err: any) {
      setError(err.message || 'שגיאה במחיקת סעיף')
      setShowDeleteConfirm(false)
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
      }}>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: '700', 
          marginBottom: '24px',
          color: '#1e293b',
        }}>
          ✏️ עריכת סעיף חוזה
        </h2>

        {!showDeleteConfirm ? (
          <form onSubmit={handleSubmit}>
            {/* Category */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '600', 
                marginBottom: '8px',
                color: '#64748b',
              }}>
                קטגוריה *
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontFamily: 'Heebo, sans-serif',
                }}
              >
                <option value="">בחר קטגוריה</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
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
                סכום בחוזה *
              </label>
              <input
                type="number"
                value={formData.contract_amount}
                onChange={(e) => setFormData({ ...formData, contract_amount: e.target.value })}
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
            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '600', 
                marginBottom: '8px',
                color: '#64748b',
              }}>
                תיאור (אופציונלי)
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="לדוגמה: סיום חשמל קומה 2"
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
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
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
                disabled={updateMutation.isPending}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#6366F1',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: updateMutation.isPending ? 'not-allowed' : 'pointer',
                  fontFamily: 'Heebo, sans-serif',
                  color: 'white',
                  opacity: updateMutation.isPending ? 0.6 : 1,
                }}
              >
                {updateMutation.isPending ? 'שומר...' : '💾 שמור שינויים'}
              </button>
            </div>

            {/* Delete Button */}
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#FEE2E2',
                border: '2px solid #EF4444',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                fontFamily: 'Heebo, sans-serif',
                color: '#DC2626',
              }}
            >
              🗑️ מחק סעיף
            </button>
          </form>
        ) : (
          // Delete Confirmation
          <div>
            <div style={{
              padding: '20px',
              backgroundColor: '#FEE2E2',
              borderRadius: '12px',
              marginBottom: '24px',
            }}>
              <p style={{ 
                fontSize: '16px', 
                fontWeight: '600',
                color: '#DC2626',
                margin: '0 0 8px 0',
              }}>
                ⚠️ האם אתה בטוח?
              </p>
              <p style={{ 
                fontSize: '14px', 
                color: '#64748b',
                margin: 0,
              }}>
                פעולה זו תמחק את הסעיף לצמיתות ולא ניתן יהיה לשחזר אותו.
              </p>
              {item.category && (
                <div style={{
                  marginTop: '12px',
                  padding: '12px',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                }}>
                  <p style={{ fontSize: '14px', margin: '0 0 4px 0', color: '#64748b' }}>
                    סעיף למחיקה:
                  </p>
                  <p style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: '#1e293b' }}>
                    {item.category.icon} {item.category.name} - ₪{new Intl.NumberFormat('he-IL').format(item.contract_amount)}
                  </p>
                </div>
              )}
            </div>

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

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
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
                type="button"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#DC2626',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: deleteMutation.isPending ? 'not-allowed' : 'pointer',
                  fontFamily: 'Heebo, sans-serif',
                  color: 'white',
                  opacity: deleteMutation.isPending ? 0.6 : 1,
                }}
              >
                {deleteMutation.isPending ? 'מוחק...' : '🗑️ כן, מחק'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
