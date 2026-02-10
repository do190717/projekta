'use client'

import { useState, useEffect } from 'react'
import { useProjectCategories } from '@/hooks/useProjectCategories'
import { useAddContractItem, useContractItems } from '@/hooks/useFinancialsQueries'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

interface Props {
  projectId: string
  currentContractValue?: number
  onClose: () => void
  onComplete: () => void
}

type Step = 1 | 2 | 3

interface CategoryItem {
  category_id: string
  category_name: string
  category_icon: string
  amount: string
  enabled: boolean
}

export function SetupContractWizard({ projectId, currentContractValue, onClose, onComplete }: Props) {
  const { data: categories = [] } = useProjectCategories(projectId)
  const { data: existingItems = [] } = useContractItems(projectId)
  const addMutation = useAddContractItem()

  const [step, setStep] = useState<Step>(1)
  const [contractValue, setContractValue] = useState('')
  const [categoryItems, setCategoryItems] = useState<CategoryItem[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Load existing contract value if editing
  useEffect(() => {
    if (currentContractValue) {
      setContractValue(currentContractValue.toString())
    }
  }, [currentContractValue])

  // Initialize category items when moving to step 2
  function handleStep1Next() {
    if (!contractValue || parseFloat(contractValue) <= 0) {
      setError('נא להזין ערך חוזה תקין')
      return
    }

    // Only initialize if not already done
    if (categoryItems.length === 0) {
      // Get existing category IDs
      const existingCategoryIds = new Set(existingItems.map(item => item.category_id))

      // First, add existing items with their current values
      const existingCategoryItems: CategoryItem[] = existingItems.map(item => {
        const category = categories.find(cat => cat.id === item.category_id)
        return {
          category_id: item.category_id,
          category_name: category?.name || 'קטגוריה לא ידועה',
          category_icon: category?.icon || '📦',
          amount: item.contract_amount.toString(),
          enabled: true // Already enabled since they exist
        }
      })

      // Then, add new categories that don't exist yet
      const newCategoryItems: CategoryItem[] = categories
        .filter(cat => !existingCategoryIds.has(cat.id))
        .map(cat => ({
          category_id: cat.id,
          category_name: cat.name,
          category_icon: cat.icon,
          amount: '',
          enabled: false
        }))
      
      // Combine: existing first, then new
      const allItems = [...existingCategoryItems, ...newCategoryItems]

      setCategoryItems(allItems)
    }

    setError('')
    setStep(2)
  }

  function handleCategoryToggle(categoryId: string) {
    setCategoryItems(prev => 
      prev.map(item => 
        item.category_id === categoryId 
          ? { ...item, enabled: !item.enabled }
          : item
      )
    )
  }

  function handleCategoryAmount(categoryId: string, amount: string) {
    setCategoryItems(prev => 
      prev.map(item => 
        item.category_id === categoryId 
          ? { ...item, amount }
          : item
      )
    )
  }

  function handleStep2Next() {
    const enabledItems = categoryItems.filter(item => item.enabled)
    
    if (enabledItems.length === 0) {
      setError('נא לבחור לפחות קטגוריה אחת')
      return
    }

    const hasEmptyAmounts = enabledItems.some(item => !item.amount || parseFloat(item.amount) <= 0)
    if (hasEmptyAmounts) {
      setError('נא למלא סכום לכל הקטגוריות שבחרת')
      return
    }

    setError('')
    setStep(3)
  }

  async function handleFinalSave() {
    setSaving(true)
    setError('')

    try {
      // 1. Save contract value to project
      const { error: projectError } = await supabase
        .from('projects')
        .update({ contract_value: parseFloat(contractValue) })
        .eq('id', projectId)

      if (projectError) throw projectError

      // 2. Save/Update contract items
      const enabledItems = categoryItems.filter(item => item.enabled)
      const existingItemIds = new Set(existingItems.map(i => i.category_id))
      
      for (const item of enabledItems) {
        const isExisting = existingItemIds.has(item.category_id)
        
        if (isExisting) {
          // Update existing item
          const existingItem = existingItems.find(i => i.category_id === item.category_id)
          const { error: updateError } = await supabase
            .from('contract_items')
            .update({ 
              contract_amount: parseFloat(item.amount)
            })
            .eq('id', existingItem!.id)
          
          if (updateError) throw updateError
        } else {
          // Insert new item
          await addMutation.mutateAsync({
            project_id: projectId,
            category_id: item.category_id,
            contract_amount: parseFloat(item.amount),
            description: null,
          })
        }
      }

      onComplete()
      onClose()
    } catch (err: any) {
      setError(err.message || 'שגיאה בשמירת החוזה')
      setSaving(false)
    }
  }

  // Calculate totals
  const totalAllocated = categoryItems
    .filter(item => item.enabled)
    .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
  
  const remaining = parseFloat(contractValue || '0') - totalAllocated

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 font-[Heebo,sans-serif] direction-rtl">
      <div className="bg-white rounded-2xl p-8 w-[90%] max-w-[700px] shadow-2xl max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#1e293b] mb-2">
            🎯 הגדרת חוזה ראשוני
          </h2>
          <div className="flex gap-2 mt-4">
            <div className={`flex-1 h-2 rounded-full ${step >= 1 ? 'bg-[#6366F1]' : 'bg-[#E5E7EB]'}`} />
            <div className={`flex-1 h-2 rounded-full ${step >= 2 ? 'bg-[#6366F1]' : 'bg-[#E5E7EB]'}`} />
            <div className={`flex-1 h-2 rounded-full ${step >= 3 ? 'bg-[#6366F1]' : 'bg-[#E5E7EB]'}`} />
          </div>
          <div className="flex justify-between text-xs text-[#64748b] mt-1">
            <span>ערך חוזה</span>
            <span>חלוקה לסעיפים</span>
            <span>אישור</span>
          </div>
        </div>

        {/* Step 1: Contract Value */}
        {step === 1 && (
          <div>
            <div className="mb-6 p-6 bg-[#F8FAFC] rounded-xl">
              <p className="text-lg font-semibold text-[#1e293b] mb-2">
                כמה הסכום הכולל של החוזה עם הלקוח?
              </p>
              <p className="text-sm text-[#64748b]">
                זה הסכום הכולל שסיכמת עם הלקוח לפני חלוקה לסעיפים
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-[#64748b] mb-2">
                ערך חוזה כולל *
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={contractValue}
                  onChange={(e) => setContractValue(e.target.value)}
                  placeholder="לדוגמה: 500000"
                  className="w-full p-4 pr-12 text-2xl font-bold border-2 border-[#E5E7EB] rounded-xl focus:border-[#6366F1] focus:outline-none"
                  autoFocus
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl text-[#64748b]">
                  ₪
                </span>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-[#FEE2E2] border border-[#EF4444] rounded-lg text-sm text-[#DC2626]">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-white border-2 border-[#E5E7EB] rounded-xl font-semibold text-[#64748b] hover:bg-[#F8FAFC] transition-colors"
              >
                ביטול
              </button>
              <button
                onClick={handleStep1Next}
                className="flex-1 px-6 py-3 bg-[#6366F1] text-white rounded-xl font-semibold hover:bg-[#4F46E5] transition-colors"
              >
                המשך ▶
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Category Allocation */}
        {step === 2 && (
          <div>
            <div className="mb-6 p-6 bg-[#F8FAFC] rounded-xl">
              <p className="text-lg font-semibold text-[#1e293b] mb-2">
                בוא נחלק את החוזה לסעיפים
              </p>
              <p className="text-sm text-[#64748b]">
                בחר את הקטגוריות הרלוונטיות והזן את הסכום לכל קטגוריה
              </p>
            </div>

            {/* Summary */}
            <div className="mb-6 p-4 bg-[#EEF2FF] border-2 border-[#6366F1] rounded-xl">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-[#64748b]">ערך חוזה כולל</p>
                  <p className="text-2xl font-bold text-[#6366F1]">
                    {parseFloat(contractValue).toLocaleString('he-IL')} ₪
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#64748b]">הוקצה</p>
                  <p className="text-2xl font-bold text-[#10B981]">
                    {totalAllocated.toLocaleString('he-IL')} ₪
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#64748b]">נותר</p>
                  <p className={`text-2xl font-bold ${remaining >= 0 ? 'text-[#F59E0B]' : 'text-[#EF4444]'}`}>
                    {remaining.toLocaleString('he-IL')} ₪
                  </p>
                </div>
              </div>
            </div>

            {/* Categories */}
            <div className="mb-6 max-h-[300px] overflow-y-auto space-y-3">
              {categoryItems.map((item) => (
                <div 
                  key={item.category_id}
                  className={`p-4 border-2 rounded-xl transition-all ${
                    item.enabled 
                      ? 'border-[#6366F1] bg-[#EEF2FF]' 
                      : 'border-[#E5E7EB] bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      onChange={() => handleCategoryToggle(item.category_id)}
                      className="w-5 h-5 cursor-pointer"
                    />
                    <span className="text-2xl">{item.category_icon}</span>
                    <span className="font-semibold text-[#1e293b]">{item.category_name}</span>
                  </div>
                  
                  {item.enabled && (
                    <div className="mr-8">
                      <div className="relative">
                        <input
                          type="number"
                          value={item.amount}
                          onChange={(e) => handleCategoryAmount(item.category_id, e.target.value)}
                          placeholder="הזן סכום"
                          className="w-full p-3 pr-10 border-2 border-[#E5E7EB] rounded-lg focus:border-[#6366F1] focus:outline-none font-semibold"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]">₪</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {error && (
              <div className="mb-4 p-3 bg-[#FEE2E2] border border-[#EF4444] rounded-lg text-sm text-[#DC2626]">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 px-6 py-3 bg-white border-2 border-[#E5E7EB] rounded-xl font-semibold text-[#64748b] hover:bg-[#F8FAFC] transition-colors"
              >
                ◀ חזור
              </button>
              <button
                onClick={handleStep2Next}
                className="flex-1 px-6 py-3 bg-[#6366F1] text-white rounded-xl font-semibold hover:bg-[#4F46E5] transition-colors"
              >
                המשך לאישור ▶
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Preview & Confirm */}
        {step === 3 && (
          <div>
            <div className="mb-6 p-6 bg-[#F8FAFC] rounded-xl">
              <p className="text-lg font-semibold text-[#1e293b] mb-2">
                ✅ בדוק שהכל נכון לפני השמירה
              </p>
              <p className="text-sm text-[#64748b]">
                זו תצוגה מקדימה של החוזה שלך
              </p>
            </div>

            {/* Contract Summary */}
            <div className="mb-6 p-5 bg-[#EEF2FF] border-2 border-[#6366F1] rounded-xl">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-[#64748b]">ערך חוזה כולל</span>
                <span className="text-3xl font-bold text-[#6366F1]">
                  {parseFloat(contractValue).toLocaleString('he-IL')} ₪
                </span>
              </div>
              <div className="pt-4 border-t border-[#6366F1]/20">
                <p className="text-xs text-[#64748b] mb-3">מחולק ל-{categoryItems.filter(i => i.enabled).length} סעיפים:</p>
                <div className="space-y-2">
                  {categoryItems.filter(item => item.enabled).map((item) => (
                    <div key={item.category_id} className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{item.category_icon}</span>
                        <span className="font-medium text-[#1e293b]">{item.category_name}</span>
                      </div>
                      <span className="font-bold text-[#6366F1]">
                        {parseFloat(item.amount).toLocaleString('he-IL')} ₪
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {remaining !== 0 && (
                <div className={`mt-4 p-3 rounded-lg ${remaining > 0 ? 'bg-[#FEF3C7]' : 'bg-[#FEE2E2]'}`}>
                  <p className={`text-sm font-semibold ${remaining > 0 ? 'text-[#92400E]' : 'text-[#DC2626]'}`}>
                    {remaining > 0 
                      ? `⚠️ נותרו ${remaining.toLocaleString('he-IL')} ₪ שלא הוקצו`
                      : `⚠️ חרגת ב-${Math.abs(remaining).toLocaleString('he-IL')} ₪ מערך החוזה`
                    }
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="mb-4 p-3 bg-[#FEE2E2] border border-[#EF4444] rounded-lg text-sm text-[#DC2626]">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                disabled={saving}
                className="flex-1 px-6 py-3 bg-white border-2 border-[#E5E7EB] rounded-xl font-semibold text-[#64748b] hover:bg-[#F8FAFC] transition-colors disabled:opacity-50"
              >
                ◀ חזור לעריכה
              </button>
              <button
                onClick={handleFinalSave}
                disabled={saving}
                className="flex-1 px-6 py-3 bg-[#10B981] text-white rounded-xl font-semibold hover:bg-[#059669] transition-colors disabled:opacity-50"
              >
                {saving ? '💾 שומר...' : '✅ אשר ושמור'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
