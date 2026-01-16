'use client'

import { useState } from 'react'
import { useParams, useRouter, usePathname } from 'next/navigation'

interface MobileSidebarProps {
  projectName: string
  currentPage?: string
}

export default function MobileSidebar({ projectName, currentPage }: MobileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const params = useParams()
  const pathname = usePathname()
  const projectId = params.id as string

  const menuItems = [
    {
      icon: '🏠',
      label: 'דשבורד',
      path: `/projects/${projectId}`,
      key: 'dashboard'
    },
    {
      icon: '📊',
      label: 'תקציב',
      path: `/projects/${projectId}/budget`,
      key: 'budget'
    },
    {
      icon: '💰',
      label: 'תזרים מזומנים',
      path: `/projects/${projectId}/cash-flow`,
      key: 'cash-flow'
    },
    {
      icon: '📁',
      label: 'קבצים',
      path: `/projects/${projectId}/files`,
      key: 'files'
    },
    {
      icon: '⚙️',
      label: 'הגדרות',
      path: `/projects/${projectId}/settings`,
      key: 'settings'
    },
  ]

  function handleNavigate(path: string) {
    setIsOpen(false)
    router.push(path)
  }

  function isActivePath(path: string) {
    return pathname === path || pathname?.startsWith(path + '/')
  }

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          width: '40px',
          height: '40px',
          backgroundColor: 'white',
          border: '2px solid #e5e7eb',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: '20px',
          zIndex: 1001,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        {isOpen ? '✕' : '☰'}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999,
          }}
        />
      )}

      {/* Sidebar */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: isOpen ? 0 : '-280px',
          width: '280px',
          height: '100vh',
          backgroundColor: 'white',
          boxShadow: '-4px 0 6px rgba(0, 0, 0, 0.1)',
          transition: 'right 0.3s ease',
          zIndex: 1000,
          fontFamily: 'Heebo, sans-serif',
          direction: 'rtl',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '24px 20px',
          borderBottom: '2px solid #e5e7eb',
          backgroundColor: '#f8fafc',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '8px',
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              backgroundColor: '#6366F1',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
            }}>
              🏗️
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: '700',
                color: '#1e293b',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {projectName}
              </h2>
              <p style={{
                margin: 0,
                fontSize: '12px',
                color: '#64748b',
              }}>
                ניהול פרויקט
              </p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div style={{
          flex: 1,
          padding: '16px 0',
          overflowY: 'auto',
        }}>
          {menuItems.map((item) => {
            const isActive = isActivePath(item.path)
            
            return (
              <button
                key={item.key}
                onClick={() => handleNavigate(item.path)}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  backgroundColor: isActive ? '#EFF6FF' : 'transparent',
                  border: 'none',
                  borderRight: isActive ? '4px solid #6366F1' : '4px solid transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  fontFamily: 'Heebo, sans-serif',
                  transition: 'all 0.2s ease',
                  textAlign: 'right',
                }}
              >
                <span style={{ fontSize: '20px' }}>{item.icon}</span>
                <span style={{
                  fontSize: '15px',
                  fontWeight: isActive ? '700' : '500',
                  color: isActive ? '#6366F1' : '#475569',
                }}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: '2px solid #e5e7eb',
          backgroundColor: '#f8fafc',
        }}>
          <button
            onClick={() => {
              setIsOpen(false)
              router.push('/projects')
            }}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: 'white',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#64748b',
              cursor: 'pointer',
              fontFamily: 'Heebo, sans-serif',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <span>←</span>
            <span>חזור לפרויקטים</span>
          </button>
        </div>
      </div>
    </>
  )
}
