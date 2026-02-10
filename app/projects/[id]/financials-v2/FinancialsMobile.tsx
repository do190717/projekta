'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import MobileSidebar from '../components/MobileSidebar'
import { useProject } from '@/hooks/useQueries'
import { useFinancialsOverview, useCashFlowV2, useContractItems } from '@/hooks/useFinancialsQueries'
import { AddTransactionModal } from './components/AddTransactionModal'
import { AddContractItemModal } from './components/AddContractItemModal'
import { EditContractItemModal } from './components/EditContractItemModal'
import { SetupContractWizard } from './components/SetupContractWizard'
import { EditTransactionModal } from './components/EditTransactionModal'
import { exportBudgetToExcel, exportCashFlowToExcel } from '@/app/utils/excelExport'
import { showSuccess } from '@/app/utils/toast'

type Tab = 'budget' | 'cashflow'

export default function FinancialsMobile() {
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
  const [showSetupWizard, setShowSetupWizard] = useState(false)
  const [editingItem, setEditingItem] = useState<any | null>(null)
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null)

  const loading = projectLoading || overviewLoading || transactionsLoading

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        fontFamily: 'Heebo, sans-serif'
      }}>
        <p>טוען...</p>
      </div>
    )
  }

  if (!project || !overview) return <div style={{ padding: '20px' }}>נתונים לא זמינים</div>

  const hasData = overview.categories && overview.categories.length > 0

  return (
    <div style={{ 
      minHeight: '100vh', 
      paddingBottom: '80px',
      backgroundColor: '#f8fafc',
      fontFamily: 'Heebo, sans-serif',
      direction: 'rtl',
    }}>
      <MobileSidebar projectName={project.name} currentPage="financials" />

      {/* Header */}
      <div style={{ 
        padding: '16px',
        paddingRight: '64px',
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <h1 style={{ 
          fontSize: '20px', 
          fontWeight: '700', 
          margin: '0 0 4px 0',
          color: '#1e293b',
        }}>
          💰 פיננסים V2
        </h1>
        <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
          {project.name}
        </p>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        padding: '12px 16px',
        backgroundColor: 'white',
        borderBottom: '2px solid #e5e7eb',
        position: 'sticky',
        top: '68px',
        zIndex: 99,
      }}>
        <button
          onClick={() => handleTabChange('budget')}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: activeTab === 'budget' ? '#6366F1' : 'white',
            color: activeTab === 'budget' ? 'white' : '#64748b',
            border: activeTab === 'budget' ? 'none' : '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            fontFamily: 'Heebo, sans-serif',
          }}
        >
          📊 תקציב
        </button>
        <button
          onClick={() => handleTabChange('cashflow')}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: activeTab === 'cashflow' ? '#6366F1' : 'white',
            color: activeTab === 'cashflow' ? 'white' : '#64748b',
            border: activeTab === 'cashflow' ? 'none' : '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            fontFamily: 'Heebo, sans-serif',
          }}
        >
          💸 תזרים
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '16px' }}>
        {activeTab === 'budget' ? (
          <BudgetTabMobile 
            overview={overview}
            project={project}
            hasData={hasData}
            onSetupWizard={() => setShowSetupWizard(true)}
            onAddContractItem={() => setShowAddContractModal(true)}
            onEditItem={(item: any) => setEditingItem(item)}
          />
        ) : (
          <CashFlowTabMobile 
            transactions={transactions}
            onAddTransaction={() => setShowAddTransactionModal(true)}
            onEditTransaction={(trans: any) => setEditingTransaction(trans)}
          />
        )}
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

