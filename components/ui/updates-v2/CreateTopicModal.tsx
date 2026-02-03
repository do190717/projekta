// ===========================================
// Projekta - CreateTopicModal Component
// ===========================================
// מודאל ליצירת נושא חדש עם סעיפים דינמיים
// ===========================================

'use client'

import React, { useState, useRef, useEffect } from 'react'
import { theme, baseStyles } from '@/lib/design-system'
import {
  CreateTopicForm,
  CreateItemForm,
  TopicType,
  PriorityLevel,
  TOPIC_TYPE_CONFIG,
  PRIORITY_CONFIG,
} from '@/hooks/updates-v2'

interface CreateTopicModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (form: CreateTopicForm) => Promise<void>
  loading?: boolean
}

const EMPTY_ITEM: CreateItemForm = { title: '', description: '' }

export default function CreateTopicModal({
  isOpen,
  onClose,
  onSubmit,
  loading = false,
}: CreateTopicModalProps) {
  const [form, setForm] = useState<CreateTopicForm>({
    title: '',
    description: '',
    topic_type: 'defects',
    priority: 'medium',
    deadline: null,
    items: [{ ...EMPTY_ITEM }],
  })

  const titleRef = useRef<HTMLInputElement>(null)
  const itemsEndRef = useRef<HTMLDivElement>(null)

  // פוקוס על הכותרת כשנפתח
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => titleRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Reset כשנסגר
  useEffect(() => {
    if (!isOpen) {
      setForm({
        title: '',
        description: '',
        topic_type: 'defects',
        priority: 'medium',
        deadline: null,
        items: [{ ...EMPTY_ITEM }],
      })
    }
  }, [isOpen])

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { ...EMPTY_ITEM }],
    }))
    setTimeout(() => itemsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  const removeItem = (index: number) => {
    if (form.items.length <= 1) return
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }))
  }

  const updateItem = (index: number, field: keyof CreateItemForm, value: string) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }))
  }

  const handleSubmit = async () => {
    // ניקוי סעיפים ריקים
    const cleanForm = {
      ...form,
      items: form.items.filter((item) => item.title.trim() !== ''),
    }
    if (!cleanForm.title.trim()) return
    await onSubmit(cleanForm)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }

  if (!isOpen) return null

  return (
    <div
      style={baseStyles.modal.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        style={{
          ...baseStyles.modal.content,
          width: '90%',
          maxWidth: '640px',
          direction: 'rtl',
          fontFamily: theme.typography.fontFamily.sans,
          animation: 'fadeInUp 0.25s ease-out',
        }}
      >
        {/* ===== Header ===== */}
        <div
          style={{
            padding: `${theme.spacing[5]} ${theme.spacing[6]}`,
            borderBottom: `1px solid ${theme.colors.border.light}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2
            style={{
              fontSize: theme.typography.fontSize.xl,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.text.primary,
              margin: 0,
            }}
          >
            📋 נושא חדש
          </h2>
          <button
            onClick={onClose}
            style={{
              ...baseStyles.button.base,
              ...baseStyles.button.ghost,
              fontSize: theme.typography.fontSize.lg,
              padding: theme.spacing[2],
            }}
          >
            ✕
          </button>
        </div>

        {/* ===== Body ===== */}
        <div
          style={{
            padding: theme.spacing[6],
            maxHeight: '60vh',
            overflowY: 'auto',
          }}
        >
          {/* כותרת */}
          <div style={{ marginBottom: theme.spacing[4] }}>
            <label style={labelStyle}>כותרת *</label>
            <input
              ref={titleRef}
              type="text"
              placeholder='לדוגמה: "ליקויים דירה 4 קומה ב"'
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              style={baseStyles.input.base}
              onFocus={(e) => Object.assign(e.currentTarget.style, baseStyles.input.focus)}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = theme.colors.border.light
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
          </div>

          {/* תיאור */}
          <div style={{ marginBottom: theme.spacing[4] }}>
            <label style={labelStyle}>תיאור (אופציונלי)</label>
            <textarea
              placeholder="פרטים נוספים על הנושא..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              style={{
                ...baseStyles.input.base,
                resize: 'vertical' as const,
                minHeight: '60px',
              }}
              onFocus={(e) => Object.assign(e.currentTarget.style, baseStyles.input.focus)}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = theme.colors.border.light
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
          </div>

          {/* שורת בחירה: סוג + עדיפות */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: theme.spacing[4],
              marginBottom: theme.spacing[4],
            }}
          >
            {/* סוג */}
            <div>
              <label style={labelStyle}>סוג</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing[2] }}>
                {Object.entries(TOPIC_TYPE_CONFIG).map(([key, config]) => {
                  const isSelected = form.topic_type === key
                  return (
                    <button
                      key={key}
                      onClick={() => setForm({ ...form, topic_type: key as TopicType })}
                      style={{
                        ...baseStyles.badge.base,
                        cursor: 'pointer',
                        border: `1.5px solid ${isSelected ? config.color : theme.colors.border.light}`,
                        backgroundColor: isSelected ? config.bgColor : 'transparent',
                        color: isSelected ? config.color : theme.colors.text.secondary,
                        padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
                        fontSize: theme.typography.fontSize.sm,
                        transition: `all ${theme.transitions.fast}`,
                      }}
                    >
                      {config.icon} {config.name}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* עדיפות */}
            <div>
              <label style={labelStyle}>עדיפות</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing[2] }}>
                {Object.entries(PRIORITY_CONFIG).map(([key, config]) => {
                  const isSelected = form.priority === key
                  return (
                    <button
                      key={key}
                      onClick={() => setForm({ ...form, priority: key as PriorityLevel })}
                      style={{
                        ...baseStyles.badge.base,
                        cursor: 'pointer',
                        border: `1.5px solid ${isSelected ? config.color : theme.colors.border.light}`,
                        backgroundColor: isSelected ? config.bgColor : 'transparent',
                        color: isSelected ? config.color : theme.colors.text.secondary,
                        padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
                        fontSize: theme.typography.fontSize.sm,
                        transition: `all ${theme.transitions.fast}`,
                      }}
                    >
                      {config.icon} {config.name}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* דדליין */}
          <div style={{ marginBottom: theme.spacing[6] }}>
            <label style={labelStyle}>דדליין (אופציונלי)</label>
            <input
              type="datetime-local"
              value={form.deadline || ''}
              onChange={(e) => setForm({ ...form, deadline: e.target.value || null })}
              style={{
                ...baseStyles.input.base,
                maxWidth: '250px',
              }}
              onFocus={(e) => Object.assign(e.currentTarget.style, baseStyles.input.focus)}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = theme.colors.border.light
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
          </div>

          {/* ===== סעיפים ===== */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: theme.spacing[3],
              }}
            >
              <label style={{ ...labelStyle, marginBottom: 0 }}>
                סעיפים ({form.items.filter((i) => i.title.trim()).length})
              </label>
              <button
                onClick={addItem}
                style={{
                  ...baseStyles.button.base,
                  ...baseStyles.button.ghost,
                  color: theme.colors.primary[600],
                  fontSize: theme.typography.fontSize.sm,
                  gap: theme.spacing[1],
                }}
              >
                + סעיף
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
              {form.items.map((item, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    gap: theme.spacing[3],
                    alignItems: 'flex-start',
                    animation: 'fadeInUp 0.2s ease-out',
                  }}
                >
                  {/* מספר סעיף */}
                  <span
                    style={{
                      minWidth: '28px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: theme.colors.primary[50],
                      color: theme.colors.primary[600],
                      borderRadius: theme.borderRadius.full,
                      fontSize: theme.typography.fontSize.xs,
                      fontWeight: theme.typography.fontWeight.bold,
                      marginTop: theme.spacing[2],
                    }}
                  >
                    {index + 1}
                  </span>

                  {/* שדות */}
                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      placeholder={`סעיף ${index + 1} - כותרת`}
                      value={item.title}
                      onChange={(e) => updateItem(index, 'title', e.target.value)}
                      style={{
                        ...baseStyles.input.base,
                        marginBottom: theme.spacing[2],
                      }}
                      onFocus={(e) => Object.assign(e.currentTarget.style, baseStyles.input.focus)}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = theme.colors.border.light
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          if (index === form.items.length - 1) addItem()
                        }
                      }}
                    />
                    <input
                      type="text"
                      placeholder="תיאור (אופציונלי)"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      style={{
                        ...baseStyles.input.base,
                        fontSize: theme.typography.fontSize.sm,
                        padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
                        backgroundColor: theme.colors.gray[50],
                      }}
                      onFocus={(e) => Object.assign(e.currentTarget.style, baseStyles.input.focus)}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = theme.colors.border.light
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    />
                  </div>

                  {/* מחיקה */}
                  {form.items.length > 1 && (
                    <button
                      onClick={() => removeItem(index)}
                      style={{
                        ...baseStyles.button.base,
                        ...baseStyles.button.ghost,
                        padding: theme.spacing[2],
                        color: theme.colors.text.disabled,
                        marginTop: theme.spacing[2],
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = theme.colors.error.main
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = theme.colors.text.disabled
                      }}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ))}
              <div ref={itemsEndRef} />
            </div>
          </div>
        </div>

        {/* ===== Footer ===== */}
        <div
          style={{
            padding: `${theme.spacing[4]} ${theme.spacing[6]}`,
            borderTop: `1px solid ${theme.colors.border.light}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: theme.spacing[3],
          }}
        >
          <button
            onClick={onClose}
            style={{
              ...baseStyles.button.base,
              ...baseStyles.button.secondary,
            }}
          >
            ביטול
          </button>

          <button
            onClick={handleSubmit}
            disabled={!form.title.trim() || loading}
            style={{
              ...baseStyles.button.base,
              ...baseStyles.button.primary,
              opacity: !form.title.trim() || loading ? 0.5 : 1,
              cursor: !form.title.trim() || loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? (
              <>
                <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
                שומר...
              </>
            ) : (
              <>✅ יצירת נושא</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ===== Shared styles =====

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: theme.typography.fontSize.sm,
  fontWeight: theme.typography.fontWeight.semibold,
  color: theme.colors.text.secondary,
  marginBottom: theme.spacing[2],
  fontFamily: theme.typography.fontFamily.sans,
}
