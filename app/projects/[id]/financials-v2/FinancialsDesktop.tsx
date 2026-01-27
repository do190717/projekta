'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Sidebar from '../components/Sidebar'
import { useProject, useCategories } from '@/hooks/useQueries'
import { useFinancialsOverview, useCashFlowV2, useContractItems } from '@/hooks/useFinancialsQueries'
import { AddTransactionModal } from './components/AddTransactionModal'
import { AddContractItemModal } from './components/AddContractItemModal'
import { EditContractItemModal } from './components/EditContractItemModal'
import { SetupContractWizard } from './components/SetupContractWizard'
import { EditTransactionModal } from './components/EditTransactionModal'
import { exportBudgetToExcel, exportCashFlowToExcel } from '@/app/utils/excelExport'
import { showSuccess } from '@/app/utils/toast'

type Tab = 'budget' | 'cashflow'

export default function FinancialsDesktop() {
  const params = useParams()
  const projectId = params.id as string

  const { data: project, isLoading: projectLoading } = useProject(projectId)
  const { data: overview, isLoading: overviewLoading } = useFinancialsOverview(projectId)
  const { data: transactions = [], isLoading: transactionsLoading } = useCashFlowV2(projectId)
  
  // Load saved tab from localStorage
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`financials-tab-${projectId}`)
      return (saved as Tab) || 'budget'
    }
    return 'budget'
  })
  
  // Save tab to localStorage when it changes
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    if (typeof window !== 'undefined') {
      localStorage.setItem(`financials-tab-${projectId}`, tab)
    }
  }

  const [showAddTransactionModal, setShowAddTransactionModal] = useState(false)
  const [showAddContractModal, setShowAddContractModal] = useState(false)
  const [showSetupWizard, setShowSetupWizard] = useState(false)
  const [editingItem, setEditingItem] = useState<any | null>(null)
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null)

  const loading = projectLoading || overviewLoading || transactionsLoading

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen font-[Heebo,sans-serif]">
        <p>טוען נתונים...</p>
      </div>
    )
  }

  if (!project) return <div>פרויקט לא נמצא</div>

  const totals = overview?.totals || {
    totalContract: 0,
    totalExpenses: 0,
    totalIncome: 0,
    expectedProfit: 0,
    pendingFromClient: 0,
    percentageComplete: 0,
  }

  const categories = overview?.categories || []

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Sidebar projectName={project.name} />

      <div className="mr-[260px] flex-1 p-8 font-[Heebo,sans-serif] flex justify-center" dir="rtl">
        <div className="w-full max-w-[1400px]">
          
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-[32px] font-bold m-0 text-[#1e293b]">
                💰 פיננסים
              </h1>
              <span className="px-3 py-1 bg-[#FEF3C7] text-[#92400E] rounded-lg text-[13px] font-semibold">
                גרסת ניסיון V2
              </span>
            </div>
            <p className="text-[#64748b] text-base m-0">
              מעקב מלא אחר תקציב, הוצאות והכנסות - {project.name}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-8 border-b-2 border-[#E5E7EB]">
            <button
              onClick={() => handleTabChange('budget')}
              className={`px-6 py-3 rounded-t-lg text-base font-semibold cursor-pointer font-[Heebo,sans-serif] border-none -mb-[2px] ${
                activeTab === 'budget'
                  ? 'bg-white border-b-[3px] border-b-[#6366F1] text-[#6366F1]'
                  : 'bg-transparent border-b-[3px] border-b-transparent text-[#64748b]'
              }`}
            >
              📊 תקציב ורווחיות
            </button>
            <button
              onClick={() => handleTabChange('cashflow')}
              className={`px-6 py-3 rounded-t-lg text-base font-semibold cursor-pointer font-[Heebo,sans-serif] border-none -mb-[2px] ${
                activeTab === 'cashflow'
                  ? 'bg-white border-b-[3px] border-b-[#6366F1] text-[#6366F1]'
                  : 'bg-transparent border-b-[3px] border-b-transparent text-[#64748b]'
              }`}
            >
              💸 תזרים מזומנים
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'budget' ? (
            <BudgetTab 
              projectId={projectId} 
              totals={totals}
              categories={categories}
              contractValue={project.contract_value || 0}
              onAddContractItem={() => setShowAddContractModal(true)}
              onEditItem={(item) => setEditingItem(item)}
              onSetupWizard={() => setShowSetupWizard(true)}
            />
          ) : (
            <CashFlowTab 
              projectId={projectId}
              transactions={transactions}
              totals={totals}
              onAddTransaction={() => setShowAddTransactionModal(true)}
              onEditTransaction={(trans) => setEditingTransaction(trans)}
            />
          )}

        </div>
      </div>

      {/* Modals */}
      {showAddTransactionModal && (
        <AddTransactionModal 
          projectId={projectId}
          onClose={() => setShowAddTransactionModal(false)}
        />
      )}
      
      {showAddContractModal && (
        <AddContractItemModal 
          projectId={projectId}
          onClose={() => setShowAddContractModal(false)}
          onEditExisting={(item) => {
            setShowAddContractModal(false)
            setEditingItem(item)
          }}
        />
      )}

      {editingItem && (
        <EditContractItemModal 
          projectId={projectId}
          item={editingItem}
          onClose={() => setEditingItem(null)}
        />
      )}

      {showSetupWizard && (
        <SetupContractWizard 
          projectId={projectId}
          currentContractValue={project?.contract_value}
          onClose={() => setShowSetupWizard(false)}
          onComplete={() => {
            // Refresh data after setup
            showSuccess('✅ החוזה עודכן בהצלחה!')
            window.location.reload()
          }}
        />
      )}

      {editingTransaction && (
        <EditTransactionModal 
          projectId={projectId}
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
        />
      )}
    </div>
  )
}

