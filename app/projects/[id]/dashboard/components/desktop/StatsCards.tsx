// ====================================
// 📦 STATS CARDS - DESKTOP
// ====================================
// כרטיסי סטטיסטיקה - גרסת Desktop
// ====================================

import React from 'react'

// ====================================
// 📘 TYPES
// ====================================

import type { StatCard } from '../../types'

interface StatsCardsProps {
  stats: StatCard[]
}

// ====================================
// 🎨 COMPONENT
// ====================================

/**
 * מציג 4 כרטיסי סטטיסטיקה בשורה אחת
 * 
 * @param stats - מערך של 4 כרטיסים להצגה
 * 
 * @example
 * const stats = [
 *   { icon: '📋', title: 'עדכונים', value: 10, subtitle: '1 פתוחים', color: '#3B82F6' }
 * ]
 * <StatsCards stats={stats} />
 */
export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '20px',
      marginBottom: '32px'
    }}>
      {stats.map((stat, idx) => (
        <StatCardItem key={idx} stat={stat} />
      ))}
    </div>
  )
}

// ====================================
// 🧩 SUB-COMPONENTS
// ====================================

interface StatCardItemProps {
  stat: StatCard
}

function StatCardItem({ stat }: StatCardItemProps) {
  return (
    <div
      onClick={stat.onClick}
      style={{
        padding: '24px',
        backgroundColor: 'white',
        borderRadius: '16px',
        border: '2px solid #e5e7eb',
        cursor: stat.onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}
      onMouseEnter={(e) => {
        if (stat.onClick) {
          e.currentTarget.style.borderColor = stat.color
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
        }
      }}
      onMouseLeave={(e) => {
        if (stat.onClick) {
          e.currentTarget.style.borderColor = '#e5e7eb'
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
        }
      }}
    >
      {/* Icon */}
      <div style={{ fontSize: '36px', marginBottom: '16px' }}>
        {stat.icon}
      </div>

      {/* Value */}
      <div style={{ 
        fontSize: '28px', 
        fontWeight: '700', 
        color: stat.color, 
        marginBottom: '8px' 
      }}>
        {stat.value}
      </div>

      {/* Title */}
      <div style={{ 
        fontSize: '15px', 
        fontWeight: '600', 
        marginBottom: '4px', 
        color: '#1e293b' 
      }}>
        {stat.title}
      </div>

      {/* Subtitle */}
      <div style={{ fontSize: '13px', color: '#94a3b8' }}>
        {stat.subtitle}
      </div>
    </div>
  )
}