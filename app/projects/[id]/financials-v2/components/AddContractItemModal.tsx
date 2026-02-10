'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useProjectCategories, ProjectCategory } from '@/hooks/useProjectCategories'
import { useAddContractItem, useContractItems } from '@/hooks/useFinancialsQueries'
import AddCustomCategoryModal from './AddCustomCategoryModal'
import { showSuccess, showError } from '@/app/utils/toast'

interface Props {
  projectId: string
  onClose: () => void
  onEditExisting?: (item: any) => void
  preSelectedCategoryId?: string | null
}

export function AddContractItemModal({ projectId, onClose, onEditExisting, preSelectedCategoryId }: Props) {
  const { data: allCategories = [] } = useProjectCategories(projectId)
  const { data: existingItems = [] } = useContractItems(projectId)
  const addMutation = useAddContractItem()

  const [formData, setFormData] = useState({
    category_id: preSelectedCategoryId || '',
    contract_amount: '',
    description: '',
  })

  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)

  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [duplicateItem, setDuplicateItem] = useState<any>(null)

  const handleCategoryChange = (value: string) => {
    if (value === 'add-new') {
      setShowAddCategoryModal(true)
    } else {
      setFormData(prev => ({ ...prev, category_id: value }))
    }
  }

  const handleCategoryAdded = (category: { id: string; name: string; icon: string }) => {
    setFormData(prev => ({ ...prev, category_id: category.id }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.category_id || !formData.contract_amount) {
      showError('נא למלא את כל השדות החובה')
      return
    }

    // בדיקה אם כבר קיים סעיף באותה קטגוריה
    const existingItem = existingItems.find((item: any) => item.category_id === formData.category_id)
    
    if (existingItem && onEditExisting) {
      setDuplicateItem(existingItem)
      setShowDuplicateModal(true)
      return
    }

    try {
      await addMutation.mutateAsync({
        project_id: projectId,
        category_id: formData.category_id,
        contract_amount: parseFloat(formData.contract_amount),
        description: formData.description || null,
      })

      // Step 2: If this was for uncategorized expenses, update them
      if (preSelectedCategoryId === 'no-category') {
        const supabase = createClient()
        const { error: updateError } = await supabase
          .from('cash_flow_v2')
          .update({ category_id: formData.category_id })
          .eq('project_id', projectId)
          .is('category_id', null)

        if (updateError) {
          console.error('Error updating uncategorized transactions:', updateError)
        }
      }

      showSuccess('✅ סעיף חוזה נוסף בהצלחה!')
      onClose()
    } catch (err: any) {
      showError(err.message || 'שגיאה בהוספת סעיף')
    }
  }

  const handleEditExisting = async () => {
    if (duplicateItem && onEditExisting) {
      // If this was from uncategorized expenses, update them too
      if (preSelectedCategoryId === 'no-category') {
        const supabase = createClient()
        const { error: updateError } = await supabase
          .from('cash_flow_v2')
          .update({ category_id: duplicateItem.category_id })
          .eq('project_id', projectId)
          .is('category_id', null)

        if (updateError) {
          console.error('Error updating uncategorized transactions:', updateError)
        }
      }

      onEditExisting(duplicateItem)
      setShowDuplicateModal(false)
    }
  }

  return (
    <>
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
            📋 הוסף סעיף חוזה
          </h2>

          <form onSubmit={handleSubmit}>
            {/* Category with Add Custom Option */}
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
                onChange={(e) => handleCategoryChange(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontFamily: 'Heebo, sans-serif',
                  backgroundColor: 'white',
                }}
              >
                <option value="">בחר קטגוריה...</option>
                
                {/* System Categories */}
                <optgroup label="קטגוריות מערכת">
                  {allCategories
                    .filter((cat: ProjectCategory) => cat.is_system)
                    .map((cat: ProjectCategory) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))
                  }
                </optgroup>

                {/* Custom Categories */}
                {allCategories.some((cat: ProjectCategory) => !cat.is_system) && (
                  <optgroup label="קטגוריות מותאמות אישית">
                    {allCategories
                      .filter((cat: ProjectCategory) => !cat.is_system)
                      .map((cat: ProjectCategory) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </option>
                      ))
                    }
                  </optgroup>
                )}

                {/* Add New Option */}
                <option value="add-new" style={{ fontWeight: 'bold', borderTop: '1px solid #E5E7EB' }}>
                  ➕ הוסף קטגוריה חדשה...
                </option>
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
                placeholder="לדוגמה: כולל עבודות עפר"
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
                {addMutation.isPending ? 'שומר...' : '💾 הוסף סעיף'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Add Custom Category Modal */}
      {showAddCategoryModal && (
        <AddCustomCategoryModal
          projectId={projectId}
          onClose={() => setShowAddCategoryModal(false)}
          onAdded={handleCategoryAdded}
        />
      )}

      {/* Duplicate Category Modal */}
      {showDuplicateModal && duplicateItem && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            fontFamily: 'Heebo, sans-serif',
            direction: 'rtl',
          }}
          onClick={() => setShowDuplicateModal(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 25px 70px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              marginBottom: '24px' 
            }}>
              <span style={{ fontSize: '32px' }}>⚠️</span>
              <h2 style={{ 
                fontSize: '24px', 
                fontWeight: '700', 
                color: '#1e293b',
                margin: 0,
              }}>
                סעיף כבר קיים
              </h2>
            </div>

            <div style={{
              padding: '20px',
              backgroundColor: '#FEF2F2',
              borderRadius: '12px',
              marginBottom: '24px',
            }}>
              <p style={{ 
                fontSize: '16px', 
                margin: '0 0 16px 0',
                color: '#1e293b',
              }}>
                כבר קיים סעיף חוזה עבור{' '}
                <strong>
                  {allCategories.find((c: ProjectCategory) => c.id === formData.category_id)?.name || 'קטגוריה זו'}
                </strong>
              </p>
              
              <div style={{
                padding: '16px',
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '2px solid #EF4444',
              }}>
                <p style={{ 
                  fontSize: '14px', 
                  color: '#64748b',
                  margin: '0 0 8px 0',
                }}>
                  סכום נוכחי:
                </p>
                <p style={{ 
                  fontSize: '24px', 
                  fontWeight: '700',
                  color: '#DC2626',
                  margin: 0,
                }}>
                  ₪{new Intl.NumberFormat('he-IL').format(duplicateItem.contract_amount)}
                </p>
              </div>

              <p style={{ 
                fontSize: '14px', 
                color: '#64748b',
                margin: '16px 0 0 0',
              }}>
                האם תרצה לערוך את הסעיף הקיים במקום?
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowDuplicateModal(false)}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  backgroundColor: 'white',
                  border: '2px solid #E5E7EB',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: '#64748b',
                  cursor: 'pointer',
                  fontFamily: 'Heebo, sans-serif',
                }}
              >
                ביטול
              </button>
              <button
                onClick={handleEditExisting}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  backgroundColor: '#6366F1',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: 'white',
                  cursor: 'pointer',
                  fontFamily: 'Heebo, sans-serif',
                }}
              >
                ✏️ ערוך סעיף קיים
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