// ====================================
// 🧩 TAB COMPONENTS
// ====================================

function BudgetTab({ 
  projectId, 
  totals,
  categories,
  contractValue,
  onAddContractItem,
  onEditItem,
  onSetupWizard
}: { 
  projectId: string
  totals: any
  categories: any[]
  contractValue: number
  onAddContractItem: () => void
  onEditItem: (item: any) => void
  onSetupWizard: () => void
}) {
  const hasData = categories.length > 0

  // Get actual contract items to find the real IDs
  const { data: contractItems = [] } = useContractItems(projectId)

  // Calculate alerts
  const overBudgetCategories = categories.filter(cat => {
    const percentageUsed = cat.contract_amount > 0 
      ? (cat.actual_expenses / cat.contract_amount) * 100 
      : 0
    return percentageUsed > 100
  })

  const nearLimitCategories = categories.filter(cat => {
    const percentageUsed = cat.contract_amount > 0 
      ? (cat.actual_expenses / cat.contract_amount) * 100 
      : 0
    return cat.contract_amount > 0 && percentageUsed >= 85 && percentageUsed <= 100
  })

  const hasAlerts = overBudgetCategories.length > 0 || nearLimitCategories.length > 0

  // Helper function to find the actual contract item
  const findContractItem = (categoryId: string) => {
    return contractItems.find(item => item.category_id === categoryId)
  }

  return (
    <div>
      {/* Alerts */}
      {hasAlerts && (
        <div className="p-6 bg-white rounded-2xl mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
          <h2 className="text-lg font-bold mb-4 text-[#1e293b]">
            🔔 התראות
          </h2>
          
          <div className="flex flex-col gap-3">
            {overBudgetCategories.map((item, index) => {
              const overAmount = item.actual_expenses - item.contract_amount
              const overPercent = Math.round(((item.actual_expenses / item.contract_amount) * 100) - 100)
              
              return (
                <div 
                  key={`alert-over-${item.category_id}-${index}`}
                  className="p-4 bg-[#FEE2E2] border-2 border-[#EF4444] rounded-xl flex items-center gap-3"
                >
                  <span className="text-2xl">⚠️</span>
                  <div className="flex-1">
                    <p className="m-0 mb-1 text-[15px] font-semibold text-[#991B1B]">
                      חריגה בסעיף "{item.category_name}"
                    </p>
                    <p className="m-0 text-[13px] text-[#7F1D1D]">
                      חרגת ב-₪{formatNumber(overAmount)} ({overPercent}% מעל התקציב)
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const contractItem = findContractItem(item.category_id)
                      if (contractItem) {
                        onEditItem(contractItem)
                      }
                    }}
                    className="px-4 py-2 bg-[#DC2626] text-white border-none rounded-lg text-[13px] font-semibold cursor-pointer font-[Heebo,sans-serif] hover:bg-[#B91C1C] transition-colors"
                  >
                    👁️ צפה
                  </button>
                </div>
              )
            })}

            {nearLimitCategories.map((item, index) => {
              const remaining = item.contract_amount - item.actual_expenses
              const percentUsed = Math.round((item.actual_expenses / item.contract_amount) * 100)
              
              return (
                <div 
                  key={`alert-near-${item.category_id}-${index}`}
                  className="p-4 bg-[#FEF3C7] border-2 border-[#F59E0B] rounded-xl flex items-center gap-3"
                >
                  <span className="text-2xl">⏰</span>
                  <div className="flex-1">
                    <p className="m-0 mb-1 text-[15px] font-semibold text-[#92400E]">
                      סעיף "{item.category_name}" מתקרב לגבול
                    </p>
                    <p className="m-0 text-[13px] text-[#78350F]">
                      נותרו רק ₪{formatNumber(remaining)} זמינים ({100 - percentUsed}% מהתקציב)
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const contractItem = findContractItem(item.category_id)
                      if (contractItem) {
                        onEditItem(contractItem)
                      }
                    }}
                    className="px-4 py-2 bg-[#F59E0B] text-white border-none rounded-lg text-[13px] font-semibold cursor-pointer font-[Heebo,sans-serif] hover:bg-[#D97706] transition-colors"
                  >
                    👁️ צפה
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Summary Card */}
      <div className="p-8 bg-white rounded-2xl mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
        <h2 className="text-xl font-bold mb-6 text-[#1e293b]">
          📊 סיכום כללי
        </h2>
        
        {/* Top Stats - 4 Cards with colored borders */}
        <div className="grid grid-cols-4 gap-5 mb-5">
          {/* סה״כ חוזה */}
          <div className="p-5 bg-white rounded-xl border-2 border-[#8B5CF6] shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">📋</span>
              <p className="text-sm text-[#64748b] m-0 font-medium">
                סה״כ סעיפי חוזה
              </p>
            </div>
            <p className="text-3xl font-bold m-0 text-[#8B5CF6]">
              {formatNumber(totals.totalContract)} ₪
            </p>
            <p className="text-xs text-[#94a3b8] mt-1">סכום מוגדר בסעיפים</p>
          </div>

          {/* הוצא בפועל */}
          <div className="p-5 bg-white rounded-xl border-2 border-[#EF4444] shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">💸</span>
              <p className="text-sm text-[#64748b] m-0 font-medium">
                הוצא בפועל
              </p>
            </div>
            <p className="text-3xl font-bold m-0 text-[#EF4444]">
              {formatNumber(totals.totalExpenses)} ₪
            </p>
            <p className="text-xs text-[#94a3b8] mt-1">
              {totals.totalContract > 0 ? Math.round((totals.totalExpenses / totals.totalContract) * 100) : 0}% מהמוגדר
            </p>
          </div>

          {/* קיבל מלקוח */}
          <div className="p-5 bg-white rounded-xl border-2 border-[#10B981] shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">💰</span>
              <p className="text-sm text-[#64748b] m-0 font-medium">
                קיבל מלקוח
              </p>
            </div>
            <p className="text-3xl font-bold m-0 text-[#10B981]">
              {formatNumber(totals.totalIncome)} ₪
            </p>
            <p className="text-xs text-[#94a3b8] mt-1">
              {totals.totalContract > 0 ? Math.round((totals.totalIncome / totals.totalContract) * 100) : 0}% מהמוגדר
            </p>
          </div>

          {/* אחוז ביצוע */}
          <div className="p-5 bg-white rounded-xl border-2 border-[#F59E0B] shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">⏱️</span>
              <p className="text-sm text-[#64748b] m-0 font-medium">
                אחוז ביצוע
              </p>
            </div>
            <p className="text-3xl font-bold m-0 text-[#F59E0B]">
              {Math.round(totals.percentageComplete)}%
            </p>
            <p className="text-xs text-[#94a3b8] mt-1">התקדמות הפרויקט</p>
          </div>
        </div>
        
        {/* Bottom Stats - 3 Cards */}
        <div className="pt-6 border-t border-[#E5E7EB] grid grid-cols-3 gap-5">
          {/* ערך חוזה כולל */}
          <div>
            <p className="text-sm text-[#64748b] mb-2">ערך חוזה כולל</p>
            <p className="text-2xl font-bold text-[#6366F1] m-0">
              {formatNumber(contractValue)} ₪
            </p>
            <p className="text-xs text-[#94a3b8] mt-1">סכום החוזה עם הלקוח</p>
          </div>
          
          {/* קיבל מלקוח */}
          <div>
            <p className="text-sm text-[#64748b] mb-2">קיבל מלקוח</p>
            <p className="text-2xl font-bold text-[#10B981] m-0">
              {formatNumber(totals.totalIncome)} ₪{' '}
              <span className="text-sm text-[#64748b]">
                ({totals.totalContract > 0 ? Math.round((totals.totalIncome / totals.totalContract) * 100) : 0}%)
              </span>
            </p>
          </div>
          
          {/* ממתין לקבל */}
          <div>
            <p className="text-sm text-[#64748b] mb-2">ממתין לקבל</p>
            <p className="text-2xl font-bold text-[#F59E0B] m-0">
              {formatNumber(totals.pendingFromClient)} ₪{' '}
              <span className="text-sm text-[#64748b]">
                ({totals.totalContract > 0 ? Math.round((totals.pendingFromClient / totals.totalContract) * 100) : 0}%)
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Categories Table */}
      <div className="p-8 bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold m-0 text-[#1e293b]">
            📋 פירוט לפי קטגוריות
          </h2>
          {hasData && (
            <div className="flex gap-3">
              <button 
                onClick={() => exportBudgetToExcel(categories, totals)}
                className="px-5 py-2.5 bg-[#10B981] text-white rounded-lg text-sm font-semibold cursor-pointer font-[Heebo,sans-serif] hover:bg-[#059669] transition-colors"
              >
                📥 ייצא לאקסל
              </button>
              <button 
                onClick={onSetupWizard}
                className="px-5 py-2.5 bg-white border-2 border-[#6366F1] text-[#6366F1] rounded-lg text-sm font-semibold cursor-pointer font-[Heebo,sans-serif] hover:bg-[#EEF2FF] transition-colors"
              >
                ⚙️ ערוך חוזה
              </button>
              <button 
                onClick={onAddContractItem}
                className="px-5 py-2.5 bg-[#6366F1] text-white border-none rounded-lg text-sm font-semibold cursor-pointer font-[Heebo,sans-serif] hover:bg-[#4F46E5] transition-colors"
              >
                ➕ הוסף סעיף
              </button>
            </div>
          )}
        </div>
        
        {!hasData ? (
          <div className="text-center py-[60px] px-5">
            <p className="text-5xl mb-4">🎯</p>
            <p className="text-xl font-bold text-[#1e293b] mb-2">
              בוא נתחיל!
            </p>
            <p className="text-[#94a3b8] text-base mb-6">
              עדיין לא הגדרת את החוזה של הפרויקט
            </p>
            <button 
              onClick={onSetupWizard}
              className="px-8 py-4 bg-[#6366F1] text-white border-none rounded-xl text-base font-bold cursor-pointer font-[Heebo,sans-serif] hover:bg-[#4F46E5] transition-all shadow-lg hover:shadow-xl"
            >
              🎯 התחל הגדרת חוזה
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-[#E5E7EB]">
                  <th className="p-3 text-right font-semibold text-[#64748b]">קטגוריה</th>
                  <th className="p-3 text-right font-semibold text-[#64748b]">ערך חוזה</th>
                  <th className="p-3 text-right font-semibold text-[#64748b]">הוצא בפועל</th>
                  <th className="p-3 text-right font-semibold text-[#64748b]">קיבל מלקוח</th>
                  <th className="p-3 text-right font-semibold text-[#64748b]">רווח צפוי</th>
                  <th className="p-3 text-center font-semibold text-[#64748b] w-[60px]">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat, index) => {
                  const profitPercent = cat.contract_amount > 0 
                    ? ((cat.expected_profit / cat.contract_amount) * 100)
                    : 0
                  
                  const status = cat.expected_profit < 0 
                    ? { icon: '🔴', label: 'הפסד', color: '#EF4444' }
                    : cat.pending_amount > 0
                    ? { icon: '🟡', label: 'ממתין', color: '#F59E0B' }
                    : { icon: '✅', label: 'רווח', color: '#10B981' }

                  // Calculate progress percentage
                  const progressPercent = cat.contract_amount > 0 
                    ? Math.min((cat.actual_expenses / cat.contract_amount) * 100, 100)
                    : 0
                  
                  // Progress bar color based on percentage
                  const progressColor = progressPercent > 100 
                    ? '#EF4444'  // Red for over budget
                    : progressPercent >= 85 
                    ? '#F59E0B'  // Yellow for warning
                    : '#10B981'  // Green for good

                  return (
                    <tr 
                      key={`${cat.category_id}-${index}`}
                      className="border-b border-[#F1F5F9]"
                    >
                      {/* קטגוריה */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{cat.category_icon}</span>
                          <span className="font-semibold text-[#1e293b]">
                            {cat.category_name}
                          </span>
                        </div>
                      </td>
                      
                      {/* ערך חוזה */}
                      <td className="p-4 text-[#6366F1] font-semibold">
                        {formatNumber(cat.contract_amount)} ₪
                      </td>
                      
                      {/* הוצא בפועל + Progress Bar */}
                      <td className="p-4">
                        <div className="text-[#EF4444] font-semibold mb-1">
                          {formatNumber(cat.actual_expenses)} ₪
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-[#F1F5F9] rounded-full h-1.5 mb-1">
                          <div 
                            className="h-full rounded-full transition-all duration-300"
                            style={{ 
                              width: `${Math.min(progressPercent, 100)}%`,
                              backgroundColor: progressColor
                            }}
                          />
                        </div>
                        <div className="text-[10px] text-[#94a3b8]">
                          {Math.round((cat.actual_expenses / cat.contract_amount) * 100)}% מהתקציב
                        </div>
                      </td>
                      
                      {/* קיבל מלקוח */}
                      <td className="p-4">
                        <div className="text-[#10B981] font-semibold mb-1">
                          {formatNumber(cat.received_income)} ₪
                        </div>
                        <div className="flex items-center gap-1">
                          {cat.received_income >= cat.contract_amount ? (
                            <>
                              <span className="text-[10px]">✅</span>
                              <span className="text-[10px] text-[#10B981]">קיבלתי הכל</span>
                            </>
                          ) : cat.received_income > 0 ? (
                            <>
                              <span className="text-[10px]">⏳</span>
                              <span className="text-[10px] text-[#F59E0B]">
                                {Math.round((cat.received_income / cat.contract_amount) * 100)}% - חסרים ₪{formatNumber(cat.contract_amount - cat.received_income)}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-[10px]">⏳</span>
                              <span className="text-[10px] text-[#94a3b8]">לא קיבלתי כלום</span>
                            </>
                          )}
                        </div>
                      </td>
                      
                      {/* רווח צפוי */}
                      <td className="p-4 font-semibold" style={{ color: cat.expected_profit >= 0 ? '#10B981' : '#EF4444' }}>
                        {cat.expected_profit >= 0 ? '+' : ''}{formatNumber(cat.expected_profit)} ₪
                        <span className="text-xs text-[#94a3b8] mr-1">
                          ({profitPercent.toFixed(0)}%)
                        </span>
                      </td>
                      
                      {/* פעולות */}
                      <td className="p-4 text-center">
                        <button
                          onClick={() => {
                            const contractItem = findContractItem(cat.category_id)
                            if (contractItem) {
                              onEditItem(contractItem)
                            }
                          }}
                          className="p-2 bg-white border-2 border-[#E5E7EB] rounded-md text-base cursor-pointer font-[Heebo,sans-serif] text-[#6366F1] hover:bg-[#EEF2FF] hover:border-[#6366F1] transition-all"
                          title="עריכה"
                        >
                          ✏️
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function CashFlowTab({ 
  projectId,
  transactions,
  totals,
  onAddTransaction,
  onEditTransaction
}: { 
  projectId: string
  transactions: any[]
  totals: any
  onAddTransaction: () => void
  onEditTransaction: (trans: any) => void
}) {
  // Filters state
  const [filterMonth, setFilterMonth] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  
  // Get categories for filter
  const { data: categories = [] } = useCategories()

  // Apply filters
  let filteredTransactions = transactions
  
  if (filterMonth !== 'all') {
    filteredTransactions = filteredTransactions.filter(t => {
      const transDate = new Date(t.date)
      return transDate.getMonth() === parseInt(filterMonth)
    })
  }
  
  if (filterCategory !== 'all') {
    filteredTransactions = filteredTransactions.filter(t => t.category_id === filterCategory)
  }
  
  if (filterStatus !== 'all') {
    filteredTransactions = filteredTransactions.filter(t => t.status === filterStatus)
  }

  if (filterType !== 'all') {
    filteredTransactions = filteredTransactions.filter(t => t.type === filterType)
  }

  // Calculate this month's stats
  const now = new Date()
  const thisMonth = transactions.filter(t => {
    const transDate = new Date(t.date)
    return transDate.getMonth() === now.getMonth() && 
           transDate.getFullYear() === now.getFullYear()
  })

  const monthIncome = thisMonth
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const monthExpenses = thisMonth
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const monthBalance = monthIncome - monthExpenses

  // Calculate total project stats
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const totalBalance = totalIncome - totalExpenses

  return (
    <div>
      {/* Summary */}
      <div className="p-8 bg-white rounded-2xl mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
        <h2 className="text-xl font-bold mb-6 text-[#1e293b]">
          💸 תזרים הפרויקט
        </h2>
        
        <div className="grid grid-cols-3 gap-5">
          <SummaryStat 
            label="הכנסות" 
            value={`${formatNumber(totalIncome)} ₪`}
            color="#10B981" 
          />
          <SummaryStat 
            label="הוצאות" 
            value={`${formatNumber(totalExpenses)} ₪`}
            color="#EF4444" 
          />
          <SummaryStat 
            label="יתרה" 
            value={`${totalBalance >= 0 ? '+' : ''}${formatNumber(totalBalance)} ₪`}
            color={totalBalance >= 0 ? '#6366F1' : '#EF4444'}
          />
        </div>
      </div>

      {/* Transactions */}
      <div className="p-8 bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold m-0 text-[#1e293b]">
            📝 תנועות אחרונות
          </h2>
          <div className="flex gap-3">
            {transactions.length > 0 && (
              <button 
                onClick={() => exportCashFlowToExcel(transactions)}
                className="px-5 py-2.5 bg-[#10B981] text-white rounded-lg text-sm font-semibold cursor-pointer font-[Heebo,sans-serif] hover:bg-[#059669] transition-colors"
              >
                📥 ייצא לאקסל
              </button>
            )}
            <button 
              onClick={onAddTransaction}
              className="px-5 py-2.5 bg-[#6366F1] text-white border-none rounded-lg text-sm font-semibold cursor-pointer font-[Heebo,sans-serif] hover:bg-[#4F46E5] transition-colors"
            >
              ➕ הוסף תנועה
            </button>
          </div>
        </div>

        {/* Filters */}
        {transactions.length > 0 && (
          <div className="mb-5 p-4 bg-[#F8FAFC] rounded-xl">
            <div className="grid grid-cols-4 gap-4">
              {/* Type Filter */}
              <div>
                <label className="block text-xs font-semibold text-[#64748b] mb-2">
                  סוג
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full p-2 text-sm border-2 border-[#E5E7EB] rounded-lg focus:border-[#6366F1] focus:outline-none bg-white"
                >
                  <option value="all">הכל</option>
                  <option value="income">📈 הכנסות</option>
                  <option value="expense">📉 הוצאות</option>
                </select>
              </div>

              {/* Month Filter */}
              <div>
                <label className="block text-xs font-semibold text-[#64748b] mb-2">
                  חודש
                </label>
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="w-full p-2 text-sm border-2 border-[#E5E7EB] rounded-lg focus:border-[#6366F1] focus:outline-none bg-white"
                >
                  <option value="all">כל החודשים</option>
                  <option value="0">ינואר</option>
                  <option value="1">פברואר</option>
                  <option value="2">מרץ</option>
                  <option value="3">אפריל</option>
                  <option value="4">מאי</option>
                  <option value="5">יוני</option>
                  <option value="6">יולי</option>
                  <option value="7">אוגוסט</option>
                  <option value="8">ספטמבר</option>
                  <option value="9">אוקטובר</option>
                  <option value="10">נובמבר</option>
                  <option value="11">דצמבר</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-xs font-semibold text-[#64748b] mb-2">
                  קטגוריה
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full p-2 text-sm border-2 border-[#E5E7EB] rounded-lg focus:border-[#6366F1] focus:outline-none bg-white"
                >
                  <option value="all">כל הקטגוריות</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-xs font-semibold text-[#64748b] mb-2">
                  סטטוס
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full p-2 text-sm border-2 border-[#E5E7EB] rounded-lg focus:border-[#6366F1] focus:outline-none bg-white"
                >
                  <option value="all">הכל</option>
                  <option value="paid">✅ שולם</option>
                  <option value="pending">⏳ ממתין</option>
                </select>
              </div>
            </div>
            
            {/* Reset button */}
            {(filterType !== 'all' || filterMonth !== 'all' || filterCategory !== 'all' || filterStatus !== 'all') && (
              <button
                onClick={() => {
                  setFilterType('all')
                  setFilterMonth('all')
                  setFilterCategory('all')
                  setFilterStatus('all')
                }}
                className="mt-3 px-4 py-2 bg-white border-2 border-[#E5E7EB] rounded-lg text-sm font-semibold text-[#64748b] hover:bg-[#F8FAFC] transition-colors"
              >
                🔄 אפס פילטרים
              </button>
            )}
          </div>
        )}
        
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-[60px] px-5">
            <p className="text-5xl mb-4">📭</p>
            <p className="text-[#94a3b8] text-base mb-6">
              {transactions.length === 0 ? 'עדיין אין תנועות' : 'לא נמצאו תנועות מתאימות לפילטר'}
            </p>
            {transactions.length === 0 && (
              <button 
                onClick={onAddTransaction}
                className="px-6 py-3 bg-[#6366F1] text-white border-none rounded-lg text-sm font-semibold cursor-pointer font-[Heebo,sans-serif]"
              >
                ➕ הוסף תנועה ראשונה
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-[#E5E7EB]">
                  <th className="p-3 text-right font-semibold text-[#64748b]">תאריך</th>
                  <th className="p-3 text-right font-semibold text-[#64748b]">סוג</th>
                  <th className="p-3 text-right font-semibold text-[#64748b]">תיאור</th>
                  <th className="p-3 text-right font-semibold text-[#64748b]">קטגוריה</th>
                  <th className="p-3 text-right font-semibold text-[#64748b]">סכום</th>
                  <th className="p-3 text-right font-semibold text-[#64748b]">סטטוס</th>
                  <th className="p-3 text-center font-semibold text-[#64748b] w-[100px]">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.slice(0, 50).map((trans, index) => {
                  const typeColor = trans.type === 'income' ? '#10B981' : '#EF4444'
                  const statusColor = trans.status === 'paid' ? '#10B981' : '#F59E0B'
                  
                  return (
                    <tr key={`trans-${trans.id}-${index}`} className="border-b border-[#F1F5F9]">
                      <td className="p-4 text-[#64748b]">
                        {new Date(trans.date).toLocaleDateString('he-IL')}
                      </td>
                      <td className="p-4">
                        <span 
                          className="px-3 py-1 rounded-md text-xs font-semibold inline-flex items-center gap-1"
                          style={{ backgroundColor: `${typeColor}20`, color: typeColor }}
                        >
                          {trans.type === 'income' ? '📈 הכנסה' : '📉 הוצאה'}
                        </span>
                      </td>
                      <td className="p-4 text-[#1e293b] font-medium">
                        {trans.description}
                      </td>
                      <td className="p-4">
                        {trans.category ? (
                          <span className="flex items-center gap-2">
                            <span>{trans.category.icon}</span>
                            <span className="text-[#64748b]">{trans.category.name}</span>
                          </span>
                        ) : (
                          <span className="text-[#94a3b8]">-</span>
                        )}
                      </td>
                      <td className="p-4 font-bold" style={{ color: typeColor }}>
                        {trans.type === 'income' ? '+' : '-'}{formatNumber(trans.amount)} ₪
                      </td>
                      <td className="p-4">
                        <span 
                          className="px-3 py-1 rounded-md text-xs font-semibold inline-flex items-center gap-1"
                          style={{ backgroundColor: `${statusColor}20`, color: statusColor }}
                        >
                          {trans.status === 'paid' ? '✅ שולם' : '⏳ ממתין'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => onEditTransaction(trans)}
                            className="p-2 bg-white border-2 border-[#E5E7EB] rounded-md text-base cursor-pointer font-[Heebo,sans-serif] text-[#6366F1] hover:bg-[#EEF2FF] hover:border-[#6366F1] transition-all"
                            title="עריכה"
                          >
                            ✏️
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ====================================
// 🔧 HELPER COMPONENTS & FUNCTIONS
// ====================================

function SummaryStat({ 
  label, 
  value, 
  color 
}: { 
  label: string
  value: string
  color: string
}) {
  return (
    <div>
      <p className="text-sm text-[#64748b] m-0 mb-2 font-medium">
        {label}
      </p>
      <p className="text-[28px] font-bold m-0" style={{ color }}>
        {value}
      </p>
    </div>
  )
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('he-IL').format(Math.round(num))
}
