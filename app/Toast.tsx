'use client'

import { useEffect } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface ToastProps {
  message: string
  type: ToastType
  onClose: () => void
}

export default function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 3000)
    
    return () => clearTimeout(timer)
  }, [onClose])

  const colors = {
    success: { bg: '#D1FAE5', border: '#10B981', text: '#065F46', icon: '✓' },
    error: { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B', icon: '✕' },
    info: { bg: '#DBEAFE', border: '#3B82F6', text: '#1E40AF', icon: 'ℹ' },
  }

  const style = colors[type]

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: style.bg,
      border: `2px solid ${style.border}`,
      color: style.text,
      padding: '12px 24px',
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 1000,
      animation: 'slideDown 0.3s ease',
    }}>
      <span style={{ 
        width: '24px', 
        height: '24px', 
        borderRadius: '50%', 
        backgroundColor: style.border,
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
        fontWeight: 'bold'
      }}>
        {style.icon}
      </span>
      <span style={{ fontWeight: '500' }}>{message}</span>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: style.text,
          cursor: 'pointer',
          fontSize: '18px',
          marginRight: '8px',
        }}
      >
        ×
      </button>
    </div>
  )
}