// Budget Tab Mobile Component
function BudgetTabMobile({ overview, project, hasData, onSetupWizard, onAddContractItem, onEditItem }: any) {
  const { categories, totals } = overview

  const formatNumber = (num: number) => new Intl.NumberFormat('he-IL').format(num)

  if (!hasData) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '40px 20px',
        backgroundColor: 'white',
        borderRadius: '12px',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px', color: '#1e293b' }}>
          התחל עם הגדרת חוזה
        </h3>
        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
          הגדר את ערך החוזה וחלק אותו לסעיפים
        </p>
        <button
          onClick={onSetupWizard}
          style={{
            padding: '12px 24px',
            backgroundColor: '#6366F1',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          🚀 הגדר חוזה
        </button>
      </div>
    )
  }

  // Calculate alerts
  const overBudgetItems = categories.filter((cat: any) => cat.actual_expenses > cat.contract_amount)
  const nearBudgetItems = categories.filter((cat: any) => {
    const percentage = (cat.actual_expenses / cat.contract_amount) * 100
    return percentage >= 85 && percentage <= 100
  })

  return (
    <div>
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <SummaryCardMobile 
          label="ערך חוזה כולל"
          value={`₪${formatNumber(project.contract_value || 0)}`}
          color="#6366F1"
        />
        <SummaryCardMobile 
          label="רווח צפוי"
          value={`₪${formatNumber(totals.expectedProfit)}`}
          color={totals.expectedProfit >= 0 ? '#10B981' : '#EF4444'}
        />
        <SummaryCardMobile 
          label="הוצא בפועל"
          value={`₪${formatNumber(totals.totalExpenses)}`}
          color="#F59E0B"
        />
        <SummaryCardMobile 
          label="קיבל מלקוח"
          value={`₪${formatNumber(totals.totalIncome)}`}
          color="#10B981"
        />
      </div>

      {/* Alerts */}
      {(overBudgetItems.length > 0 || nearBudgetItems.length > 0) && (
        <div style={{ marginBottom: '16px' }}>
          {overBudgetItems.map((item: any) => (
            <div key={item.category_id} style={{
              padding: '12px',
              backgroundColor: '#FEE2E2',
              border: '1px solid #FCA5A5',
              borderRadius: '8px',
              marginBottom: '8px',
            }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#DC2626', marginBottom: '4px' }}>
                ⚠️ חריגה מתקציב
              </div>
              <div style={{ fontSize: '12px', color: '#991B1B' }}>
                {item.category_name}: חרג ב-₪{formatNumber(item.actual_expenses - item.contract_amount)}
              </div>
            </div>
          ))}
          {nearBudgetItems.map((item: any) => (
            <div key={item.category_id} style={{
              padding: '12px',
              backgroundColor: '#FEF3C7',
              border: '1px solid #FDE047',
              borderRadius: '8px',
              marginBottom: '8px',
            }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#D97706', marginBottom: '4px' }}>
                ⚡ התקרבות לתקציב
              </div>
              <div style={{ fontSize: '12px', color: '#92400E' }}>
                {item.category_name}: {Math.round((item.actual_expenses / item.contract_amount) * 100)}% מהתקציב
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          onClick={() => exportBudgetToExcel(categories, totals)}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: '#10B981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          📥 ייצא
        </button>
        <button
          onClick={onSetupWizard}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: 'white',
            color: '#6366F1',
            border: '2px solid #6366F1',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          ⚙️ ערוך חוזה
        </button>
        <button
          onClick={onAddContractItem}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: '#6366F1',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          ➕ הוסף
        </button>
      </div>

      {/* Categories List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {categories.map((cat: any) => (
          <CategoryCardMobile 
            key={cat.category_id}
            category={cat}
            onEdit={onEditItem}
          />
        ))}
      </div>
    </div>
  )
}

// Cash Flow Tab Mobile Component
function CashFlowTabMobile({ transactions, onAddTransaction, onEditTransaction }: any) {
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const formatNumber = (num: number) => new Intl.NumberFormat('he-IL').format(num)

  // Apply filters
  let filteredTransactions = transactions

  if (filterType !== 'all') {
    filteredTransactions = filteredTransactions.filter((t: any) => t.type === filterType)
  }

  if (filterStatus !== 'all') {
    filteredTransactions = filteredTransactions.filter((t: any) => t.status === filterStatus)
  }

  // Calculate totals
  const totalIncome = transactions
    .filter((t: any) => t.type === 'income')
    .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

  const totalExpenses = transactions
    .filter((t: any) => t.type === 'expense')
    .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

  const totalBalance = totalIncome - totalExpenses

  return (
    <div>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
        <SummaryCardMobile label="הכנסות" value={`₪${formatNumber(totalIncome)}`} color="#10B981" />
        <SummaryCardMobile label="הוצאות" value={`₪${formatNumber(totalExpenses)}`} color="#EF4444" />
        <SummaryCardMobile 
          label="יתרה" 
          value={`${totalBalance >= 0 ? '+' : ''}₪${formatNumber(totalBalance)}`} 
          color={totalBalance >= 0 ? '#6366F1' : '#EF4444'} 
        />
      </div>

      {/* Filters */}
      {transactions.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{
                padding: '8px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '13px',
                backgroundColor: 'white',
              }}
            >
              <option value="all">כל הסוגים</option>
              <option value="income">📈 הכנסות</option>
              <option value="expense">📉 הוצאות</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                padding: '8px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '13px',
                backgroundColor: 'white',
              }}
            >
              <option value="all">כל הסטטוסים</option>
              <option value="paid">✅ שולם</option>
              <option value="pending">⏳ ממתין</option>
            </select>
          </div>
          {(filterType !== 'all' || filterStatus !== 'all') && (
            <button
              onClick={() => {
                setFilterType('all')
                setFilterStatus('all')
              }}
              style={{
                width: '100%',
                padding: '6px',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                color: '#64748b',
                cursor: 'pointer',
              }}
            >
              🔄 אפס פילטרים
            </button>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {transactions.length > 0 && (
          <button
            onClick={() => exportCashFlowToExcel(transactions)}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: '#10B981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            📥 ייצא
          </button>
        )}
        <button
          onClick={onAddTransaction}
          style={{
            flex: transactions.length > 0 ? 1 : 'auto',
            padding: '10px',
            backgroundColor: '#6366F1',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          ➕ הוסף תנועה
        </button>
      </div>

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          backgroundColor: 'white',
          borderRadius: '12px',
          color: '#94a3b8',
        }}>
          {transactions.length === 0 ? '📝 עדיין אין תנועות' : '🔍 לא נמצאו תנועות מתאימות'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredTransactions.slice(0, 50).map((trans: any) => (
            <TransactionCardMobile 
              key={trans.id}
              transaction={trans}
              onEdit={onEditTransaction}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Helper Components
function SummaryCardMobile({ label, value, color }: any) {
  return (
    <div style={{
      padding: '12px',
      backgroundColor: 'white',
      borderRadius: '10px',
      borderRight: `4px solid ${color}`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    }}>
      <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '16px', fontWeight: '700', color: color }}>{value}</div>
    </div>
  )
}

function CategoryCardMobile({ category, onEdit }: any) {
  const formatNumber = (num: number) => new Intl.NumberFormat('he-IL').format(num)
  const percentage = Math.round((category.actual_expenses / category.contract_amount) * 100)
  const isOverBudget = category.actual_expenses > category.contract_amount

  return (
    <div style={{
      padding: '16px',
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      borderRight: `4px solid ${isOverBudget ? '#EF4444' : '#6366F1'}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
            {category.category_name}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            ₪{formatNumber(category.contract_amount)} • {percentage}%
          </div>
        </div>
        <button
          onClick={() => onEdit(category)}
          style={{
            padding: '6px 12px',
            backgroundColor: '#F1F5F9',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '600',
            color: '#475569',
            cursor: 'pointer',
          }}
        >
          ✏️ ערוך
        </button>
      </div>

      {/* Progress Bar */}
      <div style={{
        width: '100%',
        height: '6px',
        backgroundColor: '#F1F5F9',
        borderRadius: '3px',
        overflow: 'hidden',
        marginBottom: '12px',
      }}>
        <div style={{
          width: `${Math.min(percentage, 100)}%`,
          height: '100%',
          backgroundColor: isOverBudget ? '#EF4444' : percentage >= 85 ? '#F59E0B' : '#10B981',
          transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '11px' }}>
        <div>
          <div style={{ color: '#64748b', marginBottom: '2px' }}>הוצא</div>
          <div style={{ fontWeight: '600', color: '#1e293b' }}>₪{formatNumber(category.actual_expenses)}</div>
        </div>
        <div>
          <div style={{ color: '#64748b', marginBottom: '2px' }}>קיבל</div>
          <div style={{ fontWeight: '600', color: '#10B981' }}>₪{formatNumber(category.received_income)}</div>
        </div>
        <div>
          <div style={{ color: '#64748b', marginBottom: '2px' }}>רווח</div>
          <div style={{ 
            fontWeight: '600', 
            color: category.expected_profit >= 0 ? '#10B981' : '#EF4444' 
          }}>
            ₪{formatNumber(category.expected_profit)}
          </div>
        </div>
      </div>
    </div>
  )
}

function TransactionCardMobile({ transaction, onEdit }: any) {
  const formatNumber = (num: number) => new Intl.NumberFormat('he-IL').format(num)
  const isIncome = transaction.type === 'income'
  const isPaid = transaction.status === 'paid'

  return (
    <div style={{
      padding: '16px',
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      borderRight: `4px solid ${isIncome ? '#10B981' : '#EF4444'}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
            {transaction.description}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            {new Date(transaction.date).toLocaleDateString('he-IL')}
            {transaction.category && ` • ${transaction.category.name}`}
          </div>
        </div>
        <button
          onClick={() => onEdit(transaction)}
          style={{
            padding: '4px 8px',
            backgroundColor: '#F1F5F9',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          ✏️
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{
          fontSize: '18px',
          fontWeight: '700',
          color: isIncome ? '#10B981' : '#EF4444',
        }}>
          {isIncome ? '+' : '-'}₪{formatNumber(transaction.amount)}
        </div>
        <div style={{
          padding: '4px 10px',
          backgroundColor: isPaid ? '#D1FAE5' : '#FEF3C7',
          color: isPaid ? '#065F46' : '#92400E',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: '600',
        }}>
          {isPaid ? '✅ שולם' : '⏳ ממתין'}
        </div>
      </div>
    </div>
  )
}
