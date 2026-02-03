// ===========================================
// Projekta - TopicsList Component
// ===========================================
// רשימת נושאים + פילטרים + חיפוש + כפתור יצירה
// ===========================================

'use client'

import React, { useState } from 'react'
import { theme, baseStyles } from '@/lib/design-system'
import {
  useTopics,
  TopicRow,
  TopicFilters,
  TopicType,
  TopicStatus,
  PriorityLevel,
  TOPIC_TYPE_CONFIG,
  TOPIC_STATUS_CONFIG,
  PRIORITY_CONFIG,
} from '@/hooks/updates-v2'
import TopicCard from './TopicCard'

interface TopicsListProps {
  projectId: string
  onSelectTopic: (topicId: string) => void
  onCreateNew: () => void
}

export default function TopicsList({ projectId, onSelectTopic, onCreateNew }: TopicsListProps) {
  const { topics, loading, error, filters, setFilters } = useTopics(projectId)
  const [showFilters, setShowFilters] = useState(false)

  // ספירות לפי סטטוס
  const statusCounts = {
    all: topics.length,
    open: topics.filter((t) => t.status === 'open').length,
    in_progress: topics.filter((t) => t.status === 'in_progress').length,
    resolved: topics.filter((t) => t.status === 'resolved').length,
    closed: topics.filter((t) => t.status === 'closed').length,
  }

  return (
    <div style={{ direction: 'rtl', fontFamily: theme.typography.fontFamily.sans }}>
      {/* ===== Header ===== */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: theme.spacing[6],
          gap: theme.spacing[4],
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.text.primary,
              margin: 0,
            }}
          >
            נושאים מובנים
          </h2>
          <p
            style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.text.tertiary,
              margin: `${theme.spacing[1]} 0 0 0`,
            }}
          >
            {topics.length} נושאים בפרויקט
          </p>
        </div>

        <button
          onClick={onCreateNew}
          style={{
            ...baseStyles.button.base,
            ...baseStyles.button.primary,
            gap: theme.spacing[2],
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.primary[600]
            e.currentTarget.style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.primary[500]
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          <span style={{ fontSize: theme.typography.fontSize.lg }}>+</span>
          נושא חדש
        </button>
      </div>

      {/* ===== טאבים לפי סטטוס ===== */}
      <div
        style={{
          display: 'flex',
          gap: theme.spacing[1],
          marginBottom: theme.spacing[4],
          borderBottom: `1px solid ${theme.colors.border.light}`,
          overflowX: 'auto',
        }}
      >
        {(
          [
            { key: 'all', label: 'הכל' },
            { key: 'open', label: 'פתוחים' },
            { key: 'in_progress', label: 'בטיפול' },
            { key: 'resolved', label: 'נפתרו' },
            { key: 'closed', label: 'סגורים' },
          ] as const
        ).map((tab) => {
          const isActive = filters.status === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setFilters({ ...filters, status: tab.key as TopicFilters['status'] })}
              style={{
                ...baseStyles.button.base,
                padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                backgroundColor: 'transparent',
                color: isActive ? theme.colors.primary[600] : theme.colors.text.tertiary,
                fontWeight: isActive
                  ? theme.typography.fontWeight.semibold
                  : theme.typography.fontWeight.medium,
                borderBottom: isActive ? `2px solid ${theme.colors.primary[500]}` : '2px solid transparent',
                borderRadius: 0,
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
              <span
                style={{
                  marginRight: theme.spacing[2],
                  backgroundColor: isActive ? theme.colors.primary[50] : theme.colors.gray[100],
                  color: isActive ? theme.colors.primary[600] : theme.colors.text.tertiary,
                  padding: `0 ${theme.spacing[2]}`,
                  borderRadius: theme.borderRadius.full,
                  fontSize: theme.typography.fontSize.xs,
                }}
              >
                {statusCounts[tab.key]}
              </span>
            </button>
          )
        })}
      </div>

      {/* ===== שורת חיפוש + פילטרים ===== */}
      <div
        style={{
          display: 'flex',
          gap: theme.spacing[3],
          marginBottom: theme.spacing[4],
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {/* חיפוש */}
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <span
            style={{
              position: 'absolute',
              right: theme.spacing[3],
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: theme.typography.fontSize.base,
              color: theme.colors.text.disabled,
              pointerEvents: 'none',
            }}
          >
            🔍
          </span>
          <input
            type="text"
            placeholder="חיפוש נושא..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            style={{
              ...baseStyles.input.base,
              paddingRight: theme.spacing[10],
            }}
            onFocus={(e) => Object.assign(e.currentTarget.style, baseStyles.input.focus)}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = theme.colors.border.light
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
        </div>

        {/* כפתור פילטרים */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{
            ...baseStyles.button.base,
            ...baseStyles.button.secondary,
            gap: theme.spacing[2],
            backgroundColor: showFilters ? theme.colors.primary[50] : undefined,
            borderColor: showFilters ? theme.colors.primary[300] : undefined,
            color: showFilters ? theme.colors.primary[600] : undefined,
          }}
        >
          <span>⚙️</span> סינון
        </button>
      </div>

      {/* ===== פילטרים מורחבים ===== */}
      {showFilters && (
        <div
          style={{
            ...baseStyles.card.base,
            padding: theme.spacing[4],
            marginBottom: theme.spacing[4],
            display: 'flex',
            gap: theme.spacing[4],
            flexWrap: 'wrap',
            animation: 'fadeInDown 0.2s ease-out',
          }}
        >
          {/* סוג נושא */}
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label
              style={{
                display: 'block',
                fontSize: theme.typography.fontSize.xs,
                fontWeight: theme.typography.fontWeight.semibold,
                color: theme.colors.text.secondary,
                marginBottom: theme.spacing[2],
                textTransform: 'uppercase' as const,
              }}
            >
              סוג
            </label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value as TopicFilters['type'] })}
              style={{
                ...baseStyles.input.base,
                cursor: 'pointer',
              }}
            >
              <option value="all">הכל</option>
              {Object.entries(TOPIC_TYPE_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.icon} {config.name}
                </option>
              ))}
            </select>
          </div>

          {/* עדיפות */}
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label
              style={{
                display: 'block',
                fontSize: theme.typography.fontSize.xs,
                fontWeight: theme.typography.fontWeight.semibold,
                color: theme.colors.text.secondary,
                marginBottom: theme.spacing[2],
                textTransform: 'uppercase' as const,
              }}
            >
              עדיפות
            </label>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value as TopicFilters['priority'] })}
              style={{
                ...baseStyles.input.base,
                cursor: 'pointer',
              }}
            >
              <option value="all">הכל</option>
              {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.icon} {config.name}
                </option>
              ))}
            </select>
          </div>

          {/* כפתור ניקוי */}
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              onClick={() =>
                setFilters({
                  status: 'all',
                  type: 'all',
                  priority: 'all',
                  search: '',
                })
              }
              style={{
                ...baseStyles.button.base,
                ...baseStyles.button.ghost,
                color: theme.colors.error.main,
                fontSize: theme.typography.fontSize.sm,
              }}
            >
              🗑️ נקה הכל
            </button>
          </div>
        </div>
      )}

      {/* ===== תוכן ===== */}
      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <ErrorState message={error} />
      ) : topics.length === 0 ? (
        <EmptyState onCreateNew={onCreateNew} hasFilters={filters.search !== '' || filters.type !== 'all' || filters.priority !== 'all'} />
      ) : (
        <div
          style={{
            display: 'grid',
            gap: theme.spacing[4],
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          }}
        >
          {topics.map((topic) => (
            <TopicCard key={topic.id} topic={topic} onClick={onSelectTopic} />
          ))}
        </div>
      )}
    </div>
  )
}


