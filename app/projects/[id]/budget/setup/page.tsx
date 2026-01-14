'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function BudgetSetupWizard() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  
  // Step 1: Total budget
  const [totalBudget, setTotalBudget] = useState('')
  
  // Step 2: Category budgets
  const [categoryBudgets, setCategoryBudgets] = useState<{ [key: string]: string }>({})
  const [customCategories, setCustomCategories] = useState<any[]>([])
  const [showAddCustom, setShowAddCustom] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryIcon, setNewCategoryIcon] = useState('📦')

  useEffect(() => {
    loadCategories()
    loadExistingBudget()
  }, [])

  async function loadExistingBudget() {
    try {
      // טען הגדרות תקציב קיימות
      const { data: budgetSettings } = await supabase
        .from('project_budget_settings')
        .select('*')
        .eq('project_id', projectId)
        .single()
      
      if (budgetSettings) {
        // מלא את התקציב הכולל
        setTotalBudget(budgetSettings.total_budget.toString())
        
        // טען תקציבים לפי קטגוריה
        const { data: categoryBudgetsData } = await supabase
          .from('project_category_budgets')
          .select('category_id, budgeted_amount')
          .eq('project_id', projectId)
        
        if (categoryBudgetsData) {
          const budgets: any = {}
          categoryBudgetsData.forEach(cb => {
            budgets[cb.category_id] = cb.budgeted_amount.toString()
          })
          setCategoryBudgets(prev => ({ ...prev, ...budgets }))
        }
      }
    } catch (error) {
      console.log('No existing budget found, starting fresh')
    }
  }

  async function loadCategories() {
    const { data } = await supabase
      .from('cash_flow_categories')
      .select('*')
      .eq('type', 'expense')
      .order('name', { ascending: true })
    
    if (data) {
      setCategories(data)
      // Initialize budgets
      const initial: any = {}
      data.forEach(cat => { initial[cat.id] = '' })
      setCategoryBudgets(initial)
    }
  }

  function addCustomCategory() {
    if (!newCategoryName.trim()) return
    
    const customId = `custom_${Date.now()}`
    const newCategory = {
      id: customId,
      name: newCategoryName,
      icon: newCategoryIcon,
      type: 'expense',
      color: '#6366F1',
      isCustom: true,
    }
    
    setCustomCategories([...customCategories, newCategory])
    setCategoryBudgets({ ...categoryBudgets, [customId]: '' })
    setNewCategoryName('')
    setNewCategoryIcon('📦')
    setShowAddCustom(false)
  }

  function removeCustomCategory(categoryId: string) {
    setCustomCategories(customCategories.filter(c => c.id !== categoryId))
    const newBudgets = { ...categoryBudgets }
    delete newBudgets[categoryId]
    setCategoryBudgets(newBudgets)
  }

  function calculateTotal() {
    return Object.values(categoryBudgets)
      .reduce((sum, val) => sum + (parseFloat(val) || 0), 0)
  }

  function calculateProfit() {
    const total = parseFloat(totalBudget) || 0
    const expenses = calculateTotal()
    return total - expenses
  }

  function getProfitPercentage() {
    const total = parseFloat(totalBudget) || 0
    if (total === 0) return 0
    return Math.round((calculateProfit() / total) * 100)
  }

  function getPercentage(categoryId: string) {
    const total = parseFloat(totalBudget) || 0
    const amount = parseFloat(categoryBudgets[categoryId]) || 0
    if (total === 0) return 0
    return Math.round((amount / total) * 100)
  }

    async function handleSave() {
    setLoading(true)
    console.log('🔵 Starting save...')
    
    try {
      // Step 1: Save total budget
      const { data: existingBudget } = await supabase
        .from('project_budget_settings')
        .select('id')
        .eq('project_id', projectId)
        .single()
      
      let budgetError = null
      
      if (existingBudget) {
        // Update existing
        const { error } = await supabase
          .from('project_budget_settings')
          .update({
            total_budget: parseFloat(totalBudget),
            setup_completed: true,
          })
          .eq('project_id', projectId)
        budgetError = error
      } else {
        // Insert new
        const { error } = await supabase
          .from('project_budget_settings')
          .insert({
            project_id: projectId,
            total_budget: parseFloat(totalBudget),
            setup_completed: true,
          })
        budgetError = error
      }

      if (budgetError) {
        console.error('❌ Budget error:', budgetError)
        alert(`שגיאה בשמירת תקציב: ${budgetError.message}`)
        setLoading(false)
        return
      }

      console.log('✅ Budget settings saved')

      // ✨ עדכן גם את סכום החוזה בפרויקט
      const { error: contractError } = await supabase
        .from('projects')
        .update({ contract_amount: parseFloat(totalBudget) })
        .eq('id', projectId)
      
      if (contractError) {
        console.error('⚠️ Contract amount update error:', contractError)
      } else {
        console.log('✅ Contract amount updated in project')
      }

      // Step 2: Delete all existing category budgets for this project        
      if (budgetError) {
        console.error('❌ Budget error:', budgetError)
        alert('שגיאה בשמירת תקציב')
        setLoading(false)
        return
      }

      console.log('✅ Budget settings saved')

      // Step 2: Delete all existing category budgets for this project
      const { error: deleteError } = await supabase
        .from('project_category_budgets')
        .delete()
        .eq('project_id', projectId)
      
      if (deleteError) {
        console.error('⚠️ Delete error (might be ok):', deleteError)
      }

      console.log('🗑️ Cleared old category budgets')

      // Step 3: Save custom categories first
      const customCategoryMapping: { [oldId: string]: string } = {}
      
      for (const customCat of customCategories) {
        console.log('➕ Adding custom category:', customCat.name)
        
        const { data: newCat, error: catError } = await supabase
          .from('cash_flow_categories')
          .insert({
            name: customCat.name,
            type: 'expense',
            icon: customCat.icon,
            color: customCat.color,
          })
          .select()
          .single()
        
        if (catError) {
          console.error('❌ Category error:', catError)
          continue
        }
        
        if (newCat) {
          customCategoryMapping[customCat.id] = newCat.id
        }
      }

      console.log('✅ Custom categories saved')

      // Step 4: Prepare all category budgets (existing + custom)
      const allBudgetRecords = []

      // Add existing categories
      for (const [categoryId, amount] of Object.entries(categoryBudgets)) {
        if (categoryId.startsWith('custom_')) {
          // Handle custom category
          const realCategoryId = customCategoryMapping[categoryId]
          if (realCategoryId && parseFloat(amount) > 0) {
            allBudgetRecords.push({
              project_id: projectId,
              category_id: realCategoryId,
              budgeted_amount: parseFloat(amount),
            })
          }
        } else {
          // Handle regular category
          if (parseFloat(amount) > 0) {
            allBudgetRecords.push({
              project_id: projectId,
              category_id: categoryId,
              budgeted_amount: parseFloat(amount),
            })
          }
        }
      }

      console.log('💾 Inserting category budgets:', allBudgetRecords.length, 'records')

      // Step 5: Insert all category budgets
      if (allBudgetRecords.length > 0) {
        const { error: insertError } = await supabase
          .from('project_category_budgets')
          .insert(allBudgetRecords)
        
        if (insertError) {
          console.error('❌ Insert error:', insertError)
          alert(`שגיאה בשמירת תקציבי קטגוריות: ${insertError.message}`)
          setLoading(false)
          return
        }
      }

      console.log('✅ All category budgets saved!')

      // Step 6: Small delay to ensure DB is synced
      await new Promise(resolve => setTimeout(resolve, 500))

      console.log('🎉 Complete! Redirecting...')

      // Step 7: Redirect to budget page
      router.push(`/projects/${projectId}/budget`)
      
    } catch (error) {
      console.error('❌ Unexpected error:', error)
      alert('שגיאה בשמירת התקציב')
      setLoading(false)
    }
  }


  const allocationTotal = calculateTotal()
  const profitMargin = calculateProfit()
  const hasAllocations = Object.values(categoryBudgets).some(val => parseFloat(val) > 0)
  const canProceed = hasAllocations && allocationTotal <= parseFloat(totalBudget || '0')

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px',
      fontFamily: 'Heebo, sans-serif',
      direction: 'rtl',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '800px',
        backgroundColor: 'white',
        borderRadius: '20px',
        padding: '48px',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
      }}>
        {/* Progress Bar */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}>
            {[1, 2, 3].map(num => (
              <div key={num} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: step >= num ? '#6366F1' : '#E5E7EB',
                  color: step >= num ? 'white' : '#9CA3AF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '18px',
                }}>
                  {num}
                </div>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: step >= num ? '#1e293b' : '#9CA3AF',
                }}>
                  {num === 1 && 'תקציב כולל'}
                  {num === 2 && 'פילוח סעיפים'}
                  {num === 3 && 'סיכום ואישור'}
                </span>
              </div>
            ))}
          </div>
          <div style={{
            height: '8px',
            backgroundColor: '#E5E7EB',
            borderRadius: '4px',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${(step / 3) * 100}%`,
              backgroundColor: '#6366F1',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>

        {/* Step 1: Total Budget */}
        {step === 1 && (
          <div>
            <h1 style={{
              fontSize: '32px',
              fontWeight: '700',
              marginBottom: '12px',
              color: '#1e293b',
            }}>
              💰 תקציב כולל
            </h1>
            <p style={{
              fontSize: '16px',
              color: '#64748b',
              marginBottom: '40px',
            }}>
              מה סכום החוזה עם הלקוח? (כולל כל התשלומים)
            </p>

            <div style={{ marginBottom: '32px' }}>
              <label style={{
                display: 'block',
                fontSize: '15px',
                fontWeight: '600',
                marginBottom: '12px',
                color: '#374151',
              }}>
                סכום התקציב
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '20px',
                  color: '#64748b',
                  fontWeight: '600',
                }}>
                  ₪
                </span>
                <input
                  type="number"
                  value={totalBudget}
                  onChange={(e) => setTotalBudget(e.target.value)}
                  placeholder="1,500,000"
                  style={{
                    width: '100%',
                    padding: '20px 50px 20px 20px',
                    border: '3px solid #E5E7EB',
                    borderRadius: '12px',
                    fontSize: '28px',
                    fontWeight: '700',
                    fontFamily: 'Heebo, sans-serif',
                    textAlign: 'center',
                    color: '#6366F1',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#6366F1'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB'
                  }}
                />
              </div>
              {parseFloat(totalBudget) > 0 && (
                <p style={{
                  marginTop: '12px',
                  fontSize: '18px',
                  color: '#10B981',
                  fontWeight: '600',
                  textAlign: 'center',
                }}>
                  ₪{parseFloat(totalBudget).toLocaleString()} 
                  <span style={{ fontSize: '14px', fontWeight: '400', marginRight: '8px' }}>
                    ({(parseFloat(totalBudget) / 1000).toFixed(0)}K)
                  </span>
                </p>
              )}
            </div>

            <div style={{
              padding: '20px',
              backgroundColor: '#EFF6FF',
              borderRadius: '12px',
              border: '2px solid #DBEAFE',
            }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#1E40AF' }}>
                💡 <strong>טיפ:</strong> תוכל לערוך את התקציב בכל שלב, אין בעיה לשנות מאוחר יותר
              </p>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '40px',
            }}>
              <button
                onClick={() => router.push(`/projects/${projectId}/cash-flow`)}
                style={{
                  padding: '14px 28px',
                  backgroundColor: 'white',
                  border: '2px solid #E5E7EB',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontFamily: 'Heebo, sans-serif',
                  color: '#64748b',
                }}
              >
                ביטול
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!totalBudget || parseFloat(totalBudget) <= 0}
                style={{
                  padding: '14px 32px',
                  backgroundColor: totalBudget && parseFloat(totalBudget) > 0 ? '#6366F1' : '#E5E7EB',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: totalBudget && parseFloat(totalBudget) > 0 ? 'pointer' : 'not-allowed',
                  fontFamily: 'Heebo, sans-serif',
                }}
              >
                הבא ➡️
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Category Allocation */}
        {step === 2 && (
          <div>
            <h1 style={{
              fontSize: '32px',
              fontWeight: '700',
              marginBottom: '12px',
              color: '#1e293b',
            }}>
              📊 פילוח לסעיפים
            </h1>
            <p style={{
              fontSize: '16px',
              color: '#64748b',
              marginBottom: '32px',
            }}>
              חלק את התקציב לסעיפי ההוצאות השונים
            </p>

            {/* Summary Card */}
            <div style={{
              padding: '20px',
              backgroundColor: allocationTotal > parseFloat(totalBudget) ? '#FEE2E2' : '#F8FAFC',
              border: `2px solid ${allocationTotal > parseFloat(totalBudget) ? '#EF4444' : '#E5E7EB'}`,
              borderRadius: '12px',
              marginBottom: '32px',
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '16px',
              }}>
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#64748b' }}>
                    תקציב כולל
                  </p>
                  <p style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>
                    ₪{parseFloat(totalBudget).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#64748b' }}>
                    סה"כ הוצאות
                  </p>
                  <p style={{
                    margin: 0,
                    fontSize: '24px',
                    fontWeight: '700',
                    color: allocationTotal > parseFloat(totalBudget) ? '#EF4444' : '#1e293b',
                  }}>
                    ₪{allocationTotal.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#64748b' }}>
                    💰 יתרת רווח
                  </p>
                  <p style={{
                    margin: 0,
                    fontSize: '24px',
                    fontWeight: '700',
                    color: profitMargin >= 0 ? '#10B981' : '#EF4444',
                  }}>
                    ₪{Math.abs(profitMargin).toLocaleString()}
                  </p>
                  <p style={{ 
                    margin: '4px 0 0 0', 
                    fontSize: '12px', 
                    color: profitMargin >= 0 ? '#059669' : '#DC2626' 
                  }}>
                    {profitMargin >= 0 ? `רווח ${getProfitPercentage()}%` : 'חריגה!'}
                  </p>
                </div>
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#64748b' }}>
                    סטטוס
                  </p>
                  <p style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: '700',
                    color: profitMargin >= 0 ? '#10B981' : '#EF4444',
                  }}>
                    {profitMargin >= 0 ? '✅ תקין' : '⚠️ חריגה'}
                  </p>
                </div>
              </div>
              
              {allocationTotal > parseFloat(totalBudget) && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  backgroundColor: '#FEE2E2',
                  borderRadius: '8px',
                }}>
                  <p style={{ margin: 0, fontSize: '13px', color: '#991B1B' }}>
                    ⚠️ סה"כ ההוצאות גבוה מהתקציב! חרגת ב-₪{(allocationTotal - parseFloat(totalBudget)).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            {/* Categories List */}
            <div style={{
              maxHeight: '400px',
              overflowY: 'auto',
              marginBottom: '16px',
            }}>
              {categories.map(category => (
                <div key={category.id} style={{
                  padding: '16px',
                  marginBottom: '12px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '12px',
                  border: '2px solid #e5e7eb',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '12px',
                  }}>
                    <span style={{ fontSize: '28px' }}>{category.icon}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{
                        margin: 0,
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#1e293b',
                      }}>
                        {category.name}
                      </p>
                      {parseFloat(categoryBudgets[category.id]) > 0 && (
                        <p style={{
                          margin: '4px 0 0 0',
                          fontSize: '12px',
                          color: '#64748b',
                        }}>
                          {getPercentage(category.id)}% מהתקציב
                        </p>
                      )}
                    </div>
                    <div style={{ position: 'relative', width: '180px' }}>
                      <span style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '14px',
                        color: '#64748b',
                      }}>
                        ₪
                      </span>
                      <input
                        type="number"
                        value={categoryBudgets[category.id]}
                        onChange={(e) => setCategoryBudgets({
                          ...categoryBudgets,
                          [category.id]: e.target.value
                        })}
                        placeholder="0"
                        style={{
                          width: '100%',
                          padding: '10px 35px 10px 10px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '16px',
                          fontWeight: '600',
                          fontFamily: 'Heebo, sans-serif',
                          textAlign: 'center',
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Custom Categories */}
              {customCategories.map(category => (
                <div key={category.id} style={{
                  padding: '16px',
                  marginBottom: '12px',
                  backgroundColor: '#EFF6FF',
                  borderRadius: '12px',
                  border: '2px solid #3B82F6',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '12px',
                  }}>
                    <span style={{ fontSize: '28px' }}>{category.icon}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{
                        margin: 0,
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#1e293b',
                      }}>
                        {category.name}
                        <span style={{
                          marginRight: '8px',
                          padding: '2px 8px',
                          backgroundColor: '#3B82F6',
                          color: 'white',
                          fontSize: '10px',
                          borderRadius: '4px',
                        }}>
                          מותאם אישית
                        </span>
                      </p>
                      {parseFloat(categoryBudgets[category.id]) > 0 && (
                        <p style={{
                          margin: '4px 0 0 0',
                          fontSize: '12px',
                          color: '#64748b',
                        }}>
                          {getPercentage(category.id)}% מהתקציב
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => removeCustomCategory(category.id)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#FEE2E2',
                        color: '#DC2626',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontFamily: 'Heebo, sans-serif',
                      }}
                    >
                      🗑️
                    </button>
                    <div style={{ position: 'relative', width: '180px' }}>
                      <span style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '14px',
                        color: '#64748b',
                      }}>
                        ₪
                      </span>
                      <input
                        type="number"
                        value={categoryBudgets[category.id]}
                        onChange={(e) => setCategoryBudgets({
                          ...categoryBudgets,
                          [category.id]: e.target.value
                        })}
                        placeholder="0"
                        style={{
                          width: '100%',
                          padding: '10px 35px 10px 10px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '16px',
                          fontWeight: '600',
                          fontFamily: 'Heebo, sans-serif',
                          textAlign: 'center',
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Custom Category Button */}
            {!showAddCustom ? (
              <button
                onClick={() => setShowAddCustom(true)}
                style={{
                  width: '100%',
                  padding: '16px',
                  marginBottom: '32px',
                  backgroundColor: '#F8FAFC',
                  border: '2px dashed #CBD5E1',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontFamily: 'Heebo, sans-serif',
                  color: '#64748b',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#EFF6FF'
                  e.currentTarget.style.borderColor = '#3B82F6'
                  e.currentTarget.style.color = '#3B82F6'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#F8FAFC'
                  e.currentTarget.style.borderColor = '#CBD5E1'
                  e.currentTarget.style.color = '#64748b'
                }}
              >
                ➕ הוסף סעיף מותאם אישית
              </button>
            ) : (
              <div style={{
                padding: '20px',
                marginBottom: '32px',
                backgroundColor: '#F8FAFC',
                border: '2px solid #3B82F6',
                borderRadius: '12px',
              }}>
                <h4 style={{
                  margin: '0 0 16px 0',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1e293b',
                }}>
                  ➕ סעיף חדש
                </h4>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '600',
                    marginBottom: '6px',
                    color: '#64748b',
                  }}>
                    שם הסעיף
                  </label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="לדוגמה: קרמיקה, גינון, עיצוב פנים..."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontFamily: 'Heebo, sans-serif',
                    }}
                  />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '600',
                    marginBottom: '6px',
                    color: '#64748b',
                  }}>
                    אייקון (אימוג'י)
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {['📦', '🎨', '🌳', '🚪', '🪴', '💡', '🔧', '🧰', '📐', '🎯'].map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => setNewCategoryIcon(emoji)}
                        style={{
                          padding: '8px',
                          fontSize: '24px',
                          backgroundColor: newCategoryIcon === emoji ? '#3B82F6' : 'white',
                          border: `2px solid ${newCategoryIcon === emoji ? '#3B82F6' : '#e5e7eb'}`,
                          borderRadius: '8px',
                          cursor: 'pointer',
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      setShowAddCustom(false)
                      setNewCategoryName('')
                      setNewCategoryIcon('📦')
                    }}
                    style={{
                      flex: 1,
                      padding: '10px',
                      backgroundColor: 'white',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontFamily: 'Heebo, sans-serif',
                      color: '#64748b',
                    }}
                  >
                    ביטול
                  </button>
                  <button
                    onClick={addCustomCategory}
                    disabled={!newCategoryName.trim()}
                    style={{
                      flex: 1,
                      padding: '10px',
                      backgroundColor: newCategoryName.trim() ? '#3B82F6' : '#E5E7EB',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: newCategoryName.trim() ? 'pointer' : 'not-allowed',
                      fontFamily: 'Heebo, sans-serif',
                    }}
                  >
                    ✅ הוסף
                  </button>
                </div>
              </div>
            )}

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '12px',
            }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  padding: '14px 28px',
                  backgroundColor: 'white',
                  border: '2px solid #E5E7EB',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontFamily: 'Heebo, sans-serif',
                  color: '#64748b',
                }}
              >
                ⬅️ חזור
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!canProceed}
                style={{
                  padding: '14px 32px',
                  backgroundColor: canProceed ? '#6366F1' : '#E5E7EB',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: canProceed ? 'pointer' : 'not-allowed',
                  fontFamily: 'Heebo, sans-serif',
                }}
              >
                הבא ➡️
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Summary */}
        {step === 3 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
              <h1 style={{
                fontSize: '32px',
                fontWeight: '700',
                marginBottom: '12px',
                color: '#1e293b',
              }}>
                הכל מוכן!
              </h1>
              <p style={{
                fontSize: '16px',
                color: '#64748b',
              }}>
                התקציב שלך מוכן למעקב בזמן אמת
              </p>
            </div>

            {/* Summary Cards */}
            <div style={{
              padding: '24px',
              backgroundColor: '#f8fafc',
              borderRadius: '16px',
              marginBottom: '24px',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '20px',
                paddingBottom: '20px',
                borderBottom: '2px solid #e5e7eb',
              }}>
                <div>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#64748b' }}>
                    תקציב כולל
                  </p>
                  <p style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#6366F1' }}>
                    ₪{parseFloat(totalBudget).toLocaleString()}
                  </p>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#64748b' }}>
                    סעיפים
                  </p>
                  <p style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#10B981' }}>
                    {Object.values(categoryBudgets).filter(v => parseFloat(v) > 0).length}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {categories
                  .filter(cat => parseFloat(categoryBudgets[cat.id]) > 0)
                  .sort((a, b) => parseFloat(categoryBudgets[b.id]) - parseFloat(categoryBudgets[a.id]))
                  .map(category => (
                    <div key={category.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      backgroundColor: 'white',
                      borderRadius: '8px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '20px' }}>{category.icon}</span>
                        <span style={{ fontSize: '14px', fontWeight: '600' }}>
                          {category.name}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                          {getPercentage(category.id)}%
                        </span>
                        <span style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>
                          ₪{parseFloat(categoryBudgets[category.id]).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Info Box */}
            <div style={{
              padding: '20px',
              backgroundColor: '#ECFDF5',
              border: '2px solid #10B981',
              borderRadius: '12px',
              marginBottom: '32px',
            }}>
              <p style={{
                margin: '0 0 8px 0',
                fontSize: '15px',
                fontWeight: '600',
                color: '#065F46',
              }}>
                💡 מה הלאה?
              </p>
              <p style={{ margin: 0, fontSize: '14px', color: '#047857', lineHeight: '1.6' }}>
                מעכשיו כל הוצאה שתוסיף תעודכן אוטומטית מול התקציב המתוכנן. תקבל התראות על חריגות ותוכל לעקוב אחרי הביצוע בזמן אמת.
              </p>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '12px',
            }}>
              <button
                onClick={() => setStep(2)}
                style={{
                  padding: '14px 28px',
                  backgroundColor: 'white',
                  border: '2px solid #E5E7EB',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontFamily: 'Heebo, sans-serif',
                  color: '#64748b',
                }}
              >
                ⬅️ חזור לעריכה
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                style={{
                  padding: '14px 32px',
                  backgroundColor: loading ? '#9CA3AF' : '#10B981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: 'Heebo, sans-serif',
                }}
              >
                {loading ? '⏳ שומר...' : '✅ שמור והתחל'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
