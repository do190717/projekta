// ===========================================
// Projekta - TopicCard Component
// ===========================================
// כרטיס נושא ברשימה - סיכום, התקדמות, תגיות
// ===========================================

'use client'

import React from 'react'
import { theme, baseStyles } from '@/lib/design-system'
import {
  TopicRow,
  TOPIC_TYPE_CONFIG,
  TOPIC_STATUS_CONFIG,
  PRIORITY_CONFIG,
  getTopicProgress,
  formatDeadline,
} from '@/hooks/updates-v2'

interface TopicCardProps {
  topic: TopicRow
  onClick: (topicId: string) => void
}

export default function TopicCard({ topic, onClick }: TopicCardProps) {
  const typeConfig = TOPIC_TYPE_CONFIG[topic.topic_type]
  const statusConfig = TOPIC_STATUS_CONFIG[topic.status]
  const priorityConfig = PRIORITY_CONFIG[topic.priority]
  const progress = getTopicProgress(topic)
  const deadlineText = formatDeadline(topic.deadline)
  const isOverdue = topic.deadline && new Date(topic.deadline) < new Date()

  return (
    <div
      onClick={() => onClick(topic.id)}
      style={{
        ...baseStyles.card.base,
        padding: theme.spacing[5],
        cursor: 'pointer',
        direction: 'rtl',
        animation: 'fadeInUp 0.3s ease-out',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        Object.assign(e.currentTarget.style, {
          boxShadow: theme.shadows.md,
          borderColor: theme.colors.primary[200],
          transform: 'translateY(-1px)',
        })
      }}
      onMouseLeave={(e) => {
        Object.assign(e.currentTarget.style, {
          boxShadow: theme.shadows.sm,
          borderColor: theme.colors.border.light,
          transform: 'translateY(0)',
        })
      }}
    >
      {/* פס צבע עליון לפי סוג */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          left: 0,
          height: '3px',
          backgroundColor: typeConfig.color,
          borderRadius: `${theme.borderRadius.xl} ${theme.borderRadius.xl} 0 0`,
        }}
      />

      {/* שורה עליונה: סוג + עדיפות + סטטוס */}
      <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2], marginBottom: theme.spacing[3], flexWrap: 'wrap' }}>
        {/* סוג נושא */}
        <span
          style={{
            ...baseStyles.badge.base,
            backgroundColor: typeConfig.bgColor,
            color: typeConfig.color,
          }}
        >
          {typeConfig.icon} {typeConfig.name}
        </span>

        {/* עדיפות */}
        <span
          style={{
            ...baseStyles.badge.base,
            backgroundColor: priorityConfig.bgColor,
            color: priorityConfig.color,
          }}
        >
          {priorityConfig.icon} {priorityConfig.name}
        </span>

        {/* סטטוס - מימין */}
        <span
          style={{
            ...baseStyles.badge.base,
            backgroundColor: statusConfig.bgColor,
            color: statusConfig.color,
            marginRight: 'auto',
          }}
        >
          {statusConfig.icon} {statusConfig.name}
        </span>

        {/* נעול */}
        {topic.locked && (
          <span style={{ fontSize: theme.typography.fontSize.sm }}>🔒</span>
        )}
      </div>

      {/* כותרת */}
      <h3
        style={{
          fontSize: theme.typography.fontSize.lg,
          fontWeight: theme.typography.fontWeight.semibold,
          color: theme.colors.text.primary,
          fontFamily: theme.typography.fontFamily.sans,
          margin: `0 0 ${theme.spacing[2]} 0`,
          lineHeight: theme.typography.lineHeight.tight,
        }}
      >
        {topic.title}
      </h3>

      {/* תיאור - אם יש */}
      {topic.description && (
        <p
          style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.text.tertiary,
            fontFamily: theme.typography.fontFamily.sans,
            margin: `0 0 ${theme.spacing[3]} 0`,
            lineHeight: theme.typography.lineHeight.normal,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as any,
          }}
        >
          {topic.description}
        </p>
      )}

      {/* פס התקדמות */}
      {topic.items_total > 0 && (
        <div style={{ marginBottom: theme.spacing[3] }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: theme.spacing[1],
            }}
          >
            <span
              style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.text.tertiary,
                fontFamily: theme.typography.fontFamily.sans,
              }}
            >
              {topic.items_resolved} / {topic.items_total} סעיפים
            </span>
            <span
              style={{
                fontSize: theme.typography.fontSize.xs,
                color: progress === 100 ? theme.colors.success.main : theme.colors.text.tertiary,
                fontWeight: theme.typography.fontWeight.medium,
                fontFamily: theme.typography.fontFamily.sans,
              }}
            >
              {progress}%
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: '4px',
              backgroundColor: theme.colors.gray[100],
              borderRadius: theme.borderRadius.full,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor:
                  progress === 100
                    ? theme.colors.success.main
                    : progress > 50
                    ? theme.colors.primary[500]
                    : theme.colors.warning.main,
                borderRadius: theme.borderRadius.full,
                transition: `width ${theme.transitions.slow}`,
              }}
            />
          </div>
        </div>
      )}

      {/* שורה תחתונה: תאריך + דדליין */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: theme.spacing[2],
        }}
      >
        <span
          style={{
            fontSize: theme.typography.fontSize.xs,
            color: theme.colors.text.disabled,
            fontFamily: theme.typography.fontFamily.sans,
          }}
        >
          {new Date(topic.created_at).toLocaleDateString('he-IL')}
        </span>

        {deadlineText && (
          <span
            style={{
              fontSize: theme.typography.fontSize.xs,
              fontWeight: theme.typography.fontWeight.medium,
              color: isOverdue ? theme.colors.error.main : theme.colors.text.tertiary,
              fontFamily: theme.typography.fontFamily.sans,
            }}
          >
            ⏰ {deadlineText}
          </span>
        )}
      </div>
    </div>
  )
}
