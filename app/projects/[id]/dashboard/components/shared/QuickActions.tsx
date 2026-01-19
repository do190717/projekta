// ====================================
// 📦 QUICK ACTIONS COMPONENT
// ====================================
// פעולות מהירות - משותף ל-Desktop + Mobile
// ====================================

import React from 'react'

// ====================================
// 📘 TYPES
// ====================================

import type { QuickAction } from '../../types'

interface QuickActionsProps {
  actions: QuickAction[]
  variant?: 'desktop' | 'mobile'
}

// ====================================
// 🎨 COMPONENT
// ====================================

/**
 * מציג כפתורי פעולה מהירה
 * 
 * @param actions - מערך פעולות להצגה
 * @param variant - desktop (horizontal) או mobile (vertical)
 * 
 * @example
 * const actions = [
 *   { label: '➕ עדכון חדש', onClick: () => {} },
 *   { label: '📁 העלה קובץ', onClick: () => {} }
 * ]
 * <QuickActions actions={actions} variant="desktop" />
 */
export function QuickActions({ 
  actions, 
  variant = 'desktop' 
}: QuickActionsProps) {
  const isMobile = variant === 'mobile'

  return (
    <div style={{ 
      padding: isMobile ? '16px' : '28px',
      backgroundColor: 'white',
      borderRadius: isMobile ? '12px' : '16px',
      marginBottom: isMobile ? '16px' : '32px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    }}>
      {/* Header */}
      <h3 style={{ 
        fontSize: isMobile ? '16px' : '18px',
        fontWeight: '600', 
        marginBottom: isMobile ? '12px' : '20px',
        color: '#1e293b',
      }}>
        🔥 פעולות מהירות
      </h3>

      {/* Actions */}
      <div style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '8px' : '12px',
        flexWrap: 'wrap'
      }}>
        {actions.map((action, idx) => (
          <QuickActionButton 
            key={idx} 
            action={action}
            variant={variant}
          />
        ))}
      </div>
    </div>
  )
}

// ====================================
// 🧩 SUB-COMPONENTS
// ====================================

interface QuickActionButtonProps {
  action: QuickAction
  variant: 'desktop' | 'mobile'
}

function QuickActionButton({ action, variant }: QuickActionButtonProps) {
  const isMobile = variant === 'mobile'

  return (
    <button
      onClick={action.onClick}
      style={{
        width: isMobile ? '100%' : 'auto',
        padding: isMobile ? '12px' : '14px 24px',
        backgroundColor: 'white',
        border: '2px solid #e5e7eb',
        borderRadius: isMobile ? '8px' : '10px',
        fontSize: isMobile ? '14px' : '15px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        fontFamily: 'Heebo, sans-serif',
        color: '#1e293b',
        textAlign: isMobile ? 'right' : 'center',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#6366F1'
        e.currentTarget.style.backgroundColor = '#EFF6FF'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#e5e7eb'
        e.currentTarget.style.backgroundColor = 'white'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {action.label}
    </button>
  )
}