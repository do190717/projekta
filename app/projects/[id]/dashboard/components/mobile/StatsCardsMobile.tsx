// ====================================
// 📦 STATS CARDS - MOBILE
// ====================================
// כרטיסי סטטיסטיקה - גרסת Mobile
// ====================================

import React from 'react'

// ====================================
// 📘 TYPES
// ====================================

import type { StatCard } from '../../types'

interface StatsCardsMobileProps {
  stats: StatCard[]
}

// ====================================
// 🎨 COMPONENT
// ====================================

/**
 * מציג 4 כרטיסי סטטיסטיקה ב-Grid 2x2 (Mobile)
 * 
 * @param stats - מערך של 4 כרטיסים להצגה
 * 
 * @example
 * const stats = [
 *   { icon: '📋', title: 'עדכונים', value: 10, subtitle: '1 פתוחים', color: '#3B82F6' }
 * ]
 * <StatsCardsMobile stats={stats} />
 */
export function StatsCardsMobile({ stats }: StatsCardsMobileProps) {
  return (
    <div style={{ 
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '12px',
      marginBottom: '16px'
    }}>
      {stats.map((stat, idx) => (
        <StatCardMobileItem key={idx} stat={stat} />
      ))}
    </div>
  )
}

// ====================================
// 🧩 SUB-COMPONENTS
// ====================================

interface StatCardMobileItemProps {
  stat: StatCard
}

function StatCardMobileItem({ stat }: StatCardMobileItemProps) {
  return (
    <div
      onClick={stat.onClick}
      style={{
        padding: '16px',
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '2px solid #e5e7eb',
        cursor: stat.onClick ? 'pointer' : 'default',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        transition: 'all 0.2s ease',
      }}
      onTouchStart={(e) => {
        if (stat.onClick) {
          e.currentTarget.style.transform = 'scale(0.98)'
        }
      }}
      onTouchEnd={(e) => {
        if (stat.onClick) {
          e.currentTarget.style.transform = 'scale(1)'
        }
      }}
    >
      {/* Icon */}
      <div style={{ fontSize: '28px', marginBottom: '8px' }}>
        {stat.icon}
      </div>

      {/* Value */}
      <div style={{ 
        fontSize: '22px', 
        fontWeight: '700', 
        color: stat.color, 
        marginBottom: '4px' 
      }}>
        {stat.value}
      </div>

      {/* Title */}
      <div style={{ 
        fontSize: '13px', 
        fontWeight: '600', 
        marginBottom: '2px', 
        color: '#1e293b' 
      }}>
        {stat.title}
      </div>

      {/* Subtitle */}
      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
        {stat.subtitle}
      </div>
    </div>
  )
}