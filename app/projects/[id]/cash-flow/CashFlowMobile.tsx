'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

/**
 * דף תזרים מזומנים - גרסת מובייל
 * ממוטב למסכים קטנים
 */
export default function CashFlowMobile() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const supabase = createClient()

  const [project, setProject] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [cashFlowItems, setCashFlowItems] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  
  // Budget status
  const [budgetStatus, setBudgetStatus] = useState<{
    hasBudget: boolean
    totalCategories: number
    onBudget: number
    overBudget: number
    nearLimit: number
  } | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    description: '',
    category_id: '',
    date: new Date().toISOString().split('T')[0],
    status: 'paid',
  })

  useEffect(() => {
    loadData()
    loadBudgetStatus()
  }, [projectId])

  async function loadBudgetStatus() {
    try {
      const { data: budgetSettings } = await supabase
        .from('project_budget_settings')
        .select('*')
        .eq('project_id', projectId)
        .single()
      
      if (!budgetSettings) {
        setBudgetStatus({ hasBudget: false, totalCategories: 0, onBudget: 0, overBudget: 0, nearLimit: 0 })
        return
      }

      const { data: categoryBudgets } = await supabase
        .from('project_category_budgets')
        .select('category_id, budgeted_amount')
        .eq('project_id', projectId)
      
      if (!categoryBudgets || categoryBudgets.length === 0) {
        setBudgetStatus({ hasBudget: false, totalCategories: 0, onBudget: 0, overBudget: 0, nearLimit: 0 })
        return
      }

      const categoriesWithSpending = await Promise.all(
        categoryBudgets.map(async (budget) => {
          const { data: cashFlowData } = await supabase
            .from('cash_flow')
            .select('amount')
            .eq('project_id', projectId)
            .eq('category_id', budget.category_id)
            .in('type', ['expense', 'addition_expense'])
            .eq('status', 'paid')
          
          const spent = cashFlowData?.reduce((sum, item) => sum + parseFloat(item.amount), 0) || 0
          const percentage = budget.budgeted_amount > 0 ? (spent / budget.budgeted_amount * 100) : 0
          
          return { percentage }
        })
      )

      const onBudget = categoriesWithSpending.filter(c => c.percentage < 85).length
      const nearLimit = categoriesWithSpending.filter(c => c.percentage >= 85 && c.percentage <= 100).length
      const overBudget = categoriesWithSpending.filter(c => c.percentage > 100).length

      setBudgetStatus({
        hasBudget: true,
        totalCategories: categoryBudgets.length,
        onBudget,
        overBudget,
        nearLimit,
      })

    } catch (error) {
      console.error('Error loading budget status:', error)
      setBudgetStatus({ hasBudget: false, totalCategories: 0, onBudget: 0, overBudget: 0, nearLimit: 0 })
    }
  }

  async function loadData() {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) { window.location.href = '/login'; return }
      setUser(currentUser)

      const { data: projectData } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()
      
      setProject(projectData)

      const { data: categoriesData} = await supabase
        .from('cash_flow_categories')
        .select('*')
        .order('type', { ascending: true })
      
      setCategories(categoriesData || [])

      const { data: cashFlowData } = await supabase
        .from('cash_flow')
        .select('*, cash_flow_categories(*)')
        .eq('project_id', projectId)
        .order('date', { ascending: false })
      
      setCashFlowItems(cashFlowData || [])

    } catch (error) {
      console.error('Error loading cash flow:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!formData.amount || !formData.description || !formData.category_id) {
      setToast({ message: 'נא למלא את כל השדות', type: 'error' })
      return
    }

    try {
      await supabase.from('cash_flow').insert({
        project_id: projectId,
        type: formData.type,
        amount: parseFloat(formData.amount),
        description: formData.description,
        category_id: formData.category_id,
        date: formData.date,
        status: formData.status,
        created_by: user?.id,
      })

      setToast({ message: 'התנועה נוספה בהצלחה!', type: 'success' })
      setShowAddModal(false)
      setFormData({
        type: 'expense',
        amount: '',
        description: '',
        category_id: '',
        date: new Date().toISOString().split('T')[0],
        status: 'paid',
      })
      loadData()
      loadBudgetStatus()
    } catch (error) {
      setToast({ message: 'שגיאה בהוספת התנועה', type: 'error' })
    }
  }

  async function deleteItem(id: string) {
    if (!confirm('למחוק את התנועה?')) return
    
    try {
      await supabase.from('cash_flow').delete().eq('id', id)
      setToast({ message: 'התנועה נמחקה', type: 'success' })
      loadData()
      loadBudgetStatus()
    } catch (error) {
      setToast({ message: 'שגיאה במחיקה', type: 'error' })
    }
  }

  // חישובים
  const stats = {
    totalIncome: cashFlowItems
      .filter(i => (i.type === 'income' || i.type === 'addition_income') && i.status === 'paid')
      .reduce((sum, i) => sum + parseFloat(i.amount), 0),
    
    totalExpenses: cashFlowItems
      .filter(i => (i.type === 'expense' || i.type === 'addition_expense') && i.status === 'paid')
      .reduce((sum, i) => sum + parseFloat(i.amount), 0),
    
    pendingIncome: cashFlowItems
      .filter(i => (i.type === 'income' || i.type === 'addition_income') && i.status === 'pending')
      .reduce((sum, i) => sum + parseFloat(i.amount), 0),
    
    pendingExpenses: cashFlowItems
      .filter(i => (i.type === 'expense' || i.type === 'addition_expense') && i.status === 'pending')
      .reduce((sum, i) => sum + parseFloat(i.amount), 0),
    
    awaitingApproval: cashFlowItems
      .filter(i => i.status === 'awaiting_approval')
      .reduce((sum, i) => sum + parseFloat(i.amount), 0),
    
    additionsIncome: cashFlowItems
      .filter(i => i.type === 'addition_income' && i.status === 'paid')
      .reduce((sum, i) => sum + parseFloat(i.amount), 0),
    
    additionsExpense: cashFlowItems
      .filter(i => i.type === 'addition_expense' && i.status === 'paid')
      .reduce((sum, i) => sum + parseFloat(i.amount), 0),
  }

  const profit = stats.totalIncome - stats.totalExpenses
  const profitPercent = stats.totalIncome > 0 ? (profit / stats.totalIncome * 100).toFixed(1) : 0

  const filteredCategories = categories.filter(c => {
    if (formData.type === 'income' || formData.type === 'addition_income') return c.type === 'income'
    return c.type === 'expense'
  })

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

  if (!project) return <div style={{ padding: '20px', textAlign: 'center' }}>פרויקט לא נמצא</div>

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f8fafc',
      fontFamily: 'Heebo, sans-serif',
      direction: 'rtl',
      paddingBottom: '80px',
    }}>
      {/* Header - Mobile Optimized */}
      <div style={{ 
        padding: '16px',
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <button
          onClick={() => router.back()}
          style={{
            padding: '8px',
            backgroundColor: 'transparent',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            marginBottom: '12px',
          }}
        >
          ←
        </button>
        
        <h1 style={{ 
          fontSize: '24px', 
          fontWeight: '700', 
          margin: '0 0 4px 0',
          color: '#1e293b',
        }}>
          💰 תזרים מזומנים
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
          {project.name}
        </p>
      </div>

      {/* Contract Amount Card - Mobile */}
      {project?.contract_amount && (
        <div style={{
          margin: '16px',
          padding: '16px',
          backgroundColor: '#EFF6FF',
          border: '2px solid #3B82F6',
          borderRadius: '12px',
        }}>
          <div style={{ fontSize: '12px', color: '#1E40AF', marginBottom: '4px', fontWeight: '600' }}>
            💼 סכום חוזה
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#2563EB' }}>
            ₪{parseFloat(project.contract_amount).toLocaleString()}
          </div>
        </div>
      )}

      {/* Main Stats - Mobile Cards (Stacked) */}
      <div style={{ padding: '0 16px' }}>
        {/* Income */}
        <div style={{
          marginBottom: '12px',
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '2px solid #10B981',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>💰</div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#10B981', marginBottom: '8px' }}>
            ₪{stats.totalIncome.toLocaleString()}
          </div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
            סה"כ הכנסות
          </div>
          {stats.additionsIncome > 0 && (
            <div style={{ fontSize: '11px', color: '#059669' }}>
              כולל תוספות ₪{stats.additionsIncome.toLocaleString()}
            </div>
          )}
        </div>

        {/* Expenses */}
        <div style={{
          marginBottom: '12px',
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '2px solid #EF4444',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>💸</div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#EF4444', marginBottom: '8px' }}>
            ₪{stats.totalExpenses.toLocaleString()}
          </div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
            סה"כ הוצאות
          </div>
          {stats.additionsExpense > 0 && (
            <div style={{ fontSize: '11px', color: '#DC2626' }}>
              כולל תוספות ₪{stats.additionsExpense.toLocaleString()}
            </div>
          )}
        </div>

        {/* Profit */}
        <div style={{
          marginBottom: '12px',
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '12px',
          border: `2px solid ${profit >= 0 ? '#10B981' : '#EF4444'}`,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>
            {profit >= 0 ? '📈' : '📉'}
          </div>
          <div style={{ 
            fontSize: '28px', 
            fontWeight: '700', 
            color: profit >= 0 ? '#10B981' : '#EF4444', 
            marginBottom: '8px' 
          }}>
            ₪{Math.abs(profit).toLocaleString()}
          </div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
            {profit >= 0 ? '💎 רווח' : '⚠️ הפסד'}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            {profitPercent}% מההכנסות
          </div>
        </div>

        {/* Pending Payments */}
        {(stats.pendingIncome > 0 || stats.pendingExpenses > 0) && (
          <div style={{
            marginBottom: '12px',
            padding: '20px',
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '2px solid #F59E0B',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>⏳</div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#10B981', marginBottom: '8px' }}>
              ⬇️ ₪{stats.pendingIncome.toLocaleString()}
            </div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#EF4444', marginBottom: '8px' }}>
              ⬆️ ₪{stats.pendingExpenses.toLocaleString()}
            </div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
              תשלומים עתידיים
            </div>
          </div>
        )}

        {/* Budget Status - Mobile */}
        {budgetStatus && budgetStatus.hasBudget && (
          <div style={{
            marginBottom: '12px',
            padding: '16px',
            backgroundColor: 'white',
            borderRadius: '12px',
            border: `2px solid ${budgetStatus.overBudget > 0 ? '#EF4444' : '#10B981'}`,
          }}>
            <h4 style={{
              margin: '0 0 12px 0',
              fontSize: '14px',
              fontWeight: '600',
              color: '#64748b',
            }}>
              📊 מצב מול תקציב
            </h4>
            <div style={{ fontSize: '24px', fontWeight: '700', color: budgetStatus.overBudget > 0 ? '#EF4444' : '#10B981', marginBottom: '8px' }}>
              {budgetStatus.onBudget}/{budgetStatus.totalCategories}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
              {budgetStatus.overBudget > 0 ? '⚠️ יש חריגות' : '✅ הכל בסדר'}
            </div>
            <button
              onClick={() => router.push(`/projects/${projectId}/budget`)}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: budgetStatus.overBudget > 0 ? '#EF4444' : '#6366F1',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                fontFamily: 'Heebo, sans-serif',
              }}
            >
              📊 ראה פירוט מלא
            </button>
          </div>
        )}
      </div>

      {/* Awaiting Approval Alert */}
      {stats.awaitingApproval > 0 && (
        <div style={{
          margin: '16px',
          padding: '16px',
          backgroundColor: '#FEF3C7',
          border: '2px solid #F59E0B',
          borderRadius: '12px',
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '24px' }}>⚠️</span>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#92400E', flex: 1 }}>
              יש תוספות הוצאות בסך ₪{stats.awaitingApproval.toLocaleString()} הממתינות לאישור הלקוח
            </p>
          </div>
        </div>
      )}

      {/* Cash Flow List - Mobile */}
      <div style={{ padding: '0 16px' }}>
        <h2 style={{ 
          fontSize: '18px', 
          fontWeight: '700', 
          marginBottom: '16px',
          color: '#1e293b',
        }}>
          📋 רשימת תנועות
        </h2>

        {cashFlowItems.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 20px', 
            color: '#94a3b8',
            backgroundColor: 'white',
            borderRadius: '12px',
          }}>
            <p style={{ fontSize: '48px', marginBottom: '12px' }}>💰</p>
            <p style={{ fontSize: '14px', fontWeight: '500' }}>אין תנועות עדיין</p>
            <p style={{ fontSize: '12px', marginTop: '8px' }}>לחץ על הכפתור למטה כדי להתחיל</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {cashFlowItems.map(item => {
              const isIncome = item.type === 'income' || item.type === 'addition_income'
              const isAddition = item.type === 'addition_income' || item.type === 'addition_expense'
              const color = isIncome ? '#10B981' : '#EF4444'
              
              return (
                <div key={item.id} style={{
                  padding: '16px',
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  border: `2px solid ${item.status === 'awaiting_approval' ? '#F59E0B' : '#e5e7eb'}`,
                }}>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '28px' }}>
                      {item.cash_flow_categories?.icon || (isIncome ? '💰' : '💸')}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        marginBottom: '6px',
                        flexWrap: 'wrap',
                      }}>
                        <span style={{ 
                          fontSize: '18px', 
                          fontWeight: '700', 
                          color 
                        }}>
                          {isIncome ? '+' : '-'}₪{parseFloat(item.amount).toLocaleString()}
                        </span>
                        
                        {isAddition && (
                          <span style={{
                            padding: '2px 6px',
                            backgroundColor: '#DBEAFE',
                            color: '#1E40AF',
                            fontSize: '10px',
                            fontWeight: '600',
                            borderRadius: '4px',
                          }}>
                            ➕
                          </span>
                        )}
                        
                        {item.status === 'pending' && (
                          <span style={{
                            padding: '2px 6px',
                            backgroundColor: '#FEF3C7',
                            color: '#92400E',
                            fontSize: '10px',
                            fontWeight: '600',
                            borderRadius: '4px',
                          }}>
                            ⏳
                          </span>
                        )}
                        
                        {item.status === 'awaiting_approval' && (
                          <span style={{
                            padding: '2px 6px',
                            backgroundColor: '#FEE2E2',
                            color: '#991B1B',
                            fontSize: '10px',
                            fontWeight: '600',
                            borderRadius: '4px',
                          }}>
                            ⚠️
                          </span>
                        )}
                      </div>
                      
                      <p style={{ 
                        margin: '0 0 6px 0', 
                        fontSize: '14px', 
                        fontWeight: '600',
                        color: '#1e293b' 
                      }}>
                        {item.description}
                      </p>
                      
                      <div style={{ 
                        fontSize: '11px',
                        color: '#64748b',
                      }}>
                        <div>{item.cash_flow_categories?.name}</div>
                        <div>{new Date(item.date).toLocaleDateString('he-IL')}</div>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => deleteItem(item.id)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      backgroundColor: '#FEE2E2',
                      color: '#DC2626',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontFamily: 'Heebo, sans-serif',
                    }}
                  >
                    🗑️ מחק תנועה
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Floating Add Button - Mobile */}
      <button
        onClick={() => setShowAddModal(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)',
          maxWidth: '400px',
          padding: '16px',
          backgroundColor: '#6366F1',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          fontSize: '16px',
          fontWeight: '700',
          cursor: 'pointer',
          fontFamily: 'Heebo, sans-serif',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          zIndex: 50,
        }}
      >
        ➕ תנועה חדשה
      </button>

      {/* Add Modal - Mobile Optimized */}
      {showAddModal && (
        <div 
          onClick={() => setShowAddModal(false)}
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: 'rgba(0,0,0,0.5)', 
            display: 'flex', 
            alignItems: 'flex-end',
            justifyContent: 'center', 
            zIndex: 1000,
            padding: 0,
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              borderRadius: '20px 20px 0 0',
              padding: '24px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px',
            }}>
              <h2 style={{ 
                fontSize: '20px', 
                fontWeight: '700', 
                margin: 0,
                color: '#1e293b',
              }}>
                ➕ תנועה חדשה
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  fontSize: '24px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: '#64748b',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  marginBottom: '8px',
                  color: '#374151',
                }}>
                  סוג התנועה
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {[
                    { value: 'income', label: '💰 הכנסה' },
                    { value: 'expense', label: '💸 הוצאה' },
                    { value: 'addition_income', label: '➕ הכנסה' },
                    { value: 'addition_expense', label: '➕ הוצאה' },
                  ].map(type => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: type.value, category_id: '' })}
                      style={{
                        padding: '12px 8px',
                        backgroundColor: formData.type === type.value ? '#EFF6FF' : 'white',
                        border: `2px solid ${formData.type === type.value ? '#6366F1' : '#e5e7eb'}`,
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontFamily: 'Heebo, sans-serif',
                        color: formData.type === type.value ? '#6366F1' : '#64748b',
                      }}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  marginBottom: '8px',
                  color: '#374151',
                }}>
                  סכום
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontFamily: 'Heebo, sans-serif',
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  marginBottom: '8px',
                  color: '#374151',
                }}>
                  תיאור
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="תיאור התנועה..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'Heebo, sans-serif',
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  marginBottom: '8px',
                  color: '#374151',
                }}>
                  קטגוריה
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'Heebo, sans-serif',
                  }}
                  required
                >
                  <option value="">בחר קטגוריה...</option>
                  {filteredCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  marginBottom: '8px',
                  color: '#374151',
                }}>
                  תאריך
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'Heebo, sans-serif',
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  marginBottom: '8px',
                  color: '#374151',
                }}>
                  סטטוס
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { value: 'paid', label: '✅ שולם' },
                    { value: 'pending', label: '⏳ צפוי' },
                    ...(formData.type === 'addition_expense' ? [{ value: 'awaiting_approval', label: '⚠️ ממתין' }] : []),
                  ].map(status => (
                    <button
                      key={status.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, status: status.value })}
                      style={{
                        flex: 1,
                        minWidth: '100px',
                        padding: '10px',
                        backgroundColor: formData.status === status.value ? '#EFF6FF' : 'white',
                        border: `2px solid ${formData.status === status.value ? '#6366F1' : '#e5e7eb'}`,
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontFamily: 'Heebo, sans-serif',
                        color: formData.status === status.value ? '#6366F1' : '#64748b',
                      }}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '14px',
                  backgroundColor: '#10B981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontFamily: 'Heebo, sans-serif',
                }}
              >
                💾 שמור תנועה
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div 
          style={{
            position: 'fixed',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '12px 20px',
            backgroundColor: toast.type === 'success' ? '#10B981' : '#EF4444',
            color: 'white',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            zIndex: 1000,
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}
