// ====================================
// 📦 ALERTS SECTION COMPONENT
// ====================================
// תצוגת התראות - משותף ל-Desktop + Mobile
// ====================================

import React from 'react'

// ====================================
// 📘 TYPES
// ====================================

import type { Alert } from '../../types'

interface AlertsSectionProps {
  alerts: Alert[]
  variant?: 'desktop' | 'mobile'
}

// ====================================
// 🎨 COMPONENT
// ====================================

/**
 * מציג רשימת התראות חשובות
 * 
 * @param alerts - מערך התראות להצגה
 * @param variant - desktop (עם כפתור action) או mobile (עם חץ)
 * 
 * @example
 * <AlertsSection alerts={alerts} variant="desktop" />
 */
export function AlertsSection({ 
  alerts, 
  variant = 'desktop' 
}: AlertsSectionProps) {
  if (alerts.length === 0) return null

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
        📢 התראות חשובות
      </h3>

      {/* Alerts List */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: isMobile ? '8px' : '12px' 
      }}>
        {alerts.map((alert, idx) => (
          <AlertCard 
            key={idx} 
            alert={alert} 
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

interface AlertCardProps {
  alert: Alert
  variant: 'desktop' | 'mobile'
}

function AlertCard({ alert, variant }: AlertCardProps) {
  const isMobile = variant === 'mobile'

  return (
    <div 
      onClick={alert.onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? '12px' : '16px',
        padding: isMobile ? '12px' : '16px',
        backgroundColor: '#f8fafc',
        borderRadius: isMobile ? '8px' : '12px',
        borderRight: `4px solid ${alert.color}`,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#f1f5f9'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#f8fafc'
      }}
    >
      {/* Icon */}
      <span style={{ fontSize: isMobile ? '24px' : '28px' }}>
        {alert.icon}
      </span>

      {/* Message */}
      <div style={{ flex: 1 }}>
        <p style={{ 
          margin: 0, 
          fontSize: isMobile ? '13px' : '14px',
          color: '#1e293b',
          fontWeight: '500' 
        }}>
          {alert.message}
        </p>
      </div>

      {/* Action Button (Desktop) או Arrow (Mobile) */}
      {isMobile ? (
        <span style={{ fontSize: '18px', color: '#94a3b8' }}>→</span>
      ) : (
        alert.action && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              alert.onClick()
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: alert.color,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontFamily: 'Heebo, sans-serif',
              transition: 'opacity 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1'
            }}
          >
            {alert.action}
          </button>
        )
      )}
    </div>
  )
}