// ===== Sub-components =====

function LoadingSkeleton() {
  return (
    <div
      style={{
        display: 'grid',
        gap: theme.spacing[4],
        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
      }}
    >
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            ...baseStyles.card.base,
            padding: theme.spacing[5],
            height: '180px',
            animation: 'shimmer 1.5s infinite',
            background: `linear-gradient(90deg, ${theme.colors.gray[100]} 25%, ${theme.colors.gray[50]} 50%, ${theme.colors.gray[100]} 75%)`,
            backgroundSize: '200% 100%',
          }}
        />
      ))}
    </div>
  )
}

function EmptyState({
  onCreateNew,
  hasFilters,
}: {
  onCreateNew: () => void
  hasFilters: boolean
}) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: `${theme.spacing[16]} ${theme.spacing[4]}`,
        direction: 'rtl',
      }}
    >
      <div style={{ fontSize: '3rem', marginBottom: theme.spacing[4] }}>
        {hasFilters ? '🔍' : '📋'}
      </div>
      <h3
        style={{
          fontSize: theme.typography.fontSize.lg,
          fontWeight: theme.typography.fontWeight.semibold,
          color: theme.colors.text.primary,
          fontFamily: theme.typography.fontFamily.sans,
          margin: `0 0 ${theme.spacing[2]} 0`,
        }}
      >
        {hasFilters ? 'לא נמצאו נושאים' : 'אין נושאים עדיין'}
      </h3>
      <p
        style={{
          fontSize: theme.typography.fontSize.sm,
          color: theme.colors.text.tertiary,
          fontFamily: theme.typography.fontFamily.sans,
          margin: `0 0 ${theme.spacing[6]} 0`,
        }}
      >
        {hasFilters
          ? 'נסה לשנות את הפילטרים או מילות החיפוש'
          : 'צור נושא חדש כדי להתחיל דיון מובנה עם הצוות'}
      </p>
      {!hasFilters && (
        <button
          onClick={onCreateNew}
          style={{
            ...baseStyles.button.base,
            ...baseStyles.button.primary,
          }}
        >
          + נושא חדש
        </button>
      )}
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div
      style={{
        ...baseStyles.card.base,
        padding: theme.spacing[6],
        textAlign: 'center',
        borderColor: theme.colors.error.main,
        backgroundColor: theme.colors.error.light,
        direction: 'rtl',
      }}
    >
      <div style={{ fontSize: '2rem', marginBottom: theme.spacing[3] }}>⚠️</div>
      <p
        style={{
          color: theme.colors.error.dark,
          fontFamily: theme.typography.fontFamily.sans,
          fontSize: theme.typography.fontSize.sm,
          margin: 0,
        }}
      >
        שגיאה בטעינת נושאים: {message}
      </p>
    </div>
  )
}
