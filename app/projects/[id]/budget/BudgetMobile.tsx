'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import AddPOModal from './components/AddPOModal'
import POListModal from './components/POListModal'
import MobileSidebar from '../components/MobileSidebar'
import type { BudgetWithCommitted } from '@/types/budget'

/**
 * דף תקציב - גרסת מובייל
 * ממוטב למסכים קטנים עם כל הפיצ'רים החדשים
 */
export default function BudgetMobile() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const supabase = createClient()

  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [budgetSettings, setBudgetSettings] = useState<any>(null)
  const [budgetData, setBudgetData] = useState<BudgetWithCommitted[]>([])
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [categories, setCategories] = useState<any[]>([])
  
  // Modals state
  const [showAddPOModal, setShowAddPOModal] = useState(false)
  const [showPOListModal, setShowPOListModal] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>()
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | undefined>()

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

      // Load categories for modals
      const { data: categoriesData } = await supabase
        .from('cash_flow_categories')
        .select('id, name, icon')
        .eq('type', 'expense')
        .order('name')
      
      setCategories(categoriesData || [])

      // ✨ Load budget data from view with committed costs
      const { data: budgetViewData } = await supabase
        .from('budget_with_committed_costs')
        .select('*')
        .eq('project_id', projectId)
        .order('budgeted_amount', { ascending: false })
      
      if (!budgetViewData) {
        setBudgetData([])
        return
      }
      
      const dataWithTransactions = await Promise.all(
        budgetViewData.map(async (item) => {
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
            transactions: transactions || []
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

  function openAddPOModal(categoryId?: string) {
    setSelectedCategoryId(categoryId)
    setShowAddPOModal(true)
  }

  function openPOListModal(categoryId?: string, categoryName?: string) {
    setSelectedCategoryId(categoryId)
    setSelectedCategoryName(categoryName)
    setShowPOListModal(true)
  }

  function handlePOSuccess() {
    loadData()
  }

  // Calculate totals
  const totalBudgeted = budgetData.reduce((sum, item) => sum + Number(item.budgeted_amount || 0), 0)
  const totalSpent = budgetData.reduce((sum, item) => sum + Number(item.spent_amount || 0), 0)
  const totalCommitted = budgetData.reduce((sum, item) => sum + Number(item.committed_amount || 0), 0)
  const totalAvailable = budgetData.reduce((sum, item) => sum + Number(item.available_amount || 0), 0)

  const overBudgetCategories = budgetData.filter(item => 
    Number(item.percentage_used) > 100 || 
    (Number(item.budgeted_amount) === 0 && (Number(item.spent_amount) + Number(item.committed_amount)) > 0)
  )

  const nearLimitCategories = budgetData.filter(item => {
    const pct = Number(item.percentage_used)
    const hasBudget = Number(item.budgeted_amount) > 0
    return hasBudget && pct >= 85 && pct <= 100
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

  if (!project) return <div style={{ padding: '20px', textAlign: 'center' }}>פרויקט לא נמצא</div>

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f8fafc',
      fontFamily: 'Heebo, sans-serif',
      direction: 'rtl',
      paddingBottom: '80px',
    }}>
      {/* Mobile Sidebar */}
      <MobileSidebar projectName={project.name} currentPage="budget" />

      {/* Header - Mobile */}
      <div style={{ 
        padding: '16px',
        paddingRight: '64px', // Space for hamburger button
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
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

      {/* Overall Summary - Mobile - UPDATED */}
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
              שולם
            </p>
            <p style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#EF4444' }}>
              ₪{totalSpent.toLocaleString()}
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              {totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0}% מהתקציב
            </p>
          </div>

          {/* Total Committed - NEW */}
          <div style={{ marginBottom: '16px' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#64748b' }}>
              מחויב
            </p>
            <p style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#F59E0B' }}>
              ₪{totalCommitted.toLocaleString()}
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              הזמנות שטרם שולמו
            </p>
          </div>

          {/* Available - NEW */}
          <div style={{ marginBottom: '16px' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#64748b' }}>
              זמין באמת
            </p>
            <p style={{ 
              margin: 0, 
              fontSize: '28px', 
              fontWeight: '700', 
              color: totalAvailable >= 0 ? '#10B981' : '#EF4444' 
            }}>
              ₪{Math.abs(totalAvailable).toLocaleString()}
            </p>
            <p style={{ 
              margin: '4px 0 0 0', 
              fontSize: '12px', 
              color: totalAvailable >= 0 ? '#10B981' : '#EF4444' 
            }}>
              {totalAvailable >= 0 ? 'פנוי להוצאה ✅' : 'חריגה ⚠️'}
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
              {/* Spent */}
              <div style={{
                position: 'absolute',
                height: '100%',
                width: `${Math.min((totalSpent / totalBudgeted) * 100, 100)}%`,
                backgroundColor: '#EF4444',
                transition: 'width 0.3s ease',
              }} />
              {/* Committed */}
              <div style={{
                position: 'absolute',
                height: '100%',
                left: `${Math.min((totalSpent / totalBudgeted) * 100, 100)}%`,
                width: `${Math.min((totalCommitted / totalBudgeted) * 100, 100 - (totalSpent / totalBudgeted) * 100)}%`,
                backgroundColor: '#F59E0B',
                transition: 'width 0.3s ease, left 0.3s ease',
              }} />
              <span style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: '14px',
                fontWeight: '700',
                color: '#1e293b',
                zIndex: 1,
              }}>
                {totalBudgeted > 0 ? Math.round(((totalSpent + totalCommitted) / totalBudgeted) * 100) : 0}%
              </span>
            </div>
          </div>

          {/* View POs Button - NEW */}
          {totalCommitted > 0 && (
            <button
              onClick={() => openPOListModal()}
              style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: '#FEF3C7',
                border: '2px solid #F59E0B',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                fontFamily: 'Heebo, sans-serif',
                color: '#92400E',
                width: '100%',
              }}
            >
              📋 צפה בהזמנות פתוחות ({budgetData.filter(d => Number(d.committed_amount) > 0).length})
            </button>
          )}
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
                    {cat.category_icon} {cat.category_name}: חריגה של ₪{(Number(cat.spent_amount) + Number(cat.committed_amount) - Number(cat.budgeted_amount)).toLocaleString()}
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
                    {cat.category_icon} {cat.category_name}: נותרו ₪{Number(cat.available_amount).toLocaleString()}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Categories List - Mobile - UPDATED */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {budgetData.map((item) => {
            const isExpanded = expandedCategories.has(item.category_id)
            const percentageUsed = Number(item.percentage_used)
            const hasCommitted = Number(item.committed_amount) > 0
            const statusColor = 
              percentageUsed > 100 ? '#EF4444' : 
              percentageUsed >= 85 ? '#F59E0B' : '#10B981'
            const statusIcon = 
              percentageUsed > 100 ? '⚠️' : 
              percentageUsed >= 85 ? '⚡' : '✅'

            return (
              <div 
                key={item.category_id} 
                style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  border: `2px solid ${percentageUsed > 100 ? '#EF4444' : '#e5e7eb'}`,
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
                    <div style={{ fontSize: '32px' }}>{item.category_icon}</div>
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
                        fontSize: '12px', 
                        color: '#64748b',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <span>תקציב: ₪{Number(item.budgeted_amount).toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ color: '#EF4444' }}>שולם: ₪{Number(item.spent_amount).toLocaleString()}</span>
                          {hasCommitted && (
                            <>
                              <span>•</span>
                              <span style={{ color: '#F59E0B' }}>מחויב: ₪{Number(item.committed_amount).toLocaleString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '20px', color: '#94a3b8' }}>
                      {isExpanded ? '▼' : '◀'}
                    </div>
                  </div>

                  {/* Progress Bar - UPDATED */}
                  <div style={{
                    height: '24px',
                    backgroundColor: '#E5E7EB',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    position: 'relative',
                    marginBottom: '8px',
                  }}>
                    {/* Spent */}
                    <div style={{
                      position: 'absolute',
                      height: '100%',
                      width: `${Math.min(Number(item.percentage_spent), 100)}%`,
                      backgroundColor: '#EF4444',
                      transition: 'width 0.3s ease',
                    }} />
                    {/* Committed */}
                    <div style={{
                      position: 'absolute',
                      height: '100%',
                      left: `${Math.min(Number(item.percentage_spent), 100)}%`,
                      width: `${Math.min(Number(item.percentage_committed), 100 - Number(item.percentage_spent))}%`,
                      backgroundColor: '#F59E0B',
                      transition: 'width 0.3s ease, left 0.3s ease',
                    }} />
                    <span style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      fontSize: '12px',
                      fontWeight: '700',
                      color: '#1e293b',
                      zIndex: 1,
                    }}>
                      {Math.round(percentageUsed)}%
                    </span>
                  </div>

                  {/* Available */}
                  <div style={{ 
                    padding: '8px 12px',
                    backgroundColor: Number(item.available_amount) >= 0 ? '#F0FDF4' : '#FEE2E2',
                    borderRadius: '8px',
                    textAlign: 'center',
                  }}>
                    <span style={{ 
                      fontSize: '13px', 
                      fontWeight: '600',
                      color: Number(item.available_amount) >= 0 ? '#10B981' : '#EF4444',
                    }}>
                      זמין: ₪{Number(item.available_amount).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Quick Actions - NEW */}
                {!isExpanded && (
                  <div style={{
                    padding: '0 16px 16px 16px',
                    display: 'grid',
                    gridTemplateColumns: hasCommitted ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
                    gap: '8px',
                  }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/projects/${projectId}/cash-flow`)
                      }}
                      style={{
                        padding: '8px',
                        backgroundColor: '#EFF6FF',
                        border: '2px solid #DBEAFE',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontFamily: 'Heebo, sans-serif',
                        color: '#1E40AF',
                      }}
                    >
                      ➕
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openAddPOModal(item.category_id)
                      }}
                      style={{
                        padding: '8px',
                        backgroundColor: '#FEF3C7',
                        border: '2px solid #FDE68A',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontFamily: 'Heebo, sans-serif',
                        color: '#92400E',
                      }}
                    >
                      📋
                    </button>
                    {hasCommitted && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openPOListModal(item.category_id, item.category_name)
                        }}
                        style={{
                          padding: '8px',
                          backgroundColor: '#F3F4F6',
                          border: '2px solid #E5E7EB',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontFamily: 'Heebo, sans-serif',
                          color: '#374151',
                        }}
                      >
                        👁️
                      </button>
                    )}
                  </div>
                )}

                {/* Expanded - Recent Transactions */}
                {isExpanded && (item.transactions as any[]).length > 0 && (
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
                    {(item.transactions as any[]).map((transaction: any, idx: number) => (
                      <div 
                        key={idx}
                        style={{
                          padding: '12px',
                          backgroundColor: 'white',
                          borderRadius: '8px',
                          marginBottom: idx < (item.transactions as any[]).length - 1 ? '8px' : 0,
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
                    
                    {/* Actions in expanded */}
                    <div style={{
                      marginTop: '12px',
                      display: 'grid',
                      gridTemplateColumns: hasCommitted ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
                      gap: '8px',
                    }}>
                      <button
                        onClick={() => router.push(`/projects/${projectId}/cash-flow`)}
                        style={{
                          padding: '10px',
                          backgroundColor: '#EFF6FF',
                          border: '2px solid #DBEAFE',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontFamily: 'Heebo, sans-serif',
                          color: '#1E40AF',
                        }}
                      >
                        ➕ הוצאה
                      </button>
                      <button
                        onClick={() => openAddPOModal(item.category_id)}
                        style={{
                          padding: '10px',
                          backgroundColor: '#FEF3C7',
                          border: '2px solid #FDE68A',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontFamily: 'Heebo, sans-serif',
                          color: '#92400E',
                        }}
                      >
                        📋 הזמנה
                      </button>
                      {hasCommitted && (
                        <button
                          onClick={() => openPOListModal(item.category_id, item.category_name)}
                          style={{
                            padding: '10px',
                            backgroundColor: '#F3F4F6',
                            border: '2px solid #E5E7EB',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontFamily: 'Heebo, sans-serif',
                            color: '#374151',
                          }}
                        >
                          👁️ POs
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {isExpanded && (item.transactions as any[]).length === 0 && (
                  <div style={{
                    padding: '16px',
                    backgroundColor: '#f8fafc',
                    borderTop: '1px solid #e5e7eb',
                    textAlign: 'center',
                  }}>
                    <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#64748b' }}>
                      אין תנועות בסעיף זה
                    </p>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '8px',
                    }}>
                      <button
                        onClick={() => router.push(`/projects/${projectId}/cash-flow`)}
                        style={{
                          padding: '10px',
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
                        ➕ הוצאה
                      </button>
                      <button
                        onClick={() => openAddPOModal(item.category_id)}
                        style={{
                          padding: '10px',
                          backgroundColor: '#F59E0B',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontFamily: 'Heebo, sans-serif',
                        }}
                      >
                        📋 הזמנה
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Floating Action Buttons - Mobile - UPDATED */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: '400px',
        display: 'flex',
        gap: '8px',
        zIndex: 50,
      }}>
        <button
          onClick={() => openAddPOModal()}
          style={{
            flex: 1,
            padding: '14px',
            backgroundColor: '#F59E0B',
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
          📋 PO
        </button>
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
          ⚙️
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
          💰
        </button>
      </div>

      {/* Modals */}
      {showAddPOModal && (
        <AddPOModal
          projectId={projectId}
          categoryId={selectedCategoryId}
          categories={categories}
          onClose={() => {
            setShowAddPOModal(false)
            setSelectedCategoryId(undefined)
          }}
          onSuccess={handlePOSuccess}
        />
      )}

      {showPOListModal && (
        <POListModal
          projectId={projectId}
          categoryId={selectedCategoryId}
          categoryName={selectedCategoryName}
          onClose={() => {
            setShowPOListModal(false)
            setSelectedCategoryId(undefined)
            setSelectedCategoryName(undefined)
          }}
          onUpdate={loadData}
        />
      )}
    </div>
  )
}
