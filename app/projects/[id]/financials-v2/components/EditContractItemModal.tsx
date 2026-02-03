'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAllCategories, Category } from '@/hooks/useAllCategories'
import { useUpdateContractItem, useDeleteContractItem, useContractItems } from '@/hooks/useFinancialsQueries'
import AddCustomCategoryModal from './AddCustomCategoryModal'
import { useToast } from '@/app/ToastContext'

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
  const { categories: allCategories, addCategory } = useAllCategories(projectId)
  const { data: contractItems = [] } = useContractItems(projectId)
  const updateMutation = useUpdateContractItem()
  const deleteMutation = useDeleteContractItem()
  const toast = useToast()

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

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)
  const [showDeleteCategoryConfirm, setShowDeleteCategoryConfirm] = useState(false)

  const handleCategoryChange = (value: string) => {
    if (value === 'add-new') {
      setShowAddCategoryModal(true)
    } else {
      setFormData(prev => ({ ...prev, category_id: value }))
    }
  }

  const handleCategoryAdded = (category: { id: string; name: string; icon: string }) => {
    addCategory(category)
    setFormData(prev => ({ ...prev, category_id: category.id }))
  }

  const getCurrentCategory = () => {
    return allCategories.find((c: Category) => c.id === formData.category_id)
  }

  const isCurrentCategoryCustom = () => {
    const category = getCurrentCategory()
    return category?.isCustom || false
  }

  async function handleDeleteCategory() {
    const category = getCurrentCategory()
    if (!category || !category.isCustom) return

    try {
      const supabase = createClient()
      
      // Step 1: Delete the contract item FIRST
      await deleteMutation.mutateAsync({ 
        id: item.id, 
        projectId 
      })

      // Step 2: Now delete the category (trigger won't block anymore)
      const { error } = await supabase
        .from('custom_categories')
        .delete()
        .eq('id', category.id)

      if (error) throw error

      toast.success(`✅ הקטגוריה "${category.name}" והסעיף נמחקו בהצלחה`)
      
      // Close modals and parent
      setShowDeleteCategoryConfirm(false)
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'שגיאה במחיקת קטגוריה')
      setShowDeleteCategoryConfirm(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.category_id || !formData.contract_amount) {
      toast.error('נא למלא את כל השדות החובה')
      return
    }

    // Make absolutely sure category_id is a string UUID
    const cleanCategoryId = typeof formData.category_id === 'string' 
      ? formData.category_id 
      : formData.category_id?.id || formData.category_id

    // בדיקה אם משנים לקטגוריה שכבר קיימת (רק אם שינו את הקטגוריה)
    if (cleanCategoryId !== item.id) {
      const existingItem = contractItems.find(
        (ci: any) => ci.category_id === cleanCategoryId && ci.id !== item.id
      )
      
      if (existingItem) {
        const category = allCategories.find((c: Category) => c.id === cleanCategoryId)
        const categoryName = category?.name || 'קטגוריה זו'
        
        toast.error(`כבר קיים סעיף חוזה עבור ${categoryName}. לא ניתן לשנות לקטגוריה קיימת.`)
        return
      }
    }

    try {
      await updateMutation.mutateAsync({
        id: item.id,
        updates: {
          category_id: cleanCategoryId,
          contract_amount: parseFloat(formData.contract_amount),
          description: formData.description || null,
        }
      })
      toast.success('✅ סעיף עודכן בהצלחה!')
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'שגיאה בעדכון סעיף')
    }
  }

  async function handleDelete() {
    try {
      await deleteMutation.mutateAsync({ 
        id: item.id, 
        projectId 
      })
      toast.success('✅ סעיף נמחק בהצלחה')
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'שגיאה במחיקת סעיף')
      setShowDeleteConfirm(false)
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
              {/* Category with Custom Option */}
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
                      .filter((cat: Category) => !cat.isCustom)
                      .map((cat: Category) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </option>
                      ))
                    }
                  </optgroup>

                  {/* Custom Categories */}
                  {allCategories.some((cat: Category) => cat.isCustom) && (
                    <optgroup label="קטגוריות מותאמות אישית">
                      {allCategories
                        .filter((cat: Category) => cat.isCustom)
                        .map((cat: Category) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.icon} {cat.name}
                          </option>
                        ))
                      }
                    </optgroup>
                  )}

                  {/* Add New Option */}
                  <option value="add-new" style={{ fontWeight: 'bold' }}>
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
                  marginBottom: isCurrentCategoryCustom() ? '12px' : '0',
                }}
              >
                🗑️ מחק סעיף
              </button>

              {/* Delete Category Button (only for custom categories) */}
              {isCurrentCategoryCustom() && (
                <button
                  type="button"
                  onClick={() => setShowDeleteCategoryConfirm(true)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#FEF3C7',
                    border: '2px solid #F59E0B',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontFamily: 'Heebo, sans-serif',
                    color: '#D97706',
                  }}
                >
                  🗑️ מחק קטגוריה "{getCurrentCategory()?.name}"
                </button>
              )}
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

      {/* Add Custom Category Modal */}
      {showAddCategoryModal && (
        <AddCustomCategoryModal
          projectId={projectId}
          onClose={() => setShowAddCategoryModal(false)}
          onAdded={handleCategoryAdded}
        />
      )}

      {/* Delete Category Confirmation Modal */}
      {showDeleteCategoryConfirm && getCurrentCategory() && (
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
            zIndex: 2000,
            fontFamily: 'Heebo, sans-serif',
            direction: 'rtl',
          }}
          onClick={() => setShowDeleteCategoryConfirm(false)}
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
                מחיקת קטגוריה
              </h2>
            </div>

            <div style={{
              padding: '20px',
              backgroundColor: '#FEF3C7',
              borderRadius: '12px',
              marginBottom: '24px',
            }}>
              <p style={{ 
                fontSize: '16px', 
                fontWeight: '600',
                color: '#D97706',
                margin: '0 0 8px 0',
              }}>
                האם אתה בטוח שברצונך למחוק?
              </p>
              <div style={{
                marginTop: '12px',
                padding: '12px',
                backgroundColor: 'white',
                borderRadius: '8px',
              }}>
                <p style={{ fontSize: '14px', margin: '0 0 4px 0', color: '#64748b' }}>
                  קטגוריה למחיקה:
                </p>
                <p style={{ fontSize: '18px', fontWeight: '600', margin: 0, color: '#1e293b' }}>
                  {getCurrentCategory()?.icon} {getCurrentCategory()?.name}
                </p>
              </div>
              <p style={{ 
                fontSize: '14px', 
                color: '#92400E',
                margin: '12px 0 0 0',
              }}>
                ⚠️ שים לב: גם הסעיף הזה במחק, כי הוא משתמש בקטגוריה הזו.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowDeleteCategoryConfirm(false)}
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
                onClick={handleDeleteCategory}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  backgroundColor: '#F59E0B',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: 'white',
                  cursor: 'pointer',
                  fontFamily: 'Heebo, sans-serif',
                }}
              >
                🗑️ כן, מחק קטגוריה
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
