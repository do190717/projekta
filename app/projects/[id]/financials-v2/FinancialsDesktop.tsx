'use client'

import React, { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import Sidebar from '../components/Sidebar'
import { useProject } from '@/hooks/useQueries'
import { useProjectCategories } from '@/hooks/useProjectCategories'
import { useFinancialsOverview, useCashFlowV2, usePurchaseOrders } from '@/hooks/useFinancialsQueries'
import { AddTransactionModal } from './components/AddTransactionModal'
import { AddContractItemModal } from './components/AddContractItemModal'
import { EditContractItemModal } from './components/EditContractItemModal'
import { SetupContractWizard } from './components/SetupContractWizard'
import { EditTransactionModal } from './components/EditTransactionModal'
import AddPOModal from './components/AddPOModal'
import POListModal from './components/POListModal'
import { exportBudgetToExcel, exportCashFlowToExcel } from '@/app/utils/excelExport'
import { showSuccess } from '@/app/utils/toast'

type Tab = 'budget' | 'cashflow' | 'purchase-orders'

export default function FinancialsDesktop() {
  const params = useParams()
  if (!params?.id) {
  return <div>Invalid project ID</div>
}
const projectId = params.id as string

  const queryClient = useQueryClient()
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
  const [preSelectedCategoryId, setPreSelectedCategoryId] = useState<string | null>(null)
  const [showSetupWizard, setShowSetupWizard] = useState(false)
  const [editingItem, setEditingItem] = useState<any | null>(null)
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null)
  const [dismissedOverflowAlert, setDismissedOverflowAlert] = useState(false)
  const [showOverflowModal, setShowOverflowModal] = useState(false)
  const [cashFlowViewMode, setCashFlowViewMode] = useState<'combined' | 'split'>('combined')


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

  // Calculate overflow expenses (expenses without budget)
  const contractItemCategoryIds = new Set(categories.map((cat: any) => cat.category_id))
  
  const overflowTransactions = transactions.filter((t: any) => 
    t.type === 'expense' && 
    (
      !t.category_id || // ללא קטגוריה בכלל
      !contractItemCategoryIds.has(t.category_id) // קטגוריה ללא הקצאה
    )
  )
  
  const overflowTotal = overflowTransactions.reduce((sum: number, t: any) => sum + Number(t.amount), 0)
  
  // Group overflow by category
  const overflowByCategory = overflowTransactions.reduce((acc: any, t: any) => {
    const catId = t.category_id || 'no-category' // קטגוריה מיוחדת להוצאות ללא קטגוריה
    if (!acc[catId]) {
      acc[catId] = {
        category: t.category || { id: 'no-category', name: 'ללא קטגוריה', icon: '❓' },
        total: 0,
        count: 0
      }
    }
    acc[catId].total += Number(t.amount)
    acc[catId].count += 1
    return acc
  }, {})

  const hasOverflow = overflowTotal > 0

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Sidebar projectName={project.name} />

      <div className="mr-[260px] flex-1 p-8 font-[Heebo,sans-serif] flex justify-center" dir="rtl">
        <div className={`w-full ${activeTab === 'cashflow' && cashFlowViewMode === 'split' ? 'max-w-[1800px]' : 'max-w-[1400px]'}`}>
          
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
            <button
              onClick={() => handleTabChange('purchase-orders')}
              className={`px-6 py-3 rounded-t-lg text-base font-semibold cursor-pointer font-[Heebo,sans-serif] border-none -mb-[2px] ${
                activeTab === 'purchase-orders'
                  ? 'bg-white border-b-[3px] border-b-[#6366F1] text-[#6366F1]'
                  : 'bg-transparent border-b-[3px] border-b-transparent text-[#64748b]'
              }`}
            >
              📦 הזמנות רכש
            </button>
          </div>

          {/* Overflow Alert Banner */}
          {hasOverflow && !dismissedOverflowAlert && activeTab === 'budget' && (
            <div style={{
              padding: '16px 20px',
              backgroundColor: '#FEF2F2',
              border: '2px solid #FCA5A5',
              borderRadius: '12px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontSize: '16px', 
                  fontWeight: '700', 
                  color: '#DC2626',
                  marginBottom: '4px',
                }}>
                  ⚠️ יש לך ₪{new Intl.NumberFormat('he-IL').format(overflowTotal)} בהוצאות לא מתוכננות
                </div>
                <div style={{ fontSize: '14px', color: '#991B1B' }}>
                  הוצאות אלו אינן מוקצות לאף סעיף תקציב ועלולות לגרום לחריגה
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowSetupWizard(true)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#DC2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontFamily: 'Heebo, sans-serif',
                  }}
                >
                  📋 הגדר תקציב כעת
                </button>
                <button
                  onClick={() => setDismissedOverflowAlert(true)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: 'white',
                    color: '#64748b',
                    border: '2px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontFamily: 'Heebo, sans-serif',
                  }}
                >
                  התעלם
                </button>
              </div>
            </div>
          )}

          {/* Tab Content */}
          {activeTab === 'budget' ? (
            <BudgetTab 
              projectId={projectId} 
              totals={totals}
              categories={categories}
              contractValue={project.contract_value || 0}
              overflowTotal={overflowTotal}
              overflowByCategory={overflowByCategory}
              showOverflowModal={showOverflowModal}
              setShowOverflowModal={setShowOverflowModal}
              setPreSelectedCategoryId={setPreSelectedCategoryId}
              onAddContractItem={() => setShowAddContractModal(true)}
              onEditItem={(item) => setEditingItem(item)}
              onSetupWizard={() => setShowSetupWizard(true)}
            />
          ) : activeTab === 'cashflow' ? (
            <CashFlowTab 
              projectId={projectId}
              transactions={transactions}
              totals={totals}
              viewMode={cashFlowViewMode}
              setViewMode={setCashFlowViewMode}
              onAddTransaction={() => setShowAddTransactionModal(true)}
              onEditTransaction={(trans) => setEditingTransaction(trans)}
            />
          ) : (
            <PurchaseOrdersTab 
              projectId={projectId}
              categories={categories}
            />
          )}

        </div>
      </div>

      {/* Modals */}
      {showAddTransactionModal && (
        <AddTransactionModal 
          projectId={projectId}
          onClose={() => setShowAddTransactionModal(false)}
          onAddContractItem={(categoryId) => {
            setShowAddTransactionModal(false)
            setShowAddContractModal(true)
          }}
        />
      )}
      
      {showAddContractModal && (
        <AddContractItemModal 
          projectId={projectId}
          preSelectedCategoryId={preSelectedCategoryId}
          onClose={() => {
            setShowAddContractModal(false)
            setPreSelectedCategoryId(null)
          }}
          onEditExisting={(item) => {
            setShowAddContractModal(false)
            setPreSelectedCategoryId(null)
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
            showSuccess('✅ החוזה עודכן בהצלחה!')
            queryClient.invalidateQueries({ queryKey: ['financials-overview', projectId] })
            queryClient.invalidateQueries({ queryKey: ['cash-flow-v2', projectId] })
            queryClient.invalidateQueries({ queryKey: ['project', projectId] })
            setShowSetupWizard(false)
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
// 🔧 HELPER FUNCTIONS
// ====================================

function formatNumber(num: number): string {
  return new Intl.NumberFormat('he-IL').format(Math.round(num))
}

// ====================================
// 🧩 TAB COMPONENTS
// ====================================

function BudgetTab({ 
  projectId, 
  totals,
  categories,
  contractValue,
  overflowTotal,
  overflowByCategory,
  showOverflowModal,
  setShowOverflowModal,
  setPreSelectedCategoryId,
  onAddContractItem,
  onEditItem,
  onSetupWizard
}: { 
  projectId: string
  totals: any
  categories: any[]
  contractValue: number
  overflowTotal: number
  overflowByCategory: any
  showOverflowModal: boolean
  setShowOverflowModal: (show: boolean) => void
  setPreSelectedCategoryId: (id: string | null) => void
  onAddContractItem: () => void
  onEditItem: (item: any) => void
  onSetupWizard: () => void
}) {
  const hasData = categories.length > 0
  const hasOverflow = overflowTotal > 0

  // Categories come pre-merged from financials_overview_v2 VIEW
  // Each category already has: category_name, category_icon, contract_amount,
  // actual_expenses, received_income, committed_amount

  // Calculate alerts using merged categories
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
                      const contractItem = item.contract_item_id
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
                      const contractItem = item.contract_item_id
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
        
        {/* Top Stats - 5 Cards with colored borders */}
        <div className="grid grid-cols-5 gap-5 mb-5">
          {/* ערך חוזה כולל - NEW */}
          <div className="p-5 bg-white rounded-xl border-2 border-[#6366F1] shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">💼</span>
              <p className="text-sm text-[#64748b] m-0 font-medium">
                ערך חוזה כולל
              </p>
            </div>
            <p className="text-3xl font-bold m-0 text-[#6366F1]">
              {formatNumber(contractValue)} ₪
            </p>
            <p className="text-xs text-[#94a3b8] mt-1">סכום החוזה עם הלקוח</p>
          </div>

          {/* סה״כ סעיפי חוזה */}
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
              {' | '}
              {contractValue > 0 ? Math.round((totals.totalExpenses / contractValue) * 100) : 0}% מהחוזה
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
              {' | '}
              {contractValue > 0 ? Math.round((totals.totalIncome / contractValue) * 100) : 0}% מהחוזה
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
        
        {/* Project Status Card - Moved below stats */}
        <div className="p-8 bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.1)] mb-6">
          <h2 className="text-xl font-bold mb-6 text-[#1e293b] flex items-center gap-2">
            💰 סטטוס הפרויקט
          </h2>
          
          {(() => {
            const totalContract = contractValue || 0
            const totalAllocated = categories.reduce((sum: number, cat: any) => sum + (cat.contract_amount || 0), 0)
            const totalExpenses = categories.reduce((sum: number, cat: any) => sum + (cat.actual_expenses || 0), 0)
            
            const allocationPercent = totalContract > 0 ? (totalAllocated / totalContract) * 100 : 0
            const isFullyAllocated = allocationPercent >= 99
            
            const expensesPercentOfContract = totalContract > 0 ? (totalExpenses / totalContract) * 100 : 0
            const expensesPercentOfAllocated = totalAllocated > 0 ? (totalExpenses / totalAllocated) * 100 : 0
            
            const remainingContract = totalContract - totalExpenses
            const remainingAllocated = totalAllocated - totalExpenses
            const unallocatedBudget = totalContract - totalAllocated
            
            if (isFullyAllocated) {
              // Single Bar - Fully Allocated
              return (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <span className="text-sm text-[#64748b]">חוזה: </span>
                      <span className="text-lg font-bold text-[#6366F1]">₪{formatNumber(totalContract)}</span>
                    </div>
                    <div>
                      <span className="text-sm text-[#64748b]">הוצא: </span>
                      <span className="text-lg font-bold text-[#EF4444]">₪{formatNumber(totalExpenses)}</span>
                    </div>
                  </div>
                  
                  <div className="bg-[#ECFDF5] px-3 py-2 rounded-lg mb-3 text-center">
                    <span className="text-xs text-[#059669] font-semibold">
                      ✅ הקצת את כל התקציב לסעיפים
                    </span>
                  </div>
                  
                  {/* Single Progress Bar */}
                  <div className="relative w-full h-10 bg-[#F1F5F9] rounded-xl overflow-hidden">
                    {/* Green - Full contract (lighter shade) */}
                    <div 
                      className="absolute top-0 right-0 h-full bg-[#34D399] transition-all duration-500"
                      style={{ width: '100%' }}
                    />
                    
                    {/* Orange/Red - Expenses (covers green) */}
                    {expensesPercentOfContract <= 100 ? (
                      <div 
                        className="absolute top-0 right-0 h-full bg-[#F59E0B] transition-all duration-500"
                        style={{ width: `${Math.min(expensesPercentOfContract, 100)}%` }}
                      />
                    ) : (
                      <div 
                        className="absolute top-0 right-0 h-full bg-[#EF4444] transition-all duration-500"
                        style={{ width: `${expensesPercentOfContract}%` }}
                      />
                    )}
                    
                    {/* Text overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold text-white drop-shadow-lg">
                        {expensesPercentOfContract > 100 ? (
                          <>🔴 חריגה: +₪{formatNumber(totalExpenses - totalContract)}</>
                        ) : remainingContract > 0 ? (
                          <>✅ נותר רווח: ₪{formatNumber(remainingContract)} ({Math.round(100 - expensesPercentOfContract)}%)</>
                        ) : (
                          <>⚠️ הוצא את כל התקציב</>
                        )}
                      </span>
                    </div>
                  </div>
                  
                  {/* Legend */}
                  <div className="flex gap-4 mt-3 text-xs text-[#64748b] justify-center">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-[#34D399] rounded"></div>
                      <span>רווח</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-[#F59E0B] rounded"></div>
                      <span>הוצא</span>
                    </div>
                    {expensesPercentOfContract > 100 && (
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-[#EF4444] rounded"></div>
                        <span>חריגה</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            } else {
              // Dual Bars - Not Fully Allocated
              return (
                <div className="space-y-6">
                  {/* Bar 1: By Contract */}
                  <div>
                    <h3 className="text-sm font-semibold text-[#64748b] mb-2">📋 לפי החוזה</h3>
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <span className="text-xs text-[#64748b]">חוזה: </span>
                        <span className="text-base font-bold text-[#6366F1]">₪{formatNumber(totalContract)}</span>
                      </div>
                      <div>
                        <span className="text-xs text-[#64748b]">הוצא: </span>
                        <span className="text-base font-bold text-[#EF4444]">₪{formatNumber(totalExpenses)}</span>
                      </div>
                    </div>
                    
                    <div className="relative w-full h-8 bg-[#F1F5F9] rounded-lg overflow-hidden">
                      {/* Green - Full budget */}
                      <div 
                        className="absolute top-0 right-0 h-full bg-[#34D399] transition-all duration-500"
                        style={{ width: '100%' }}
                      />
                      
                      {/* Orange/Red - Expenses */}
                      {expensesPercentOfContract <= 100 ? (
                        <div 
                          className="absolute top-0 right-0 h-full bg-[#F59E0B] transition-all duration-500"
                          style={{ width: `${Math.min(expensesPercentOfContract, 100)}%` }}
                        />
                      ) : (
                        <div 
                          className="absolute top-0 right-0 h-full bg-[#EF4444] transition-all duration-500"
                          style={{ width: `${expensesPercentOfContract}%` }}
                        />
                      )}
                      
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-bold text-white drop-shadow-lg">
                          {expensesPercentOfContract > 100 ? (
                            <>🔴 חריגה: +₪{formatNumber(totalExpenses - totalContract)}</>
                          ) : (
                            <>✅ נותר: ₪{formatNumber(remainingContract)}</>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t border-[#E5E7EB]"></div>
                  
                  {/* Bar 2: By Allocation */}
                  <div>
                    <h3 className="text-sm font-semibold text-[#64748b] mb-2">📊 לפי ההקצאות</h3>
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <span className="text-xs text-[#64748b]">הקצה: </span>
                        <span className="text-base font-bold text-[#8B5CF6]">₪{formatNumber(totalAllocated)}</span>
                        <span className="text-xs text-[#94a3b8] mr-1">({Math.round(allocationPercent)}%)</span>
                      </div>
                      <div>
                        <span className="text-xs text-[#64748b]">הוצא: </span>
                        <span className="text-base font-bold text-[#EF4444]">₪{formatNumber(totalExpenses)}</span>
                      </div>
                    </div>
                    
                    <div className="relative w-full h-8 bg-[#F1F5F9] rounded-lg overflow-hidden">
                      {/* Green background - full allocation */}
                      <div 
                        className="absolute top-0 right-0 h-full bg-[#34D399] transition-all duration-500"
                        style={{ width: '100%' }}
                      />
                      
                      {/* Orange/Red - Expenses */}
                      {expensesPercentOfAllocated <= 100 ? (
                        <div 
                          className="absolute top-0 right-0 h-full bg-[#F59E0B] transition-all duration-500"
                          style={{ width: `${Math.min(expensesPercentOfAllocated, 100)}%` }}
                        />
                      ) : (
                        <div 
                          className="absolute top-0 right-0 h-full bg-[#EF4444] transition-all duration-500"
                          style={{ width: `${expensesPercentOfAllocated}%` }}
                        />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-bold text-white drop-shadow-lg">
                          {expensesPercentOfAllocated > 100 ? (
                            <>🔴 חריגה: +₪{formatNumber(totalExpenses - totalAllocated)}</>
                          ) : (
                            <>✅ נותר: ₪{formatNumber(remainingAllocated)}</>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Warning about unallocated budget */}
                  {unallocatedBudget > 0 && (
                    <div className="bg-[#FEF3C7] px-4 py-3 rounded-lg flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-[#92400E] m-0">
                          ⚠️ יש לך עוד ₪{formatNumber(unallocatedBudget)} שלא הוקצו לסעיפים
                        </p>
                        <p className="text-xs text-[#92400E] mt-1 m-0">
                          כדאי להוסיף סעיפים נוספים או להגדיל תקציבים קיימים
                        </p>
                      </div>
                      <button
                        onClick={onAddContractItem}
                        className="px-3 py-1.5 bg-[#F59E0B] text-white rounded-lg text-xs font-semibold whitespace-nowrap hover:bg-[#D97706] transition-colors"
                      >
                        ➕ הוסף סעיף
                      </button>
                    </div>
                  )}
                  
                  {unallocatedBudget < 0 && (
                    <div className="bg-[#FEF2F2] px-4 py-3 rounded-lg">
                      <p className="text-sm font-semibold text-[#DC2626] m-0">
                        🔴 הקצת ₪{formatNumber(Math.abs(unallocatedBudget))} יותר מהחוזה!
                      </p>
                      <p className="text-xs text-[#DC2626] mt-1 m-0">
                        צריך להסיר או להקטין סעיפים
                      </p>
                    </div>
                  )}
                </div>
              )
            }
          })()}
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
          /* Cards Grid instead of Table */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Overflow Card - if exists */}
            {hasOverflow && (
              <div 
                key="overflow-card"
                className="p-6 bg-[#FEF2F2] border-2 border-[#EF4444] rounded-2xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">⚠️</span>
                    <div>
                      <h3 className="text-lg font-bold text-[#DC2626] m-0">
                        הוצאות חריגות
                      </h3>
                      <p className="text-xs text-[#991B1B] mt-1 m-0">
                        {Object.keys(overflowByCategory).length} קטגוריות ללא תקציב
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowOverflowModal(true)}
                    className="px-3 py-1.5 bg-[#DC2626] text-white rounded-lg text-xs font-semibold hover:bg-[#B91C1C] transition-colors"
                  >
                    👁️ צפה
                  </button>
                </div>
                
                <div className="space-y-3 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#991B1B]">חוזה:</span>
                    <span className="text-lg font-bold text-[#94A3B8]">₪0</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#991B1B]">הוצא:</span>
                    <span className="text-lg font-bold text-[#EF4444]">₪{formatNumber(overflowTotal)}</span>
                  </div>
                  
                  {/* Full Red Bar */}
                  <div className="relative w-full h-3 bg-[#FECACA] rounded-full overflow-hidden mt-2">
                    <div className="absolute top-0 right-0 h-full bg-[#EF4444] w-full"></div>
                  </div>
                  <p className="text-xs text-center text-[#DC2626] font-semibold m-0">
                    🔴 חריגה מלאה
                  </p>
                </div>
              </div>
            )}
            
            {/* Category Cards */}
            {categories.map((cat, index) => {
              const percentUsed = cat.contract_amount > 0 
                ? (cat.actual_expenses / cat.contract_amount) * 100 
                : 0
              const isOverBudget = cat.actual_expenses > cat.contract_amount
              
              // Create unique key - use both category_id and index to ensure uniqueness
              const uniqueKey = `cat-${cat.category_id || index}-${cat.contract_amount}-${index}`
              
              return (
                <div 
                  key={uniqueKey}
                  className="p-6 bg-white border-2 border-[#E5E7EB] rounded-2xl shadow-sm hover:shadow-lg transition-all hover:border-[#6366F1]"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-3xl">{cat.category_icon}</span>
                      <h3 className="text-lg font-bold text-[#1e293b] m-0">
                        {cat.category_name}
                      </h3>
                    </div>
                    <button
                      onClick={() => {
                        if (cat.contract_item_id) {
                          onEditItem({
                            id: cat.contract_item_id,
                            category_id: cat.category_id,
                            contract_amount: cat.contract_amount,
                            category_name: cat.category_name,
                            category_icon: cat.category_icon,
                            actual_expenses: cat.actual_expenses,
                            received_income: cat.received_income,
                            expected_profit: cat.expected_profit,
                          })
                        } else {
                          setPreSelectedCategoryId(cat.category_id)
                          onAddContractItem()
                        }
                      }}
                      className="text-xl text-[#6366F1] hover:text-[#4F46E5] cursor-pointer bg-transparent border-none transition-colors"
                    >
                      {cat.contract_item_id ? '✏️' : '➕'}
                    </button>
                  </div>
                  
                  {/* Numbers */}
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#64748b]">חוזה:</span>
                      <span className="text-xl font-bold text-[#6366F1]">₪{formatNumber(cat.contract_amount)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#64748b]">הוצא:</span>
                      <span className="text-xl font-bold text-[#EF4444]">₪{formatNumber(cat.actual_expenses)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#64748b]">קיבל:</span>
                      <span className="text-xl font-bold text-[#10B981]">₪{formatNumber(cat.received_income)}</span>
                    </div>
                    {cat.committed_amount > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-[#64748b]">מחויב:</span>
                        <span className="text-xl font-bold text-[#F59E0B]">₪{formatNumber(cat.committed_amount)}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="relative w-full h-10 bg-[#F1F5F9] rounded-xl overflow-hidden">
                      {/* Green - Full budget */}
                      <div 
                        className="absolute top-0 right-0 h-full bg-[#34D399] transition-all duration-500"
                        style={{ width: '100%' }}
                      />
                      
                      {/* Orange/Red - Expenses */}
                      {percentUsed <= 100 ? (
                        <div 
                          className="absolute top-0 right-0 h-full bg-[#F59E0B] transition-all duration-500"
                          style={{ width: `${Math.min(percentUsed, 100)}%` }}
                        />
                      ) : (
                        <div 
                          className="absolute top-0 right-0 h-full bg-[#EF4444] transition-all duration-500"
                          style={{ width: `${percentUsed}%` }}
                        />
                      )}
                      
                      {/* Text overlay */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-bold text-white drop-shadow-lg">
                          {isOverBudget ? (
                            <>🔴 חריגה: +₪{formatNumber(cat.actual_expenses - cat.contract_amount)}</>
                          ) : (
                            <>{Math.round(percentUsed)}% הוצא</>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Profit Badge */}
                  <div className="flex items-center justify-between pt-3 border-t border-[#F1F5F9]">
                    <span className="text-xs text-[#64748b]">רווח צפוי:</span>
                    <span 
                      className={`text-lg font-bold ${cat.expected_profit >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}
                    >
                      {cat.expected_profit >= 0 ? '+' : ''}{formatNumber(cat.expected_profit)} ₪
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Overflow Categories Modal */}
        {showOverflowModal && (
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
              maxWidth: '600px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{
                  fontSize: '22px',
                  fontWeight: '700',
                  color: '#DC2626',
                  margin: 0,
                }}>
                  ⚠️ קטגוריות ללא תקציב מוגדר
                </h3>
                <button
                  onClick={() => setShowOverflowModal(false)}
                  style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: '#F1F5F9',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '18px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ✕
                </button>
              </div>

              <p style={{
                fontSize: '15px',
                color: '#64748b',
                marginBottom: '24px',
              }}>
                הקטגוריות הבאות כוללות הוצאות אך אין להן תקציב מוגדר בחוזה:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Object.entries(overflowByCategory).map(([catId, data]: [string, any]) => {
                  const category = categories.find((cat: any) => cat.category_id === catId)
                  return (
                    <div key={catId} style={{
                      padding: '16px',
                      backgroundColor: '#FEF2F2',
                      border: '2px solid #FCA5A5',
                      borderRadius: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <span style={{ fontSize: '20px' }}>{data.category?.icon || category?.category_icon || '📦'}</span>
                          <span style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
                            {data.category?.name || category?.category_name || 'ללא שם'}
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>
                          {data.count} תנועות • סה"כ הוצאות: <strong style={{ color: '#EF4444' }}>₪{new Intl.NumberFormat('he-IL').format(data.total)}</strong>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setShowOverflowModal(false)
                          setPreSelectedCategoryId(catId)
                          onAddContractItem()
                        }}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#DC2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontFamily: 'Heebo, sans-serif',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        📋 הגדר תקציב
                      </button>
                    </div>
                  )
                })}
              </div>

              <div style={{ 
                marginTop: '24px',
                padding: '16px',
                backgroundColor: '#FEF3C7',
                borderRadius: '12px',
                fontSize: '14px',
                color: '#92400E',
              }}>
                <strong>💡 טיפ:</strong> הגדרת תקציב לכל קטגוריה תעזור לך לעקוב אחרי ההוצאות ולמנוע חריגות
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  )
}

function CashFlowTab({ 
  projectId,
  transactions,
  totals,
  viewMode,
  setViewMode,
  onAddTransaction,
  onEditTransaction
}: { 
  projectId: string
  transactions: any[]
  totals: any
  viewMode: 'combined' | 'split'
  setViewMode: (mode: 'combined' | 'split') => void
  onAddTransaction: () => void
  onEditTransaction: (trans: any) => void
}) {
  // Filters state
  const [filterMonth, setFilterMonth] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  
  // Sorting state
  const [sortBy, setSortBy] = useState<'date' | 'type' | 'category' | 'amount' | 'status'>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  
  // Get categories for filter (including custom)
  const { data: allCategoriesForFilter = [] } = useProjectCategories(projectId)

  // Handle sort toggle
  function handleSort(column: 'date' | 'type' | 'category' | 'amount' | 'status') {
    if (sortBy === column) {
      // Toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // New column, default to desc
      setSortBy(column)
      setSortDirection('desc')
    }
  }

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

  // Apply sorting
  filteredTransactions = [...filteredTransactions].sort((a, b) => {
    let compareResult = 0
    
    switch (sortBy) {
      case 'date':
        compareResult = new Date(a.date).getTime() - new Date(b.date).getTime()
        break
      case 'type':
        compareResult = a.type.localeCompare(b.type)
        break
      case 'category':
        const catA = a.category?.name || 'ללא קטגוריה'
        const catB = b.category?.name || 'ללא קטגוריה'
        compareResult = catA.localeCompare(catB, 'he')
        break
      case 'amount':
        compareResult = Number(a.amount) - Number(b.amount)
        break
      case 'status':
        compareResult = a.status.localeCompare(b.status)
        break
    }
    
    return sortDirection === 'asc' ? compareResult : -compareResult
  })

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
        {/* View Mode Toggle */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex bg-[#F1F5F9] rounded-lg p-1">
            <button
              onClick={() => setViewMode('combined')}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-all font-[Heebo,sans-serif] ${
                viewMode === 'combined'
                  ? 'bg-white text-[#6366F1] shadow-sm'
                  : 'bg-transparent text-[#64748b] hover:text-[#1e293b]'
              }`}
            >
              📊 תצוגה משולבת
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-all font-[Heebo,sans-serif] ${
                viewMode === 'split'
                  ? 'bg-white text-[#6366F1] shadow-sm'
                  : 'bg-transparent text-[#64748b] hover:text-[#1e293b]'
              }`}
            >
              📋 תצוגה מפוצלת
            </button>
          </div>
        </div>

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
                  {allCategoriesForFilter.map(cat => (
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
        ) : viewMode === 'combined' ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-[#E5E7EB]">
                  <th className="p-3 text-right font-semibold text-[#64748b]">
                    <button
                      onClick={() => handleSort('date')}
                      className="flex items-center gap-1 cursor-pointer hover:text-[#6366F1] transition-colors"
                      style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 'inherit' }}
                    >
                      תאריך
                      <span className="text-xs">
                        {sortBy === 'date' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕️'}
                      </span>
                    </button>
                  </th>
                  <th className="p-3 text-right font-semibold text-[#64748b]">
                    <button
                      onClick={() => handleSort('type')}
                      className="flex items-center gap-1 cursor-pointer hover:text-[#6366F1] transition-colors"
                      style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 'inherit' }}
                    >
                      סוג
                      <span className="text-xs">
                        {sortBy === 'type' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕️'}
                      </span>
                    </button>
                  </th>
                  <th className="p-3 text-right font-semibold text-[#64748b]">תיאור</th>
                  <th className="p-3 text-right font-semibold text-[#64748b]">
                    <button
                      onClick={() => handleSort('category')}
                      className="flex items-center gap-1 cursor-pointer hover:text-[#6366F1] transition-colors"
                      style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 'inherit' }}
                    >
                      קטגוריה
                      <span className="text-xs">
                        {sortBy === 'category' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕️'}
                      </span>
                    </button>
                  </th>
                  <th className="p-3 text-right font-semibold text-[#64748b]">
                    <button
                      onClick={() => handleSort('amount')}
                      className="flex items-center gap-1 cursor-pointer hover:text-[#6366F1] transition-colors"
                      style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 'inherit' }}
                    >
                      סכום
                      <span className="text-xs">
                        {sortBy === 'amount' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕️'}
                      </span>
                    </button>
                  </th>
                  <th className="p-3 text-right font-semibold text-[#64748b]">
                    <button
                      onClick={() => handleSort('status')}
                      className="flex items-center gap-1 cursor-pointer hover:text-[#6366F1] transition-colors"
                      style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 'inherit' }}
                    >
                      סטטוס
                      <span className="text-xs">
                        {sortBy === 'status' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕️'}
                      </span>
                    </button>
                  </th>
                  <th className="p-3 text-center font-semibold text-[#64748b] w-[100px]">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.slice(0, 50).map((trans, index) => {
                  const typeColor = trans.type === 'income' ? '#10B981' : '#EF4444'
                  const statusColor = trans.status === 'paid' ? '#10B981' : '#F59E0B'
                  
                  // Find category details from allCategories
                  const categoryDetails = trans.category_id 
                    ? allCategoriesForFilter.find((c: any) => c.id === trans.category_id)
                    : null
                  
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
                        {categoryDetails ? (
                          <span className="flex items-center gap-2">
                            <span>{categoryDetails.icon}</span>
                            <span className="text-[#64748b]">{categoryDetails.name}</span>
                          </span>
                        ) : (
                          <span className="text-[#94a3b8]">ללא קטגוריה</span>
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
        ) : (
          // Split View - Two columns side by side with SORTING
          <div className="grid grid-cols-2 gap-6">
            {/* Income Column */}
            <div>
              <div className="bg-[#ECFDF5] p-4 rounded-t-xl border-b-4 border-[#10B981]">
                <h3 className="text-lg font-bold text-[#10B981] m-0 flex items-center gap-2">
                  📈 הכנסות
                  <span className="text-sm font-normal text-[#059669]">
                    ({filteredTransactions.filter(t => t.type === 'income').length} תנועות)
                  </span>
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b-2 border-[#E5E7EB] bg-[#F8FAFC]">
                      <th className="p-3 text-right font-semibold text-[#64748b] text-xs">
                        <button
                          onClick={() => handleSort('date')}
                          className="flex items-center gap-1 cursor-pointer hover:text-[#10B981] transition-colors"
                          style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 'inherit' }}
                        >
                          תאריך
                          <span className="text-xs">
                            {sortBy === 'date' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕️'}
                          </span>
                        </button>
                      </th>
                      <th className="p-3 text-right font-semibold text-[#64748b] text-xs">
                        <button
                          onClick={() => handleSort('category')}
                          className="flex items-center gap-1 cursor-pointer hover:text-[#10B981] transition-colors"
                          style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 'inherit' }}
                        >
                          קטגוריה
                          <span className="text-xs">
                            {sortBy === 'category' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕️'}
                          </span>
                        </button>
                      </th>
                      <th className="p-3 text-right font-semibold text-[#64748b] text-xs">תיאור</th>
                      <th className="p-3 text-right font-semibold text-[#64748b] text-xs">
                        <button
                          onClick={() => handleSort('amount')}
                          className="flex items-center gap-1 cursor-pointer hover:text-[#10B981] transition-colors"
                          style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 'inherit' }}
                        >
                          סכום
                          <span className="text-xs">
                            {sortBy === 'amount' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕️'}
                          </span>
                        </button>
                      </th>
                      <th className="p-3 text-right font-semibold text-[#64748b] text-xs">
                        <button
                          onClick={() => handleSort('status')}
                          className="flex items-center gap-1 cursor-pointer hover:text-[#10B981] transition-colors"
                          style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 'inherit' }}
                        >
                          סטטוס
                          <span className="text-xs">
                            {sortBy === 'status' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕️'}
                          </span>
                        </button>
                      </th>
                      <th className="p-3 text-center font-semibold text-[#64748b] text-xs w-[50px]">עריכה</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions
                      .filter(t => t.type === 'income')
                      .map((trans) => {
                        // Find category details
                        const categoryDetails = trans.category_id 
                          ? allCategoriesForFilter.find((c: any) => c.id === trans.category_id)
                          : null
                        
                        return (
                        <tr 
                          key={trans.id}
                          className="border-b border-[#F1F5F9] hover:bg-[#ECFDF5] transition-colors"
                        >
                          <td className="p-3 text-[#64748b] text-xs whitespace-nowrap">
                            {new Date(trans.date).toLocaleDateString('he-IL')}
                          </td>
                          <td className="p-3 text-xs">
                            {categoryDetails ? (
                              <div className="flex items-center gap-1">
                                <span>{categoryDetails.icon}</span>
                                <span className="text-[#64748b]">{categoryDetails.name}</span>
                              </div>
                            ) : (
                              <span className="text-[#94a3b8]">ללא קטגוריה</span>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-[#1e293b] text-sm">{trans.description}</div>
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-[#10B981] text-sm">
                              +₪{new Intl.NumberFormat('he-IL').format(trans.amount)}
                            </span>
                          </td>
                          <td className="p-3">
                            {trans.status === 'paid' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#D1FAE5] text-[#065F46] rounded text-xs font-semibold">
                                ✅ שולם
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#FEF3C7] text-[#92400E] rounded text-xs font-semibold">
                                ⏳ ממתין
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => onEditTransaction(trans)}
                              className="text-[#6366F1] hover:text-[#4F46E5] cursor-pointer bg-transparent border-none text-lg"
                            >
                              ✏️
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                    {filteredTransactions.filter(t => t.type === 'income').length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-[#94a3b8]">
                          אין הכנסות להצגה
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Expenses Column */}
            <div>
              <div className="bg-[#FEF2F2] p-4 rounded-t-xl border-b-4 border-[#EF4444]">
                <h3 className="text-lg font-bold text-[#EF4444] m-0 flex items-center gap-2">
                  📉 הוצאות
                  <span className="text-sm font-normal text-[#DC2626]">
                    ({filteredTransactions.filter(t => t.type === 'expense').length} תנועות)
                  </span>
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b-2 border-[#E5E7EB] bg-[#F8FAFC]">
                      <th className="p-3 text-right font-semibold text-[#64748b] text-xs">
                        <button
                          onClick={() => handleSort('date')}
                          className="flex items-center gap-1 cursor-pointer hover:text-[#EF4444] transition-colors"
                          style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 'inherit' }}
                        >
                          תאריך
                          <span className="text-xs">
                            {sortBy === 'date' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕️'}
                          </span>
                        </button>
                      </th>
                      <th className="p-3 text-right font-semibold text-[#64748b] text-xs">
                        <button
                          onClick={() => handleSort('category')}
                          className="flex items-center gap-1 cursor-pointer hover:text-[#EF4444] transition-colors"
                          style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 'inherit' }}
                        >
                          קטגוריה
                          <span className="text-xs">
                            {sortBy === 'category' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕️'}
                          </span>
                        </button>
                      </th>
                      <th className="p-3 text-right font-semibold text-[#64748b] text-xs">תיאור</th>
                      <th className="p-3 text-right font-semibold text-[#64748b] text-xs">
                        <button
                          onClick={() => handleSort('amount')}
                          className="flex items-center gap-1 cursor-pointer hover:text-[#EF4444] transition-colors"
                          style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 'inherit' }}
                        >
                          סכום
                          <span className="text-xs">
                            {sortBy === 'amount' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕️'}
                          </span>
                        </button>
                      </th>
                      <th className="p-3 text-right font-semibold text-[#64748b] text-xs">
                        <button
                          onClick={() => handleSort('status')}
                          className="flex items-center gap-1 cursor-pointer hover:text-[#EF4444] transition-colors"
                          style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 'inherit' }}
                        >
                          סטטוס
                          <span className="text-xs">
                            {sortBy === 'status' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕️'}
                          </span>
                        </button>
                      </th>
                      <th className="p-3 text-center font-semibold text-[#64748b] text-xs w-[50px]">עריכה</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions
                      .filter(t => t.type === 'expense')
                      .map((trans) => {
                        // Find category details
                        const categoryDetails = trans.category_id 
                          ? allCategoriesForFilter.find((c: any) => c.id === trans.category_id)
                          : null
                        
                        return (
                        <tr 
                          key={trans.id}
                          className="border-b border-[#F1F5F9] hover:bg-[#FEF2F2] transition-colors"
                        >
                          <td className="p-3 text-[#64748b] text-xs whitespace-nowrap">
                            {new Date(trans.date).toLocaleDateString('he-IL')}
                          </td>
                          <td className="p-3 text-xs">
                            {categoryDetails ? (
                              <div className="flex items-center gap-1">
                                <span>{categoryDetails.icon}</span>
                                <span className="text-[#64748b]">{categoryDetails.name}</span>
                              </div>
                            ) : (
                              <span className="text-[#94a3b8]">ללא קטגוריה</span>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-[#1e293b] text-sm">{trans.description}</div>
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-[#EF4444] text-sm">
                              -₪{new Intl.NumberFormat('he-IL').format(trans.amount)}
                            </span>
                          </td>
                          <td className="p-3">
                            {trans.status === 'paid' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#D1FAE5] text-[#065F46] rounded text-xs font-semibold">
                                ✅ שולם
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#FEF3C7] text-[#92400E] rounded text-xs font-semibold">
                                ⏳ ממתין
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => onEditTransaction(trans)}
                              className="text-[#6366F1] hover:text-[#4F46E5] cursor-pointer bg-transparent border-none text-lg"
                            >
                              ✏️
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                    {filteredTransactions.filter(t => t.type === 'expense').length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-[#94a3b8]">
                          אין הוצאות להצגה
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ====================================
// 🔧 HELPER COMPONENTS & FUNCTIONS
// ====================================

function PurchaseOrdersTab({ 
  projectId,
  categories
}: { 
  projectId: string
  categories: any[]
}) {
  const [showAddPO, setShowAddPO] = useState(false)
  const [showPOList, setShowPOList] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>()

  const { data: purchaseOrders = [], isLoading } = usePurchaseOrders(projectId)

  // Stats
  const totalPOs = purchaseOrders.length
  const pendingDelivery = purchaseOrders.filter((po: any) => po.delivery_status !== 'delivered').length
  const pendingPayment = purchaseOrders
    .filter((po: any) => po.payment_status !== 'paid')
    .reduce((sum: number, po: any) => sum + Number(po.total_amount) - Number(po.paid_amount || 0), 0)
  const totalCommitted = purchaseOrders
    .filter((po: any) => po.payment_status !== 'paid')
    .reduce((sum: number, po: any) => sum + Number(po.total_amount) - Number(po.paid_amount || 0), 0)

  // Find category details helper
  const getCategoryDetails = (categoryId: string) => {
    return categories.find(c => c.category_id === categoryId)
  }

  const getDeliveryBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return <span className="px-2 py-1 bg-[#D1FAE5] text-[#065F46] rounded text-xs font-semibold">✅ סופק</span>
      case 'partial':
        return <span className="px-2 py-1 bg-[#FEF3C7] text-[#92400E] rounded text-xs font-semibold">📦 חלקי</span>
      default:
        return <span className="px-2 py-1 bg-[#F1F5F9] text-[#64748b] rounded text-xs font-semibold">⏳ ממתין</span>
    }
  }

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="px-2 py-1 bg-[#D1FAE5] text-[#065F46] rounded text-xs font-semibold">✅ שולם</span>
      case 'partial':
        return <span className="px-2 py-1 bg-[#FEF3C7] text-[#92400E] rounded text-xs font-semibold">💳 חלקי</span>
      default:
        return <span className="px-2 py-1 bg-[#FEE2E2] text-[#991B1B] rounded text-xs font-semibold">⏳ לא שולם</span>
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#1e293b] m-0">
            📦 הזמנות רכש
          </h2>
          <p className="text-sm text-[#64748b] mt-2 m-0">
            נהל הזמנות רכש, מעקב משלוחים ותשלומים
          </p>
        </div>
        <button
          onClick={() => setShowAddPO(true)}
          className="px-6 py-3 bg-[#6366F1] text-white border-none rounded-lg text-[15px] font-semibold cursor-pointer font-[Heebo,sans-serif] hover:bg-[#4F46E5] transition-colors"
        >
          ➕ הזמנה חדשה
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="p-5 bg-white rounded-xl border-2 border-[#E5E7EB]">
          <div className="text-sm text-[#64748b] mb-2">סה"כ הזמנות</div>
          <div className="text-3xl font-bold text-[#1e293b]">{totalPOs}</div>
        </div>
        <div className="p-5 bg-white rounded-xl border-2 border-[#F59E0B]">
          <div className="text-sm text-[#64748b] mb-2">ממתין למשלוח</div>
          <div className="text-3xl font-bold text-[#F59E0B]">{pendingDelivery}</div>
        </div>
        <div className="p-5 bg-white rounded-xl border-2 border-[#EF4444]">
          <div className="text-sm text-[#64748b] mb-2">ממתין לתשלום</div>
          <div className="text-3xl font-bold text-[#EF4444]">₪{formatNumber(pendingPayment)}</div>
        </div>
        <div className="p-5 bg-white rounded-xl border-2 border-[#8B5CF6]">
          <div className="text-sm text-[#64748b] mb-2">סה"כ מחויב</div>
          <div className="text-3xl font-bold text-[#8B5CF6]">₪{formatNumber(totalCommitted)}</div>
        </div>
      </div>

      {/* PO Table */}
      <div className="p-8 bg-white rounded-2xl border-2 border-[#E5E7EB]">
        {isLoading ? (
          <div className="text-center py-12 text-[#64748b]">טוען הזמנות...</div>
        ) : purchaseOrders.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-[#1e293b] mb-2">
              אין הזמנות רכש עדיין
            </h3>
            <p className="text-sm text-[#64748b] mb-6">
              התחל לנהל הזמנות רכש עם מעקב מלא אחר משלוחים ותשלומים
            </p>
            <button
              onClick={() => setShowAddPO(true)}
              className="px-6 py-3 bg-[#6366F1] text-white border-none rounded-lg text-[15px] font-semibold cursor-pointer font-[Heebo,sans-serif] hover:bg-[#4F46E5] transition-colors"
            >
              ➕ הוסף הזמנה ראשונה
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-[#E5E7EB]">
                  <th className="p-3 text-right font-semibold text-[#64748b]">מס׳</th>
                  <th className="p-3 text-right font-semibold text-[#64748b]">ספק</th>
                  <th className="p-3 text-right font-semibold text-[#64748b]">תיאור</th>
                  <th className="p-3 text-right font-semibold text-[#64748b]">קטגוריה</th>
                  <th className="p-3 text-right font-semibold text-[#64748b]">סכום</th>
                  <th className="p-3 text-right font-semibold text-[#64748b]">שולם</th>
                  <th className="p-3 text-right font-semibold text-[#64748b]">משלוח</th>
                  <th className="p-3 text-right font-semibold text-[#64748b]">תשלום</th>
                  <th className="p-3 text-right font-semibold text-[#64748b]">תאריך</th>
                  <th className="p-3 text-center font-semibold text-[#64748b] w-[80px]">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map((po: any, index: number) => {
                  const cat = getCategoryDetails(po.category_id)
                  const remaining = Number(po.total_amount) - Number(po.paid_amount || 0)
                  
                  return (
                    <tr key={po.id} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors">
                      <td className="p-3 text-[#64748b] font-mono text-xs">
                        {po.po_number || `#${index + 1}`}
                      </td>
                      <td className="p-3 font-semibold text-[#1e293b]">
                        {po.supplier_name}
                      </td>
                      <td className="p-3 text-[#64748b]">
                        {po.description || '—'}
                      </td>
                      <td className="p-3">
                        {cat ? (
                          <span className="flex items-center gap-1">
                            <span>{cat.category_icon}</span>
                            <span className="text-[#64748b]">{cat.category_name}</span>
                          </span>
                        ) : (
                          <span className="text-[#94a3b8]">—</span>
                        )}
                      </td>
                      <td className="p-3 font-bold text-[#1e293b]">
                        ₪{formatNumber(po.total_amount)}
                      </td>
                      <td className="p-3">
                        <span className={remaining > 0 ? 'text-[#F59E0B] font-semibold' : 'text-[#10B981] font-semibold'}>
                          ₪{formatNumber(po.paid_amount || 0)}
                        </span>
                        {remaining > 0 && (
                          <div className="text-xs text-[#94a3b8]">
                            נותר: ₪{formatNumber(remaining)}
                          </div>
                        )}
                      </td>
                      <td className="p-3">{getDeliveryBadge(po.delivery_status)}</td>
                      <td className="p-3">{getPaymentBadge(po.payment_status)}</td>
                      <td className="p-3 text-[#64748b] text-xs">
                        {po.order_date ? new Date(po.order_date).toLocaleDateString('he-IL') : '—'}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => {
                            setSelectedCategoryId(po.category_id)
                            setShowPOList(true)
                          }}
                          className="p-2 bg-white border-2 border-[#E5E7EB] rounded-md text-base cursor-pointer text-[#6366F1] hover:bg-[#EEF2FF] hover:border-[#6366F1] transition-all"
                          title="צפה"
                        >
                          👁️
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

      {/* Modals */}
      {showAddPO && (
        <AddPOModal
          projectId={projectId}
          categoryId={selectedCategoryId}
          categories={categories.map(c => ({
            id: c.category_id,
            name: c.category_name,
            icon: c.category_icon,
          }))}
          onClose={() => {
            setShowAddPO(false)
            setSelectedCategoryId(undefined)
          }}
          onSuccess={() => {
            setShowAddPO(false)
            setSelectedCategoryId(undefined)
          }}
        />
      )}

      {showPOList && selectedCategoryId && (
        <POListModal
          projectId={projectId}
          categoryId={selectedCategoryId}
          categoryName={categories.find(c => c.category_id === selectedCategoryId)?.category_name}
          onClose={() => {
            setShowPOList(false)
            setSelectedCategoryId(undefined)
          }}
        />
      )}
    </div>
  )
}

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
