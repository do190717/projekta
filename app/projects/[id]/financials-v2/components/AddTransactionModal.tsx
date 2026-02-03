'use client'

import { useState } from 'react'
import { useAddCashFlowTransaction } from '@/hooks/useFinancialsQueries'
import { useAllCategories, Category } from '@/hooks/useAllCategories'
import AddCustomCategoryModal from './AddCustomCategoryModal'
import { useToast } from '@/app/ToastContext'

interface Props {
  projectId: string
  onClose: () => void
  onAddContractItem?: (categoryId: string) => void
}

export function AddTransactionModal({ projectId, onClose, onAddContractItem }: Props) {
  const { categories: allCategories, addCategory } = useAllCategories(projectId)
  const addMutation = useAddCashFlowTransaction()
  const toast = useToast()

  const [formData, setFormData] = useState({
    type: 'expense' as 'income' | 'expense',
    amount: '',
    description: '',
    category_id: '',
    date: new Date().toISOString().split('T')[0],
    status: 'paid' as 'paid' | 'pending',
  })

  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.amount || !formData.description) {
      toast.error('נא למלא את כל השדות החובה')
      return
    }

    // ✅ קטגוריה חובה!
    if (!formData.category_id) {
      toast.error('חובה לבחור קטגוריה')
      return
    }

    try {
      await addMutation.mutateAsync({
        project_id: projectId,
        type: formData.type,
        amount: parseFloat(formData.amount),
        description: formData.description,
        category_id: formData.category_id,
        date: formData.date,
        status: formData.status,
        created_by: null,
      })
      toast.success('✅ תנועה נוספה בהצלחה!')
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'שגיאה בהוספת תנועה')
    }
  }

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

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-[#1e293b]">
              ➕ הוסף תנועה חדשה
            </h2>
            <button
              onClick={onClose}
              className="text-2xl text-[#64748b] hover:text-[#1e293b] transition-colors"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Type Selection */}
            <div>
              <label className="block text-sm font-semibold text-[#64748b] mb-3">
                סוג תנועה
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, type: 'expense' }))}
                  className={`p-4 rounded-xl border-2 font-semibold transition-all ${
                    formData.type === 'expense'
                      ? 'bg-[#FEF2F2] border-[#EF4444] text-[#DC2626]'
                      : 'bg-white border-[#E5E7EB] text-[#64748b] hover:border-[#EF4444]'
                  }`}
                >
                  📉 הוצאה
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, type: 'income' }))}
                  className={`p-4 rounded-xl border-2 font-semibold transition-all ${
                    formData.type === 'income'
                      ? 'bg-[#ECFDF5] border-[#10B981] text-[#059669]'
                      : 'bg-white border-[#E5E7EB] text-[#64748b] hover:border-[#10B981]'
                  }`}
                >
                  📈 הכנסה
                </button>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-semibold text-[#64748b] mb-2">
                סכום <span className="text-[#EF4444]">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0"
                  className="w-full px-4 py-3 border-2 border-[#E5E7EB] rounded-xl focus:border-[#6366F1] focus:outline-none transition-colors text-lg"
                  step="0.01"
                  min="0"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748b] font-semibold">
                  ₪
                </span>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-[#64748b] mb-2">
                תיאור <span className="text-[#EF4444]">*</span>
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="לדוגמה: קניית חומרי בניין"
                className="w-full px-4 py-3 border-2 border-[#E5E7EB] rounded-xl focus:border-[#6366F1] focus:outline-none transition-colors"
              />
            </div>

            {/* Category - REQUIRED! */}
            <div>
              <label className="block text-sm font-semibold text-[#64748b] mb-2">
                קטגוריה <span className="text-[#EF4444]">* חובה</span>
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-4 py-3 border-2 border-[#E5E7EB] rounded-xl focus:border-[#6366F1] focus:outline-none transition-colors bg-white"
                required
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
                <option value="add-new" style={{ fontWeight: 'bold', borderTop: '1px solid #E5E7EB' }}>
                  ➕ הוסף קטגוריה חדשה...
                </option>
              </select>
              
              {!formData.category_id && (
                <p className="text-xs text-[#EF4444] mt-2">
                  * חובה לבחור קטגוריה כדי לעקוב אחר ההוצאות בצורה מסודרת
                </p>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-semibold text-[#64748b] mb-2">
                תאריך
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-[#E5E7EB] rounded-xl focus:border-[#6366F1] focus:outline-none transition-colors"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-semibold text-[#64748b] mb-3">
                סטטוס
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, status: 'paid' }))}
                  className={`p-3 rounded-xl border-2 font-semibold transition-all ${
                    formData.status === 'paid'
                      ? 'bg-[#ECFDF5] border-[#10B981] text-[#059669]'
                      : 'bg-white border-[#E5E7EB] text-[#64748b] hover:border-[#10B981]'
                  }`}
                >
                  ✅ שולם
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, status: 'pending' }))}
                  className={`p-3 rounded-xl border-2 font-semibold transition-all ${
                    formData.status === 'pending'
                      ? 'bg-[#FEF3C7] border-[#F59E0B] text-[#92400E]'
                      : 'bg-white border-[#E5E7EB] text-[#64748b] hover:border-[#F59E0B]'
                  }`}
                >
                  ⏳ ממתין
                </button>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-white border-2 border-[#E5E7EB] text-[#64748b] rounded-xl font-semibold hover:bg-[#F8FAFC] transition-colors"
              >
                ביטול
              </button>
              <button
                type="submit"
                disabled={addMutation.isPending}
                className="flex-1 px-6 py-3 bg-[#6366F1] text-white rounded-xl font-semibold hover:bg-[#4F46E5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addMutation.isPending ? 'שומר...' : 'הוסף תנועה'}
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
    </>
  )
}
