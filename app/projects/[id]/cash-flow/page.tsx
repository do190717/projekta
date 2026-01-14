'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Sidebar from '../components/Sidebar'

export default function CashFlowPage() {
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

  if (!project) return <div>פרויקט לא נמצא</div>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <Sidebar projectName={project.name} />

      <div className="cash-flow-container" style={{ 
        marginRight: '260px',
        flex: 1,
        padding: '32px',
        fontFamily: 'Heebo, sans-serif',
        direction: 'rtl',
        display: 'flex',
        justifyContent: 'center',
      }}>
        <div style={{ 
          width: '100%', 
          maxWidth: '1400px'
        }}>
        {/* Header */}
        <div className="cash-flow-header" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div>
            <h1 style={{ 
              fontSize: '32px', 
              fontWeight: '700', 
              margin: '0 0 8px 0',
              color: '#1e293b',
            }}>
              💰 תזרים מזומנים
            </h1>
            <p style={{ color: '#64748b', fontSize: '16px', margin: 0 }}>
              ניהול הכנסות והוצאות - {project.name}
            </p>
          </div>
          
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '12px 24px',
              backgroundColor: '#6366F1',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              fontFamily: 'Heebo, sans-serif',
            }}
          >
            ➕ תנועה חדשה
          </button>
        </div>

        {/* Top Row - 3 Small Cards */}
        <div className="top-cards-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
          marginBottom: '24px',
        }}>
          {/* Card 1: Original Contract */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            border: '1px solid #e5e7eb',
          }}>
            <div style={{
              margin: '0 0 16px 0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
            }}>
              <h4 style={{
                margin: 0,
                fontSize: '14px',
                fontWeight: '600',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                📋 תקציב חוזה
              </h4>
              
              {project?.contract_amount && (
                <div style={{
                  padding: '4px 12px',
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  <span style={{ fontSize: '14px' }}>💼</span>
                  <span style={{
                    fontSize: '15px',
                    fontWeight: '700',
                    color: '#2563EB',
                  }}>
                    ₪{parseFloat(project.contract_amount).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>הכנסות</span>
                <span style={{ fontSize: '16px', fontWeight: '700', color: '#10B981' }}>
                  ₪{(stats.totalIncome - stats.additionsIncome).toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>הוצאות</span>
                <span style={{ fontSize: '16px', fontWeight: '700', color: '#EF4444' }}>
                  ₪{(stats.totalExpenses - stats.additionsExpense).toLocaleString()}
                </span>
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                paddingTop: '12px',
                borderTop: '1px solid #e5e7eb',
              }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>רווח</span>
                <span style={{ fontSize: '16px', fontWeight: '700', color: '#6366F1' }}>
                  ₪{((stats.totalIncome - stats.additionsIncome) - (stats.totalExpenses - stats.additionsExpense)).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Additions */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            border: '1px solid #e5e7eb',
          }}>
            <h4 style={{
              margin: '0 0 16px 0',
              fontSize: '14px',
              fontWeight: '600',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              ➕ תוספות לחוזה
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>הכנסות</span>
                <span style={{ fontSize: '16px', fontWeight: '700', color: '#10B981' }}>
                  +₪{stats.additionsIncome.toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>הוצאות</span>
                <span style={{ fontSize: '16px', fontWeight: '700', color: '#EF4444' }}>
                  +₪{stats.additionsExpense.toLocaleString()}
                </span>
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                paddingTop: '12px',
                borderTop: '1px solid #e5e7eb',
              }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>רווח</span>
                <span style={{ 
                  fontSize: '16px', 
                  fontWeight: '700', 
                  color: (stats.additionsIncome - stats.additionsExpense) >= 0 ? '#10B981' : '#EF4444' 
                }}>
                  ₪{(stats.additionsIncome - stats.additionsExpense).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Budget Status */}
          {budgetStatus && budgetStatus.hasBudget ? (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              border: `1px solid ${budgetStatus.overBudget > 0 ? '#EF4444' : '#e5e7eb'}`,
            }}>
              <h4 style={{
                margin: '0 0 16px 0',
                fontSize: '14px',
                fontWeight: '600',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                📊 מצב מול תקציב
              </h4>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: budgetStatus.overBudget > 0 ? '#EF4444' : '#10B981', marginBottom: '4px' }}>
                  {budgetStatus.onBudget}/{budgetStatus.totalCategories}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  {budgetStatus.overBudget > 0 ? '⚠️ יש חריגות' : '✅ הכל בסדר'}
                </div>
              </div>
              <button
                onClick={() => router.push(`/projects/${projectId}/budget`)}
                style={{
                  width: '100%',
                  padding: '8px',
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
                📊 ראה פירוט
              </button>
            </div>
          ) : (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              border: '1px solid #e5e7eb',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
              <div style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', marginBottom: '12px' }}>
                לא הוגדר תקציב
              </div>
              <button
                onClick={() => router.push(`/projects/${projectId}/budget/setup`)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6366F1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontFamily: 'Heebo, sans-serif',
                }}
              >
                הגדר תקציב
              </button>
            </div>
          )}
        </div>

        {/* Main Stats - 4 Big Cards */}
        <div className="main-stats-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '20px',
          marginBottom: '32px',
        }}>
          {/* Total Income */}
          <div style={{
            padding: '28px',
            backgroundColor: 'white',
            borderRadius: '16px',
            border: '3px solid #10B981',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>💰</div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#10B981', marginBottom: '8px' }}>
              ₪{stats.totalIncome.toLocaleString()}
            </div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
              סה"כ הכנסות
            </div>
            {stats.additionsIncome > 0 && (
              <div style={{ fontSize: '12px', color: '#059669', marginTop: '8px' }}>
                כולל תוספות ₪{stats.additionsIncome.toLocaleString()}
              </div>
            )}
          </div>

          {/* Total Expenses */}
          <div style={{
            padding: '28px',
            backgroundColor: 'white',
            borderRadius: '16px',
            border: '3px solid #EF4444',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>💸</div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#EF4444', marginBottom: '8px' }}>
              ₪{stats.totalExpenses.toLocaleString()}
            </div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
              סה"כ הוצאות
            </div>
            {stats.additionsExpense > 0 && (
              <div style={{ fontSize: '12px', color: '#DC2626', marginTop: '8px' }}>
                כולל תוספות ₪{stats.additionsExpense.toLocaleString()}
              </div>
            )}
          </div>

          {/* Profit */}
          <div style={{
            padding: '28px',
            backgroundColor: 'white',
            borderRadius: '16px',
            border: `3px solid ${profit >= 0 ? '#10B981' : '#EF4444'}`,
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>
              {profit >= 0 ? '📈' : '📉'}
            </div>
            <div style={{ 
              fontSize: '32px', 
              fontWeight: '700', 
              color: profit >= 0 ? '#10B981' : '#EF4444', 
              marginBottom: '8px' 
            }}>
              ₪{Math.abs(profit).toLocaleString()}
            </div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
              {profit >= 0 ? '💎 רווח' : '⚠️ הפסד'}
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
              {profitPercent}% מההכנסות
            </div>
          </div>

          {/* Pending */}
          <div style={{
            padding: '28px',
            backgroundColor: 'white',
            borderRadius: '16px',
            border: '3px solid #F59E0B',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#10B981', marginBottom: '8px' }}>
              ⬇️ ₪{stats.pendingIncome.toLocaleString()}
            </div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#EF4444', marginBottom: '8px' }}>
              ⬆️ ₪{stats.pendingExpenses.toLocaleString()}
            </div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
              תשלומים עתידיים
            </div>
          </div>
        </div>

        {/* Awaiting Approval Alert */}
        {stats.awaitingApproval > 0 && (
          <div style={{
            padding: '16px 20px',
            backgroundColor: '#FEF3C7',
            border: '2px solid #F59E0B',
            borderRadius: '12px',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <span style={{ fontSize: '28px' }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#92400E' }}>
                יש תוספות הוצאות בסך ₪{stats.awaitingApproval.toLocaleString()} הממתינות לאישור הלקוח
              </p>
            </div>
          </div>
        )}

        {/* Cash Flow List */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '28px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{ 
            fontSize: '20px', 
            fontWeight: '700', 
            marginBottom: '24px',
            color: '#1e293b',
          }}>
            📋 רשימת תנועות
          </h2>

          {cashFlowItems.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '60px 40px', 
              color: '#94a3b8' 
            }}>
              <p style={{ fontSize: '48px', marginBottom: '12px' }}>💰</p>
              <p style={{ fontSize: '15px', fontWeight: '500' }}>אין תנועות עדיין</p>
              <p style={{ fontSize: '13px', marginTop: '8px' }}>לחץ על "תנועה חדשה" כדי להתחיל</p>
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
                    backgroundColor: '#f8fafc',
                    borderRadius: '12px',
                    border: `2px solid ${item.status === 'awaiting_approval' ? '#F59E0B' : '#e5e7eb'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    flexWrap: 'wrap',
                  }}>
                    <div style={{ fontSize: '32px' }}>
                      {item.cash_flow_categories?.icon || (isIncome ? '💰' : '💸')}
                    </div>
                    
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        marginBottom: '4px',
                        flexWrap: 'wrap',
                      }}>
                        <span style={{ 
                          fontSize: '16px', 
                          fontWeight: '700', 
                          color 
                        }}>
                          {isIncome ? '+' : '-'}₪{parseFloat(item.amount).toLocaleString()}
                        </span>
                        
                        {isAddition && (
                          <span style={{
                            padding: '2px 8px',
                            backgroundColor: '#DBEAFE',
                            color: '#1E40AF',
                            fontSize: '11px',
                            fontWeight: '600',
                            borderRadius: '6px',
                          }}>
                            ➕ תוספת
                          </span>
                        )}
                        
                        {item.status === 'pending' && (
                          <span style={{
                            padding: '2px 8px',
                            backgroundColor: '#FEF3C7',
                            color: '#92400E',
                            fontSize: '11px',
                            fontWeight: '600',
                            borderRadius: '6px',
                          }}>
                            ⏳ צפוי
                          </span>
                        )}
                        
                        {item.status === 'awaiting_approval' && (
                          <span style={{
                            padding: '2px 8px',
                            backgroundColor: '#FEE2E2',
                            color: '#991B1B',
                            fontSize: '11px',
                            fontWeight: '600',
                            borderRadius: '6px',
                          }}>
                            ⚠️ ממתין לאישור
                          </span>
                        )}
                      </div>
                      
                      <p style={{ 
                        margin: '0 0 4px 0', 
                        fontSize: '14px', 
                        fontWeight: '600',
                        color: '#1e293b' 
                      }}>
                        {item.description}
                      </p>
                      
                      <div style={{ 
                        display: 'flex', 
                        gap: '12px',
                        fontSize: '12px',
                        color: '#64748b',
                        flexWrap: 'wrap',
                      }}>
                        <span>{item.cash_flow_categories?.name}</span>
                        <span>•</span>
                        <span>{new Date(item.date).toLocaleDateString('he-IL')}</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => deleteItem(item.id)}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#FEE2E2',
                        color: '#DC2626',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontFamily: 'Heebo, sans-serif',
                      }}
                    >
                      🗑️ מחק
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Add Modal - SAME AS BEFORE */}
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
            backdropFilter: 'blur(4px)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 1000 
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '32px',
              width: '90%',
              maxWidth: '500px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <h2 style={{ 
              fontSize: '24px', 
              fontWeight: '700', 
              marginBottom: '24px',
              color: '#1e293b',
            }}>
              ➕ תנועה חדשה
            </h2>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  marginBottom: '8px',
                  color: '#374151',
                }}>
                  סוג התנועה
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  {[
                    { value: 'income', label: '💰 הכנסה' },
                    { value: 'expense', label: '💸 הוצאה' },
                    { value: 'addition_income', label: '➕ תוספת הכנסה' },
                    { value: 'addition_expense', label: '➕ תוספת הוצאה' },
                  ].map(type => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: type.value, category_id: '' })}
                      style={{
                        padding: '12px',
                        backgroundColor: formData.type === type.value ? '#EFF6FF' : 'white',
                        border: `2px solid ${formData.type === type.value ? '#6366F1' : '#e5e7eb'}`,
                        borderRadius: '10px',
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

              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '14px', 
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
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontFamily: 'Heebo, sans-serif',
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '14px', 
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
                  placeholder="לדוגמה: תשלום ביניים 2, חשמל קומה 3..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontFamily: 'Heebo, sans-serif',
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '14px', 
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
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontFamily: 'Heebo, sans-serif',
                    cursor: 'pointer',
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

              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '14px', 
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
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontFamily: 'Heebo, sans-serif',
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  marginBottom: '8px',
                  color: '#374151',
                }}>
                  סטטוס
                </label>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {[
                    { value: 'paid', label: '✅ שולם', show: true },
                    { value: 'pending', label: '⏳ צפוי', show: true },
                    { value: 'awaiting_approval', label: '⚠️ ממתין לאישור', show: formData.type === 'addition_expense' },
                  ].filter(s => s.show).map(status => (
                    <button
                      key={status.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, status: status.value })}
                      style={{
                        flex: 1,
                        minWidth: '120px',
                        padding: '12px',
                        backgroundColor: formData.status === status.value ? '#EFF6FF' : 'white',
                        border: `2px solid ${formData.status === status.value ? '#6366F1' : '#e5e7eb'}`,
                        borderRadius: '10px',
                        fontSize: '13px',
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

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: 'white',
                    border: '2px solid #e5e7eb',
                    borderRadius: '10px',
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
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#10B981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontFamily: 'Heebo, sans-serif',
                  }}
                >
                  💾 שמור
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div 
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            padding: '16px 24px',
            backgroundColor: toast.type === 'success' ? '#10B981' : '#EF4444',
            color: 'white',
            borderRadius: '12px',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
            fontSize: '15px',
            fontWeight: '600',
            zIndex: 1000,
            animation: 'slideIn 0.3s ease',
          }}
        >
          {toast.message}
        </div>
      )}

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateY(100px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        /* Responsive Design */
        @media (max-width: 1200px) {
          .main-stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }

        @media (max-width: 768px) {
          .cash-flow-container {
            margin-right: 0 !important;
            padding: 16px !important;
          }

          .cash-flow-header {
            flex-direction: column;
            align-items: flex-start !important;
          }

          .cash-flow-header button {
            width: 100%;
          }

          .top-cards-grid {
            grid-template-columns: 1fr !important;
          }

          .main-stats-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }

          .main-stats-grid > div {
            padding: 20px !important;
          }

          .main-stats-grid > div > div:first-child {
            font-size: 40px !important;
          }

          .main-stats-grid > div > div:nth-child(2) {
            font-size: 28px !important;
          }
        }

        @media (max-width: 480px) {
          .cash-flow-header h1 {
            font-size: 24px !important;
          }

          .cash-flow-header p {
            font-size: 14px !important;
          }
        }
      `}</style>
    </div>
  )
}
