'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Sidebar from '../components/Sidebar'

export default function BudgetDesktop() {
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
      // Load project
      const { data: projectData } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()
      
      setProject(projectData)

      // Load budget settings
      const { data: settingsData } = await supabase
        .from('project_budget_settings')
        .select('*')
        .eq('project_id', projectId)
        .single()
      
      setBudgetSettings(settingsData)

      // If no budget setup, redirect to setup
      if (!settingsData?.setup_completed) {
        router.push(`/projects/${projectId}/budget/setup`)
        return
      }

      // Load budget data directly (no view)
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
      
      // Calculate spent amounts for each category
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
      
      // Load recent transactions for each category
      if (budgetVsActualData) {
        const dataWithTransactions = await Promise.all(
          budgetVsActualData.map(async (item) => {
            const { data: transactions } = await supabase
              .from('cash_flow')
              .select('*')
              .eq('project_id', projectId)
              .eq('category_id', item.category_id)
              .in('type', ['expense', 'addition_expense'])
              .order('date', { ascending: false })
              .limit(5)
            
            return { ...item, transactions: transactions || [] }
          })
        )
        setBudgetData(dataWithTransactions)
      }

    } catch (error) {
      console.error('Error loading budget:', error)
    } finally {
      setLoading(false)
    }
  }

  function toggleCategory(categoryId: string) {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  // Calculate totals
  const totalBudgeted = budgetData.reduce((sum, item) => sum + parseFloat(item.budgeted_amount || 0), 0)
  const totalSpent = budgetData.reduce((sum, item) => sum + parseFloat(item.spent_amount || 0), 0)
  const totalRemaining = totalBudgeted - totalSpent
  const overBudgetCategories = budgetData.filter(item => parseFloat(item.percentage_used) > 100)
  const nearLimitCategories = budgetData.filter(item => {
    const pct = parseFloat(item.percentage_used)
    return pct >= 85 && pct <= 100
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
        <p>טוען תקציב...</p>
      </div>
    )
  }

  if (!project) return <div>פרויקט לא נמצא</div>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <Sidebar projectName={project.name} />

      <div style={{ 
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
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '32px'
          }}>
            <div>
              <h1 style={{ 
                fontSize: '32px', 
                fontWeight: '700', 
                margin: '0 0 8px 0',
                color: '#1e293b',
              }}>
                📊 תקציב מפורט
              </h1>
              <p style={{ color: '#64748b', fontSize: '16px', margin: 0 }}>
                מעקב אחר תכנון לעומת ביצוע - {project.name}
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => router.push(`/projects/${projectId}/budget/setup`)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'white',
                  border: '2px solid #E5E7EB',
                  borderRadius: '10px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontFamily: 'Heebo, sans-serif',
                  color: '#64748b',
                }}
              >
                ⚙️ ערוך תקציב
              </button>
              <button
                onClick={() => router.push(`/projects/${projectId}/cash-flow`)}
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
                💰 תזרים מזומנים
              </button>
            </div>
          </div>

          {/* Overall Summary */}
          <div style={{
            padding: '32px',
            backgroundColor: 'white',
            borderRadius: '20px',
            marginBottom: '32px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '2px solid #E5E7EB',
          }}>
            <h2 style={{ 
              fontSize: '20px', 
              fontWeight: '700', 
              marginBottom: '24px',
              color: '#1e293b',
            }}>
              📈 סיכום כללי
            </h2>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
            }}>
              {/* Total Budget */}
              <div>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#64748b' }}>
                  תקציב כולל
                </p>
                <p style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: '#6366F1' }}>
                  ₪{totalBudgeted.toLocaleString()}
                </p>
              </div>

              {/* Total Spent */}
              <div>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#64748b' }}>
                  בוצע עד כה
                </p>
                <p style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: '#EF4444' }}>
                  ₪{totalSpent.toLocaleString()}
                </p>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                  {totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0}% מהתקציב
                </p>
              </div>

              {/* Remaining */}
              <div>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#64748b' }}>
                  יתרה
                </p>
                <p style={{ 
                  margin: 0, 
                  fontSize: '32px', 
                  fontWeight: '700', 
                  color: totalRemaining >= 0 ? '#10B981' : '#EF4444' 
                }}>
                  ₪{Math.abs(totalRemaining).toLocaleString()}
                </p>
                <p style={{ 
                  margin: '4px 0 0 0', 
                  fontSize: '13px', 
                  color: totalRemaining >= 0 ? '#10B981' : '#EF4444' 
                }}>
                  {totalRemaining >= 0 ? 'בתקציב ✅' : 'חריגה ⚠️'}
                </p>
              </div>

              {/* Progress Bar */}
              <div style={{ gridColumn: 'span 1' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#64748b' }}>
                  התקדמות
                </p>
                <div style={{
                  height: '24px',
                  backgroundColor: '#E5E7EB',
                  borderRadius: '12px',
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
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#1e293b',
                  }}>
                    {totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {(overBudgetCategories.length > 0 || nearLimitCategories.length > 0) && (
            <div style={{
              padding: '24px',
              backgroundColor: 'white',
              borderRadius: '16px',
              marginBottom: '32px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
              <h2 style={{ 
                fontSize: '18px', 
                fontWeight: '700', 
                marginBottom: '16px',
                color: '#1e293b',
              }}>
                🔔 התראות
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {overBudgetCategories.map(item => (
                  <div key={item.category_id} style={{
                    padding: '16px',
                    backgroundColor: '#FEE2E2',
                    border: '2px solid #EF4444',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}>
                    <span style={{ fontSize: '24px' }}>⚠️</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '600', color: '#991B1B' }}>
                        חריגה בסעיף "{item.category_name}"
                      </p>
                      <p style={{ margin: 0, fontSize: '13px', color: '#7F1D1D' }}>
                        חרגת ב-₪{(parseFloat(item.spent_amount) - parseFloat(item.budgeted_amount)).toLocaleString()} 
                        ({Math.round(parseFloat(item.percentage_used) - 100)}% מעל התקציב)
                      </p>
                    </div>
                    <button
                      onClick={() => toggleCategory(item.category_id)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#DC2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontFamily: 'Heebo, sans-serif',
                      }}
                    >
                      👁️ צפה
                    </button>
                  </div>
                ))}

                {nearLimitCategories.map(item => (
                  <div key={item.category_id} style={{
                    padding: '16px',
                    backgroundColor: '#FEF3C7',
                    border: '2px solid #F59E0B',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}>
                    <span style={{ fontSize: '24px' }}>⏰</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '600', color: '#92400E' }}>
                        סעיף "{item.category_name}" מתקרב לגבול
                      </p>
                      <p style={{ margin: 0, fontSize: '13px', color: '#78350F' }}>
                        נותרו רק ₪{parseFloat(item.remaining_amount).toLocaleString()} 
                        ({Math.round(100 - parseFloat(item.percentage_used))}% מהתקציב)
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Budget Categories */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            {budgetData.map(item => {
              const percentageUsed = parseFloat(item.percentage_used)
              const isOverBudget = percentageUsed > 100
              const isNearLimit = percentageUsed >= 85 && percentageUsed <= 100
              const isExpanded = expandedCategories.has(item.category_id)
              
              return (
                <div key={item.category_id} style={{
                  backgroundColor: 'white',
                  borderRadius: '16px',
                  padding: '24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  border: `2px solid ${isOverBudget ? '#EF4444' : isNearLimit ? '#F59E0B' : '#E5E7EB'}`,
                }}>
                  {/* Category Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    marginBottom: '16px',
                  }}>
                    <span style={{ fontSize: '36px' }}>{item.icon}</span>
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        margin: '0 0 4px 0',
                        fontSize: '20px',
                        fontWeight: '700',
                        color: '#1e293b',
                      }}>
                        {item.category_name}
                      </h3>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '14px' }}>
                        <span style={{ color: '#64748b' }}>
                          תקציב: <strong>₪{parseFloat(item.budgeted_amount).toLocaleString()}</strong>
                        </span>
                        <span style={{ color: isOverBudget ? '#EF4444' : '#64748b' }}>
                          בוצע: <strong>₪{parseFloat(item.spent_amount).toLocaleString()}</strong>
                        </span>
                        <span style={{ 
                          color: isOverBudget ? '#EF4444' : parseFloat(item.remaining_amount) > 0 ? '#10B981' : '#64748b' 
                        }}>
                          {isOverBudget ? 'חריגה' : 'יתרה'}: <strong>₪{Math.abs(parseFloat(item.remaining_amount)).toLocaleString()}</strong>
                        </span>
                      </div>
                    </div>
                    
                    {/* Status Badge */}
                    <div style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      backgroundColor: isOverBudget ? '#FEE2E2' : isNearLimit ? '#FEF3C7' : '#ECFDF5',
                      color: isOverBudget ? '#991B1B' : isNearLimit ? '#92400E' : '#065F46',
                      fontSize: '14px',
                      fontWeight: '700',
                    }}>
                      {isOverBudget ? '⚠️ חריגה' : isNearLimit ? '⏰ קרוב לגבול' : '✅ בתקציב'}
                    </div>

                    {/* Expand Button */}
                    <button
                      onClick={() => toggleCategory(item.category_id)}
                      style={{
                        padding: '10px 16px',
                        backgroundColor: '#F1F5F9',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontFamily: 'Heebo, sans-serif',
                        color: '#475569',
                      }}
                    >
                      {isExpanded ? '🔼 הסתר' : '🔽 פרטים'}
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div style={{
                    height: '32px',
                    backgroundColor: '#F1F5F9',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    position: 'relative',
                    marginBottom: isExpanded ? '20px' : 0,
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(percentageUsed, 100)}%`,
                      backgroundColor: isOverBudget ? '#EF4444' : isNearLimit ? '#F59E0B' : '#10B981',
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
                      {Math.round(percentageUsed)}%
                    </span>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && item.transactions.length > 0 && (
                    <div style={{
                      marginTop: '20px',
                      paddingTop: '20px',
                      borderTop: '2px solid #E5E7EB',
                    }}>
                      <h4 style={{
                        margin: '0 0 16px 0',
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#64748b',
                      }}>
                        📋 תנועות אחרונות
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {item.transactions.map((transaction: any) => (
                          <div key={transaction.id} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px',
                            backgroundColor: '#F8FAFC',
                            borderRadius: '8px',
                          }}>
                            <div>
                              <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                                {transaction.description}
                              </p>
                              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                                {new Date(transaction.date).toLocaleDateString('he-IL')}
                              </p>
                            </div>
                            <span style={{ fontSize: '16px', fontWeight: '700', color: '#EF4444' }}>
                              -₪{parseFloat(transaction.amount).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                      
                      <button
                        onClick={() => router.push(`/projects/${projectId}/cash-flow`)}
                        style={{
                          marginTop: '12px',
                          padding: '10px 20px',
                          backgroundColor: '#EFF6FF',
                          border: '2px solid #DBEAFE',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontFamily: 'Heebo, sans-serif',
                          color: '#1E40AF',
                          width: '100%',
                        }}
                      >
                        ➕ הוסף הוצאה בסעיף זה
                      </button>
                    </div>
                  )}

                  {isExpanded && item.transactions.length === 0 && (
                    <div style={{
                      marginTop: '20px',
                      paddingTop: '20px',
                      borderTop: '2px solid #E5E7EB',
                      textAlign: 'center',
                      color: '#94A3B8',
                    }}>
                      <p style={{ margin: '0 0 12px 0', fontSize: '14px' }}>
                        אין תנועות בסעיף זה עדיין
                      </p>
                      <button
                        onClick={() => router.push(`/projects/${projectId}/cash-flow`)}
                        style={{
                          padding: '10px 20px',
                          backgroundColor: '#6366F1',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontFamily: 'Heebo, sans-serif',
                        }}
                      >
                        ➕ הוסף הוצאה ראשונה
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

        </div>
      </div>
    </div>
  )
}
