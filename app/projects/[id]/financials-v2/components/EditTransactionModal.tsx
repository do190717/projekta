'use client'

import { useState } from 'react'
import { useCategories } from '@/hooks/useQueries'
import { createClient } from '@/lib/supabase'
import { showSuccess, showError } from '@/app/utils/toast'

const supabase = createClient()

interface Props {
  projectId: string
  transaction: any
  onClose: () => void
}

export function EditTransactionModal({ projectId, transaction, onClose }: Props) {
  const { data: categories = [] } = useCategories()

  const [formData, setFormData] = useState({
    type: transaction.type as 'income' | 'expense',
    amount: String(transaction.amount),
    description: transaction.description,
    category_id: transaction.category_id || '',
    date: transaction.date.split('T')[0], // YYYY-MM-DD
    status: transaction.status as 'paid' | 'pending',
  })

  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)

    if (!formData.amount || !formData.description) {
      setError('נא למלא את כל השדות החובה')
      setSaving(false)
      return
    }

    try {
      const { error: updateError } = await supabase
        .from('cash_flow_v2')
        .update({
          type: formData.type,
          amount: parseFloat(formData.amount),
          description: formData.description,
          category_id: formData.category_id || null,
          date: formData.date,
          status: formData.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', transaction.id)

      if (updateError) throw updateError

      showSuccess('✅ התנועה עודכנה בהצלחה!')
      onClose()
      window.location.reload() // Refresh to show changes
    } catch (err: any) {
      setError(err.message || 'שגיאה בעדכון תנועה')
      showError('שגיאה בעדכון תנועה')
      setSaving(false)
    }
  }

  async function handleDelete() {
    setSaving(true)
    setError('')

    try {
      const { error: deleteError } = await supabase
        .from('cash_flow_v2')
        .delete()
        .eq('id', transaction.id)

      if (deleteError) throw deleteError

      showSuccess('✅ התנועה נמחקה בהצלחה!')
      onClose()
      window.location.reload() // Refresh to show changes
    } catch (err: any) {
      setError(err.message || 'שגיאה במחיקת תנועה')
      showError('שגיאה במחיקת תנועה')
      setSaving(false)
      setShowDeleteConfirm(false)
    }
  }

  const filteredCategories = categories.filter(cat => cat.type === formData.type)

  if (showDeleteConfirm) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] font-[Heebo,sans-serif] direction-rtl">
        <div className="bg-white rounded-2xl p-8 w-[90%] max-w-[400px] shadow-2xl">
          <h2 className="text-2xl font-bold mb-4 text-[#1e293b]">
            ⚠️ האם אתה בטוח?
          </h2>
          <p className="text-base text-[#64748b] mb-6">
            פעולה זו תמחק את התנועה לצמיתות ולא ניתן יהיה לשחזר אותה.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-[#FEE2E2] border border-[#EF4444] rounded-lg text-sm text-[#DC2626]">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={saving}
              className="flex-1 px-6 py-3 bg-white border-2 border-[#E5E7EB] rounded-xl font-semibold text-[#64748b] disabled:opacity-60"
            >
              ביטול
            </button>
            <button
              onClick={handleDelete}
              disabled={saving}
              className="flex-1 px-6 py-3 bg-[#DC2626] text-white rounded-xl font-semibold disabled:opacity-60"
            >
              {saving ? 'מוחק...' : '🗑️ כן, מחק'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] font-[Heebo,sans-serif] direction-rtl">
      <div className="bg-white rounded-2xl p-8 w-[90%] max-w-[600px] shadow-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6 text-[#1e293b]">
          ✏️ עריכת תנועה
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Type */}
          <div className="mb-5">
            <label className="block text-sm font-semibold mb-2 text-[#64748b]">
              סוג תנועה *
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, type: 'income', category_id: '' }))}
                className={`flex-1 px-6 py-3 rounded-xl text-base font-semibold transition-all ${
                  formData.type === 'income' 
                    ? 'bg-[#10B981] text-white border-2 border-[#10B981]' 
                    : 'bg-white text-[#64748b] border-2 border-[#E5E7EB]'
                }`}
              >
                📈 הכנסה
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, type: 'expense', category_id: '' }))}
                className={`flex-1 px-6 py-3 rounded-xl text-base font-semibold transition-all ${
                  formData.type === 'expense' 
                    ? 'bg-[#EF4444] text-white border-2 border-[#EF4444]' 
                    : 'bg-white text-[#64748b] border-2 border-[#E5E7EB]'
                }`}
              >
                📉 הוצאה
              </button>
            </div>
          </div>

          {/* Amount */}
          <div className="mb-5">
            <label className="block text-sm font-semibold mb-2 text-[#64748b]">
              סכום *
            </label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="לדוגמה: 5000"
              className="w-full p-3 text-base border-2 border-[#E5E7EB] rounded-xl focus:border-[#6366F1] focus:outline-none"
            />
          </div>

          {/* Description */}
          <div className="mb-5">
            <label className="block text-sm font-semibold mb-2 text-[#64748b]">
              תיאור *
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="לדוגמה: תשלום לספק"
              className="w-full p-3 text-base border-2 border-[#E5E7EB] rounded-xl focus:border-[#6366F1] focus:outline-none"
            />
          </div>

          {/* Category */}
          <div className="mb-5">
            <label className="block text-sm font-semibold mb-2 text-[#64748b]">
              קטגוריה (אופציונלי)
            </label>
            <select
              value={formData.category_id}
              onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
              className="w-full p-3 text-base border-2 border-[#E5E7EB] rounded-xl focus:border-[#6366F1] focus:outline-none bg-white"
            >
              <option value="">ללא קטגוריה</option>
              {filteredCategories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div className="mb-5">
            <label className="block text-sm font-semibold mb-2 text-[#64748b]">
              תאריך *
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              className="w-full p-3 text-base border-2 border-[#E5E7EB] rounded-xl focus:border-[#6366F1] focus:outline-none"
            />
          </div>

          {/* Status */}
          <div className="mb-5">
            <label className="block text-sm font-semibold mb-2 text-[#64748b]">
              סטטוס *
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, status: 'paid' }))}
                className={`flex-1 px-6 py-3 rounded-xl text-base font-semibold transition-all ${
                  formData.status === 'paid' 
                    ? 'bg-[#10B981] text-white border-2 border-[#10B981]' 
                    : 'bg-white text-[#64748b] border-2 border-[#E5E7EB]'
                }`}
              >
                ✅ שולם
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, status: 'pending' }))}
                className={`flex-1 px-6 py-3 rounded-xl text-base font-semibold transition-all ${
                  formData.status === 'pending' 
                    ? 'bg-[#F59E0B] text-white border-2 border-[#F59E0B]' 
                    : 'bg-white text-[#64748b] border-2 border-[#E5E7EB]'
                }`}
              >
                ⏳ ממתין
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-[#FEE2E2] border border-[#EF4444] rounded-lg text-sm text-[#DC2626]">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 mb-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-6 py-3 bg-white border-2 border-[#E5E7EB] rounded-xl font-semibold text-[#64748b] disabled:opacity-60"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-[#6366F1] text-white rounded-xl font-semibold disabled:opacity-60"
            >
              {saving ? 'שומר...' : '💾 שמור שינויים'}
            </button>
          </div>

          {/* Delete Button */}
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={saving}
            className="w-full px-6 py-3 bg-[#FEE2E2] border-2 border-[#EF4444] rounded-xl font-semibold text-[#DC2626] disabled:opacity-60"
          >
            🗑️ מחק תנועה
          </button>
        </form>
      </div>
    </div>
  )
}
