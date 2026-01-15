'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

/**
 * דף תקציב - גרסת מובייל
 * ממוטב למסכים קטנים
 */
export default function BudgetMobile() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const supabase = createClient()

  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [budgetSettings, setBudgetSettings] = useState<any>(null)
  const [budgetData, setBudgetData] = useState<any[]>([])
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadData()
  }, [projectId])

  async function loadData() {
    try {
      const { data: projectData } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()
      
      setProject(projectData)

      const { data: settingsData } = await supabase
        .from('project_budget_settings')
        .select('*')
        .eq('project_id', projectId)
        .single()
      
      setBudgetSettings(settingsData)

      if (!settingsData?.setup_completed) {
        router.push(`/projects/${projectId}/budget/setup`)
        return
      }

      const { data: categoryBudgetsData } = await supabase
        .from('project_category_budgets')
        .select(`
          *,
          cash_flow_categories (
            name,
            icon,
            color,
            type
          )
        `)
        .eq('project_id', projectId)
        .order('budgeted_amount', { ascending: false })
      
      const budgetVsActualData = await Promise.all(
        (categoryBudgetsData || []).map(async (budget) => {
          const { data: cashFlowData } = await supabase
            .from('cash_flow')
            .select('amount')
            .eq('project_id', projectId)
            .eq('category_id', budget.category_id)
            .in('type', ['expense', 'addition_expense'])
            .eq('status', 'paid')
          
          const spent = cashFlowData?.reduce((sum, item) => sum + parseFloat(item.amount), 0) || 0
          const remaining = parseFloat(budget.budgeted_amount) - spent
          const percentage = budget.budgeted_amount > 0 ? (spent / budget.budgeted_amount * 100) : 0
          
          return {
            project_id: budget.project_id,
            category_id: budget.category_id,
            category_name: budget.cash_flow_categories?.name || '',
            icon: budget.cash_flow_categories?.icon || '📦',
            color: budget.cash_flow_categories?.color || '#6366F1',
            type: budget.cash_flow_categories?.type || 'expense',
            budgeted_amount: budget.budgeted_amount,
            spent_amount: spent,
            remaining_amount: remaining,
            percentage_used: percentage,
          }
        })
      )
      
      const dataWithTransactions = await Promise.all(
        (budgetVsActualData || []).map(async (item) => {
          const { data: transactions } = await supabase
            .from('cash_flow')
            .select('*')
            .eq('project_id', projectId)
            .eq('category_id', item.category_id)
            .in('type', ['expense', 'addition_expense'])
            .order('date', { ascending: false })
            .limit(3)
          
          return {
            ...item,
            recent_transactions: transactions || []
          }
        })
      )
      
      setBudgetData(dataWithTransactions || [])
    } catch (error) {
      console.error('Error loading budget:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  const totalBudgeted = budgetData.reduce((sum, item) => sum + parseFloat(item.budgeted_amount), 0)
  const totalSpent = budgetData.reduce((sum, item) => sum + item.spent_amount, 0)
  const totalRemaining = totalBudgeted - totalSpent

  const overBudgetCategories = budgetData.filter(item => item.percentage_used > 100)
  const nearLimitCategories = budgetData.filter(item => item.percentage_used >= 85 && item.percentage_used <= 100)

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        fontFamily: 'Heebo, sans-serif'
      }}>
        <p>טוען תקציב...</p>
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
      {/* Header - Mobile */}
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
          📊 תקציב מפורט
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
          {project.name}
        </p>
      </div>

      {/* Overall Summary - Mobile */}
      <div style={{ padding: '16px' }}>
        <div style={{
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '16px',
          marginBottom: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: '700', 
            marginBottom: '20px',
            color: '#1e293b',
          }}>
            📈 סיכום כללי
          </h2>

          {/* Total Budget */}
          <div style={{ marginBottom: '16px' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#64748b' }}>
              תקציב כולל
            </p>
            <p style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#6366F1' }}>
              ₪{totalBudgeted.toLocaleString()}
            </p>
          </div>

          {/* Total Spent */}
          <div style={{ marginBottom: '16px' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#64748b' }}>
              בוצע עד כה
            </p>
            <p style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#EF4444' }}>
              ₪{totalSpent.toLocaleString()}
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              {totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0}% מהתקציב
            </p>
          </div>

          {/* Remaining */}
          <div style={{ marginBottom: '16px' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#64748b' }}>
              יתרה
            </p>
            <p style={{ 
              margin: 0, 
              fontSize: '28px', 
              fontWeight: '700', 
              color: totalRemaining >= 0 ? '#10B981' : '#EF4444' 
            }}>
              ₪{Math.abs(totalRemaining).toLocaleString()}
            </p>
            <p style={{ 
              margin: '4px 0 0 0', 
              fontSize: '12px', 
              color: totalRemaining >= 0 ? '#10B981' : '#EF4444' 
            }}>
              {totalRemaining >= 0 ? 'בתקציב ✅' : 'חריגה ⚠️'}
            </p>
          </div>

          {/* Progress Bar */}
          <div>
            <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#64748b' }}>
              התקדמות
            </p>
            <div style={{
              height: '32px',
              backgroundColor: '#E5E7EB',
              borderRadius: '16px',
              overflow: 'hidden',
              position: 'relative',
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min((totalSpent / totalBudgeted) * 100, 100)}%`,
                backgroundColor: totalSpent > totalBudgeted ? '#EF4444' : '#10B981',
                transition: 'width 0.3s ease',
              }} />
              <span style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: '14px',
                fontWeight: '700',
                color: '#1e293b',
              }}>
                {totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Alerts - Mobile */}
        {(overBudgetCategories.length > 0 || nearLimitCategories.length > 0) && (
          <div style={{
            padding: '16px',
            backgroundColor: 'white',
            borderRadius: '12px',
            marginBottom: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <h2 style={{ 
              fontSize: '16px', 
              fontWeight: '700', 
              marginBottom: '12px',
              color: '#1e293b',
            }}>
              🔔 התראות
            </h2>

            {overBudgetCategories.length > 0 && (
              <div style={{
                padding: '12px',
                backgroundColor: '#FEE2E2',
                border: '2px solid #EF4444',
                borderRadius: '8px',
                marginBottom: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '20px' }}>⚠️</span>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#991B1B' }}>
                    {overBudgetCategories.length} קטגוריות בחריגה
                  </span>
                </div>
                {overBudgetCategories.slice(0, 3).map((cat) => (
                  <div key={cat.category_id} style={{ 
                    fontSize: '13px', 
                    color: '#991B1B',
                    marginBottom: '4px',
                  }}>
                    {cat.icon} {cat.category_name}: חריגה של ₪{Math.abs(cat.remaining_amount).toLocaleString()}
                  </div>
                ))}
              </div>
            )}

            {nearLimitCategories.length > 0 && (
              <div style={{
                padding: '12px',
                backgroundColor: '#FEF3C7',
                border: '2px solid #F59E0B',
                borderRadius: '8px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '20px' }}>⚡</span>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#92400E' }}>
                    {nearLimitCategories.length} קטגוריות מתקרבות לגבול
                  </span>
                </div>
                {nearLimitCategories.slice(0, 3).map((cat) => (
                  <div key={cat.category_id} style={{ 
                    fontSize: '13px', 
                    color: '#92400E',
                    marginBottom: '4px',
                  }}>
                    {cat.icon} {cat.category_name}: נותרו ₪{cat.remaining_amount.toLocaleString()}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Categories List - Mobile */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {budgetData.map((item) => {
            const isExpanded = expandedCategories.has(item.category_id)
            const statusColor = 
              item.percentage_used > 100 ? '#EF4444' : 
              item.percentage_used >= 85 ? '#F59E0B' : '#10B981'
            const statusIcon = 
              item.percentage_used > 100 ? '⚠️' : 
              item.percentage_used >= 85 ? '⚡' : '✅'

            return (
              <div 
                key={item.category_id} 
                style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  border: `2px solid ${item.percentage_used > 100 ? '#EF4444' : '#e5e7eb'}`,
                }}
              >
                {/* Category Header */}
                <div 
                  onClick={() => toggleCategory(item.category_id)}
                  style={{
                    padding: '16px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '32px' }}>{item.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <h3 style={{ 
                          margin: 0, 
                          fontSize: '16px', 
                          fontWeight: '700',
                          color: '#1e293b',
                        }}>
                          {item.category_name}
                        </h3>
                        <span style={{ fontSize: '18px' }}>{statusIcon}</span>
                      </div>
                      <div style={{ 
                        fontSize: '13px', 
                        color: '#64748b',
                        display: 'flex',
                        gap: '12px',
                        flexWrap: 'wrap',
                      }}>
                        <span>
                          תקציב: ₪{parseFloat(item.budgeted_amount).toLocaleString()}
                        </span>
                        <span>•</span>
                        <span style={{ color: statusColor, fontWeight: '600' }}>
                          בוצע: ₪{item.spent_amount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize: '20px', color: '#94a3b8' }}>
                      {isExpanded ? '▼' : '◀'}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div style={{
                    height: '24px',
                    backgroundColor: '#E5E7EB',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    position: 'relative',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(item.percentage_used, 100)}%`,
                      backgroundColor: statusColor,
                      transition: 'width 0.3s ease',
                    }} />
                    <span style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      fontSize: '12px',
                      fontWeight: '700',
                      color: '#1e293b',
                    }}>
                      {Math.round(item.percentage_used)}%
                    </span>
                  </div>

                  {/* Remaining */}
                  <div style={{ 
                    marginTop: '12px',
                    padding: '8px 12px',
                    backgroundColor: item.remaining_amount >= 0 ? '#F0FDF4' : '#FEE2E2',
                    borderRadius: '8px',
                    textAlign: 'center',
                  }}>
                    <span style={{ 
                      fontSize: '14px', 
                      fontWeight: '600',
                      color: item.remaining_amount >= 0 ? '#10B981' : '#EF4444',
                    }}>
                      {item.remaining_amount >= 0 ? 'נותר' : 'חריגה'}: ₪{Math.abs(item.remaining_amount).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Expanded - Recent Transactions */}
                {isExpanded && item.recent_transactions && item.recent_transactions.length > 0 && (
                  <div style={{
                    padding: '16px',
                    backgroundColor: '#f8fafc',
                    borderTop: '1px solid #e5e7eb',
                  }}>
                    <h4 style={{ 
                      margin: '0 0 12px 0', 
                      fontSize: '14px', 
                      fontWeight: '700',
                      color: '#64748b',
                    }}>
                      תנועות אחרונות:
                    </h4>
                    {item.recent_transactions.map((transaction: any, idx: number) => (
                      <div 
                        key={idx}
                        style={{
                          padding: '12px',
                          backgroundColor: 'white',
                          borderRadius: '8px',
                          marginBottom: idx < item.recent_transactions.length - 1 ? '8px' : 0,
                        }}
                      >
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          marginBottom: '4px',
                        }}>
                          <span style={{ 
                            fontSize: '14px', 
                            fontWeight: '600',
                            color: '#1e293b',
                          }}>
                            {transaction.description}
                          </span>
                          <span style={{ 
                            fontSize: '14px', 
                            fontWeight: '700',
                            color: '#EF4444',
                          }}>
                            -₪{parseFloat(transaction.amount).toLocaleString()}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                          {new Date(transaction.date).toLocaleDateString('he-IL')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Floating Action Buttons - Mobile */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: '400px',
        display: 'flex',
        gap: '12px',
        zIndex: 50,
      }}>
        <button
          onClick={() => router.push(`/projects/${projectId}/budget/setup`)}
          style={{
            flex: 1,
            padding: '14px',
            backgroundColor: 'white',
            border: '2px solid #E5E7EB',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            fontFamily: 'Heebo, sans-serif',
            color: '#64748b',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          }}
        >
          ⚙️ ערוך
        </button>
        <button
          onClick={() => router.push(`/projects/${projectId}/cash-flow`)}
          style={{
            flex: 1,
            padding: '14px',
            backgroundColor: '#6366F1',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            fontFamily: 'Heebo, sans-serif',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          }}
        >
          💰 תזרים
        </button>
      </div>
    </div>
  )
}
