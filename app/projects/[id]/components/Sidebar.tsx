'use client'

import { usePathname, useRouter } from 'next/navigation'

interface SidebarProps {
  projectName: string
}

export default function Sidebar({ projectName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  
  // Extract project ID from pathname
  const projectId = pathname?.split('/')[2]
  
  const menuItems = [
    {
      id: 'dashboard',
      icon: '🏠',
      label: 'דשבורד',
      href: `/projects/${projectId}`,
      enabled: true,
    },
    {
      id: 'updates',
      icon: '📋',
      label: 'עדכונים',
      href: `/projects/${projectId}/updates`,
      enabled: true,
    },
    {
      id: 'files',
      icon: '📁',
      label: 'קבצים',
      href: `/projects/${projectId}/files`,
      enabled: true,
    },
    {
      id: 'cash-flow',
      icon: '💰',
      label: 'תזרים מזומנים',
      href: `/projects/${projectId}/cash-flow`,
      enabled: true,
      highlight: true, // NEW!
    },
    {
      id: 'budget',          
      icon: '📊',            
      label: 'תקציב',        
      href: `/projects/${projectId}/budget`,  
      enabled: true,         
      highlight: true,       
    },
    {
      id: 'workforce',
      icon: '👷',
      label: 'כוח אדם',
      href: `/projects/${projectId}/workforce`,
      enabled: false,
    },
    {
      id: 'schedule',
      icon: '📅',
      label: 'לוחות זמנים',
      href: `/projects/${projectId}/schedule`,
      enabled: false,
    },
    {
      id: 'issues',
      icon: '⚠️',
      label: 'ליקויים',
      href: `/projects/${projectId}/issues`,
      enabled: false,
    },
  ]
  
  const isActive = (href: string) => {
    if (href === `/projects/${projectId}`) {
      return pathname === href
    }
    return pathname?.startsWith(href)
  }
  
  return (
    <div style={{
      position: 'fixed',
      right: 0,
      top: 0,
      bottom: 0,
      width: '260px',
      backgroundColor: '#1e293b',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
      fontFamily: 'Heebo, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        padding: '24px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        <div style={{ 
          fontSize: '24px', 
          fontWeight: '700', 
          marginBottom: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span>Projekta</span>
          <span style={{ fontSize: '16px' }}>🏗️</span>
        </div>
        <div style={{ 
          fontSize: '13px', 
          color: 'rgba(255,255,255,0.6)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {projectName}
        </div>
      </div>
      
      {/* Menu Items */}
      <div style={{
        flex: 1,
        padding: '16px 12px',
        overflowY: 'auto',
      }}>
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => item.enabled && router.push(item.href)}
            disabled={!item.enabled}
            style={{
              width: '100%',
              padding: '14px 16px',
              marginBottom: '6px',
              backgroundColor: isActive(item.href) 
                ? 'rgba(99, 102, 241, 0.2)' 
                : item.highlight 
                ? 'rgba(16, 185, 129, 0.1)'
                : 'transparent',
              border: isActive(item.href) 
                ? '2px solid #6366F1' 
                : item.highlight
                ? '2px solid rgba(16, 185, 129, 0.3)'
                : '2px solid transparent',
              borderRadius: '12px',
              color: !item.enabled 
                ? 'rgba(255,255,255,0.3)' 
                : item.highlight
                ? '#10B981'
                : 'white',
              fontSize: '15px',
              fontWeight: '600',
              cursor: item.enabled ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.2s ease',
              fontFamily: 'Heebo, sans-serif',
              textAlign: 'right',
            }}
            onMouseEnter={(e) => {
              if (item.enabled && !isActive(item.href)) {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'
              }
            }}
            onMouseLeave={(e) => {
              if (item.enabled && !isActive(item.href)) {
                e.currentTarget.style.backgroundColor = item.highlight 
                  ? 'rgba(16, 185, 129, 0.1)' 
                  : 'transparent'
              }
            }}
          >
            <span style={{ fontSize: '20px' }}>{item.icon}</span>
            <span style={{ flex: 1 }}>{item.label}</span>
            {!item.enabled && (
              <span style={{ 
                fontSize: '11px', 
                padding: '2px 8px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: '6px',
              }}>
                🔜
              </span>
            )}
            {item.highlight && item.enabled && (
              <span style={{ 
                fontSize: '11px', 
                padding: '2px 8px',
                backgroundColor: '#10B981',
                color: 'white',
                borderRadius: '6px',
                fontWeight: '700',
              }}>
                חדש!
              </span>
            )}
          </button>
        ))}
      </div>
      
      {/* Back Button */}
      <div style={{
        padding: '16px 12px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
      }}>
        <button
          onClick={() => router.push('/projects')}
          style={{
            width: '100%',
            padding: '12px 16px',
            backgroundColor: 'rgba(255,255,255,0.05)',
            border: '2px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            color: 'white',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transition: 'all 0.2s ease',
            fontFamily: 'Heebo, sans-serif',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'
          }}
        >
          <span>←</span>
          <span>חזרה לפרויקטים</span>
        </button>
      </div>
      
      {/* Footer */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        fontSize: '12px',
        color: 'rgba(255,255,255,0.4)',
        textAlign: 'center',
      }}>
        Projekta v3.0
      </div>
    </div>
  )
}
