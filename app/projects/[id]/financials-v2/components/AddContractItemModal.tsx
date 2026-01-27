'use client'

import { useState } from 'react'
import { useCategories } from '@/hooks/useQueries'
import { useAddContractItem, useContractItems } from '@/hooks/useFinancialsQueries'

interface Props {
  projectId: string
  onClose: () => void
  onEditExisting?: (item: any) => void
}

export function AddContractItemModal({ projectId, onClose, onEditExisting }: Props) {
  const { data: categories = [] } = useCategories('expense')
  const { data: existingItems = [] } = useContractItems(projectId)
  const addMutation = useAddContractItem()

  const [formData, setFormData] = useState({
    category_id: '',
    contract_amount: '',
    description: '',
  })

  const [error, setError] = useState('')
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState<{
    item: any
    categoryName: string
  } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!formData.category_id || !formData.contract_amount) {
      setError('נא למלא את כל השדות החובה')
      return
    }

    // בדיקה אם כבר קיים סעיף באותה קטגוריה
    const existingItem = existingItems.find(item => item.category_id === formData.category_id)
    
    if (existingItem && onEditExisting) {
      const categoryName = categories.find(c => c.id === formData.category_id)?.name || 'קטגוריה זו'
      setShowDuplicateConfirm({
        item: existingItem,
        categoryName
      })
      return
    }

    try {
      await addMutation.mutateAsync({
        project_id: projectId,
        category_id: formData.category_id,
        contract_amount: parseFloat(formData.contract_amount),
        description: formData.description || null,
      })
      onClose()
    } catch (err: any) {
      setError(err.message || 'שגיאה בהוספת סעיף')
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
          ➕ הוסף סעיף חוזה
        </h2>

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
              {addMutation.isPending ? 'שומר...' : '✅ הוסף'}
            </button>
          </div>
        </form>
      </div>

      {/* Duplicate Category Confirmation Modal */}
      {showDuplicateConfirm && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '32px',
          width: '90%',
          maxWidth: '450px',
          boxShadow: '0 25px 70px rgba(0,0,0,0.4)',
          zIndex: 10,
        }}>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '700',
            marginBottom: '16px',
            color: '#F59E0B',
          }}>
            ⚠️ קטגוריה כבר קיימת
          </h3>
          <p style={{
            fontSize: '15px',
            color: '#64748b',
            marginBottom: '20px',
            lineHeight: '1.6',
          }}>
            כבר קיים סעיף חוזה עבור <strong>{showDuplicateConfirm.categoryName}</strong>
          </p>
          <p style={{
            fontSize: '14px',
            color: '#64748b',
            marginBottom: '20px',
            padding: '12px',
            backgroundColor: '#FEF3C7',
            borderRadius: '8px',
          }}>
            סכום נוכחי: <strong>₪{new Intl.NumberFormat('he-IL').format(showDuplicateConfirm.item.contract_amount)}</strong>
          </p>
          <p style={{
            fontSize: '15px',
            color: '#1e293b',
            marginBottom: '24px',
            fontWeight: '600',
          }}>
            האם תרצה לערוך את הסעיף הקיים במקום?
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setShowDuplicateConfirm(null)}
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
              onClick={() => {
                if (onEditExisting) {
                  onEditExisting(showDuplicateConfirm.item)
                }
                setShowDuplicateConfirm(null)
                onClose()
              }}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: '#F59E0B',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                fontFamily: 'Heebo, sans-serif',
                color: 'white',
              }}
            >
              ✏️ ערוך סעיף קיים
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
