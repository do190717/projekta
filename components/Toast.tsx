'use client'

import { useEffect, useState } from 'react'
import { theme } from '@/lib/design-system'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastProps {
  message: string
  type: ToastType
  onClose: () => void
  duration?: number
}

const toastConfig = {
  success: {
    icon: '✓',
    bgColor: theme.colors.success.light,
    borderColor: theme.colors.success.main,
    textColor: theme.colors.success.dark,
    iconBg: theme.colors.success.main,
  },
  error: {
    icon: '✕',
    bgColor: theme.colors.error.light,
    borderColor: theme.colors.error.main,
    textColor: theme.colors.error.dark,
    iconBg: theme.colors.error.main,
  },
  warning: {
    icon: '!',
    bgColor: theme.colors.warning.light,
    borderColor: theme.colors.warning.main,
    textColor: theme.colors.warning.dark,
    iconBg: theme.colors.warning.main,
  },
  info: {
    icon: 'i',
    bgColor: theme.colors.info.light,
    borderColor: theme.colors.info.main,
    textColor: theme.colors.info.dark,
    iconBg: theme.colors.info.main,
  },
}

export default function Toast({ message, type, onClose, duration = 4000 }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isLeaving, setIsLeaving] = useState(false)
  const config = toastConfig[type]

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration])

  const handleClose = () => {
    setIsLeaving(true)
    setTimeout(() => {
      setIsVisible(false)
      onClose()
    }, 200)
  }

  if (!isVisible) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: `translateX(-50%) ${isLeaving ? 'translateY(-20px)' : 'translateY(0)'}`,
        backgroundColor: config.bgColor,
        border: `2px solid ${config.borderColor}`,
        borderRadius: theme.borderRadius.xl,
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        boxShadow: theme.shadows.lg,
        zIndex: theme.zIndex.toast,
        opacity: isLeaving ? 0 : 1,
        transition: `all ${theme.transitions.normal}`,
        animation: 'slideInFromTop 0.3s ease-out',
        maxWidth: '90vw',
        fontFamily: theme.typography.fontFamily.sans,
      }}
    >
      <style>{`
        @keyframes slideInFromTop {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        
        @keyframes progressBar {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
      
      {/* Icon */}
      <span
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          backgroundColor: config.iconBg,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          fontWeight: 'bold',
          flexShrink: 0,
        }}
      >
        {config.icon}
      </span>
      
      {/* Message */}
      <span
        style={{
          color: config.textColor,
          fontWeight: 500,
          fontSize: '14px',
          lineHeight: 1.4,
        }}
      >
        {message}
      </span>
      
      {/* Close Button */}
      <button
        onClick={handleClose}
        style={{
          background: 'none',
          border: 'none',
          color: config.textColor,
          cursor: 'pointer',
          fontSize: '20px',
          padding: '4px',
          marginRight: '-4px',
          opacity: 0.6,
          transition: `opacity ${theme.transitions.fast}`,
          lineHeight: 1,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
      >
        ×
      </button>
      
      {/* Progress Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '3px',
          backgroundColor: 'rgba(0,0,0,0.1)',
          borderRadius: `0 0 ${theme.borderRadius.xl} ${theme.borderRadius.xl}`,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            backgroundColor: config.borderColor,
            animation: `progressBar ${duration}ms linear`,
          }}
        />
      </div>
    </div>
  )
}

// ===========================================
// Toast Container & Hook (for multiple toasts)
// ===========================================

interface ToastItem {
  id: string
  message: string
  type: ToastType
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Date.now().toString()
    setToasts((prev) => [...prev, { id, message, type }])
  }

  const hideToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const ToastContainer = () => (
    <>
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{
            position: 'fixed',
            top: `${20 + index * 70}px`,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: theme.zIndex.toast - index,
          }}
        >
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => hideToast(toast.id)}
          />
        </div>
      ))}
    </>
  )

  return {
    showToast,
    success: (msg: string) => showToast(msg, 'success'),
    error: (msg: string) => showToast(msg, 'error'),
    warning: (msg: string) => showToast(msg, 'warning'),
    info: (msg: string) => showToast(msg, 'info'),
    ToastContainer,
  }
}
