'use client'

// ===========================================
// Projekta Chat v2 — Side Panels
// ===========================================
// פאנלים: 📋 משימות, 📌 החלטות, 🔍 חיפוש
// נתיב: components/updates-v2/ChatPanels.tsx
// ===========================================

import { useState, useRef, useEffect } from 'react'
import type { ChatTask, ChatDecision } from '@/lib/updates-v2/useTasks'

// ====== DESIGN TOKENS ======

const C = {
  indigo: '#4F46E5', indigoLight: '#6366F1', indigoPale: '#EEF2FF', indigoGlow: 'rgba(99,102,241,0.12)',
  teal: '#0D9488', tealLight: '#14B8A6', tealPale: '#F0FDFA',
  gold: '#B45309', goldLight: '#D97706', goldPale: '#FEF3C7',
  amber: '#F59E0B',
  slate900: '#0F172A', slate800: '#1E293B', slate700: '#334155',
  slate600: '#475569', slate500: '#64748B', slate400: '#94A3B8',
  slate300: '#CBD5E1', slate200: '#E2E8F0', slate100: '#F1F5F9', slate50: '#F8FAFC',
  white: '#FFFFFF',
  green: '#059669', greenBg: '#ECFDF5',
  red: '#DC2626', redBg: '#FEF2F2',
  orange: '#EA580C', orangeBg: '#FFF7ED',
}

const STATUS_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  pending:     { label: 'ממתין',  icon: '⏳', color: C.indigoLight, bg: C.indigoPale },
  scheduled:   { label: 'מתוזמן', icon: '📅', color: C.teal,        bg: C.tealPale },
  in_progress: { label: 'בביצוע', icon: '🔨', color: C.amber,       bg: C.goldPale },
  blocked:     { label: 'חסום',   icon: '🚫', color: C.red,         bg: C.redBg },
  done:        { label: 'בוצע',   icon: '✅', color: C.green,       bg: C.greenBg },
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low:      { label: 'נמוך',   color: C.slate400 },
  medium:   { label: 'בינוני', color: C.amber },
  high:     { label: 'גבוה',   color: C.orange },
  critical: { label: 'קריטי',  color: C.red },
}

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  'ריצוף':      { bg: '#FEF2F2', color: '#DC2626' },
  'חשמל':      { bg: '#FFF7ED', color: '#EA580C' },
  'דלתות':      { bg: '#F0FDFA', color: '#0D9488' },
  'אינסטלציה':  { bg: '#EFF6FF', color: '#2563EB' },
  'צבע':        { bg: '#F5F3FF', color: '#7C3AED' },
  'אלומיניום':   { bg: '#FEF3C7', color: '#B45309' },
  'כללי':       { bg: C.slate100, color: C.slate600 },
}

function getCategoryStyle(cat: string) {
  return CATEGORY_COLORS[cat] || CATEGORY_COLORS['כללי']
}

// ====== SHARED: Panel Shell ======

function PanelShell({ title, subtitle, icon, onClose, children }: {
  title: string; subtitle?: string; icon: string; onClose: () => void;
  children: React.ReactNode
}) {
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: C.slate50, zIndex: 20,
      display: 'flex', flexDirection: 'column',
      animation: 'panelIn .25s ease',
      direction: 'rtl',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px', backgroundColor: C.white,
        borderBottom: `1px solid ${C.slate200}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>{icon}</span>
          <div>
            <div style={{
              fontSize: 17, fontWeight: 700, color: C.slate900,
              fontFamily: "'Heebo',sans-serif",
            }}>{title}</div>
            {subtitle && (
              <div style={{ fontSize: 12, color: C.slate400, marginTop: 1 }}>{subtitle}</div>
            )}
          </div>
        </div>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: 10,
          border: `1px solid ${C.slate200}`, backgroundColor: C.white,
          fontSize: 18, cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          color: C.slate400, transition: 'all .2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.backgroundColor = C.slate100; e.currentTarget.style.color = C.slate700 }}
        onMouseLeave={e => { e.currentTarget.style.backgroundColor = C.white; e.currentTarget.style.color = C.slate400 }}
        >✕</button>
      </div>
      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {children}
      </div>

      <style>{`
        @keyframes panelIn {
          from { opacity: 0; transform: translateX(-16px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}


// ███████████████████████████████████████
// 📋 TASK BOARD PANEL
// ███████████████████████████████████████

interface TaskBoardProps {
  tasks: ChatTask[]
  stats: { total: number; pending: number; scheduled: number; inProgress: number; blocked: number; done: number }
  onUpdateStatus: (taskId: string, status: ChatTask['status']) => void
  onUpdateTask: (taskId: string, updates: Partial<Pick<ChatTask, 'title' | 'category' | 'priority' | 'assignee_name' | 'deadline' | 'notes'>>) => void
  onDeleteTask: (taskId: string) => void
  onCreateTask: (title: string, category?: string) => void
  onClose: () => void
}

export function TaskBoardPanel({ tasks, stats, onUpdateStatus, onUpdateTask, onDeleteTask, onCreateTask, onClose }: TaskBoardProps) {
  const [filter, setFilter] = useState<string>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState('כללי')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showAdd) inputRef.current?.focus()
  }, [showAdd])

  const filtered = filter === 'all'
    ? tasks.filter(t => t.status !== 'done')
    : filter === 'done'
    ? tasks.filter(t => t.status === 'done')
    : tasks.filter(t => t.status === filter)

  const handleAdd = () => {
    if (!newTitle.trim()) return
    onCreateTask(newTitle.trim(), newCategory)
    setNewTitle('')
    setShowAdd(false)
  }

  return (
    <PanelShell title="לוח משימות" subtitle={`${stats.total} משימות • ${stats.done} הושלמו`} icon="📋" onClose={onClose}>
      {/* Stats */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: `הכל ${stats.total - stats.done}`, color: C.slate600, bg: C.slate100 },
          ...Object.entries(STATUS_CONFIG)
            .filter(([k]) => (stats as any)[k === 'in_progress' ? 'inProgress' : k] > 0)
            .map(([k, v]) => ({
              key: k,
              label: `${v.icon} ${v.label} ${(stats as any)[k === 'in_progress' ? 'inProgress' : k]}`,
              color: v.color,
              bg: v.bg,
            })),
        ].map(chip => (
          <button key={chip.key} onClick={() => setFilter(chip.key)} style={{
            fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 20,
            border: filter === chip.key ? `2px solid ${chip.color}` : `1px solid ${C.slate200}`,
            backgroundColor: filter === chip.key ? chip.bg : 'transparent',
            color: chip.color, cursor: 'pointer', fontFamily: "'Heebo',sans-serif",
            transition: 'all .15s',
          }}>{chip.label}</button>
        ))}
      </div>

      {/* Add Task */}
      {!showAdd ? (
        <button onClick={() => setShowAdd(true)} style={{
          width: '100%', padding: '12px 16px', borderRadius: 12,
          border: `2px dashed ${C.slate300}`, backgroundColor: 'transparent',
          color: C.slate400, fontSize: 14, fontWeight: 600, cursor: 'pointer',
          fontFamily: "'Heebo',sans-serif", marginBottom: 12, transition: 'all .2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = C.indigoLight; e.currentTarget.style.color = C.indigoLight }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = C.slate300; e.currentTarget.style.color = C.slate400 }}
        >+ הוסף משימה</button>
      ) : (
        <div style={{
          padding: '14px', borderRadius: 12, backgroundColor: C.white,
          border: `2px solid ${C.indigoLight}`, marginBottom: 12,
          boxShadow: `0 2px 12px ${C.indigoGlow}`,
        }}>
          <input ref={inputRef} value={newTitle} onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="תיאור המשימה..."
            style={{
              width: '100%', border: 'none', outline: 'none',
              fontSize: 14, fontFamily: "'Heebo',sans-serif",
              color: C.slate900, marginBottom: 10, direction: 'rtl',
            }}
          />
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'space-between' }}>
            <select value={newCategory} onChange={e => setNewCategory(e.target.value)} style={{
              padding: '5px 10px', borderRadius: 8, border: `1px solid ${C.slate200}`,
              fontSize: 12, fontFamily: "'Heebo',sans-serif", color: C.slate700,
            }}>
              {Object.keys(CATEGORY_COLORS).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setShowAdd(false)} style={{
                padding: '5px 14px', borderRadius: 8, border: `1px solid ${C.slate200}`,
                backgroundColor: 'transparent', color: C.slate400, fontSize: 13,
                cursor: 'pointer', fontFamily: "'Heebo',sans-serif",
              }}>ביטול</button>
              <button onClick={handleAdd} disabled={!newTitle.trim()} style={{
                padding: '5px 18px', borderRadius: 8, border: 'none',
                background: `linear-gradient(135deg, ${C.indigo}, ${C.indigoLight})`,
                color: '#fff', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: "'Heebo',sans-serif",
                opacity: newTitle.trim() ? 1 : 0.5,
              }}>הוסף</button>
            </div>
          </div>
        </div>
      )}

      {/* Tasks List */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: C.slate400 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>
            {filter === 'done' ? '🎉' : '📋'}
          </div>
          <div style={{ fontSize: 14 }}>
            {filter === 'done' ? 'אין משימות שהושלמו' : 'אין משימות פתוחות'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((task, i) => (
            <TaskCard key={task.id} task={task} index={i}
              onUpdateStatus={onUpdateStatus} onUpdateTask={onUpdateTask} onDelete={onDeleteTask} />
          ))}
        </div>
      )}
    </PanelShell>
  )
}

function TaskCard({ task, index, onUpdateStatus, onUpdateTask, onDelete }: {
  task: ChatTask; index: number;
  onUpdateStatus: (id: string, status: ChatTask['status']) => void;
  onUpdateTask: (id: string, updates: Partial<Pick<ChatTask, 'title' | 'category' | 'priority' | 'assignee_name' | 'deadline' | 'notes'>>) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [editCategory, setEditCategory] = useState(task.category)
  const [editPriority, setEditPriority] = useState<string>(task.priority)
  const [editAssignee, setEditAssignee] = useState(task.assignee_name || '')
  const [editDeadline, setEditDeadline] = useState(task.deadline || '')
  const [editNotes, setEditNotes] = useState(task.notes || '')

  const s = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending
  const cat = getCategoryStyle(task.category)
  const pri = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium

  const handleSave = () => {
    onUpdateTask(task.id, {
      title: editTitle.trim() || task.title,
      category: editCategory,
      priority: editPriority as ChatTask['priority'],
      assignee_name: editAssignee.trim() || null,
      deadline: editDeadline || null,
      notes: editNotes.trim() || null,
    })
    setEditing(false)
  }

  return (
    <div style={{
      borderRadius: 12, backgroundColor: C.white,
      border: editing ? `2px solid ${C.indigoLight}` : `1px solid ${C.slate200}`,
      overflow: 'hidden',
      animation: `panelIn .25s ease ${index * 0.03}s both`,
      transition: 'all .2s',
      boxShadow: editing ? `0 4px 16px ${C.indigoGlow}` : 'none',
    }}
    onMouseEnter={e => { if (!editing) e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,.06)' }}
    onMouseLeave={e => { if (!editing) e.currentTarget.style.boxShadow = 'none' }}
    >
      {/* Main row */}
      <div onClick={() => !editing && setExpanded(!expanded)} style={{
        padding: '12px 14px', cursor: editing ? 'default' : 'pointer',
        display: 'flex', alignItems: 'flex-start', gap: 10,
      }}>
        {/* Status toggle */}
        <button onClick={(e) => {
          e.stopPropagation()
          onUpdateStatus(task.id, task.status === 'done' ? 'pending' : 'done')
        }} style={{
          width: 24, height: 24, borderRadius: 7, border: 'none',
          backgroundColor: task.status === 'done' ? C.green : s.bg,
          color: task.status === 'done' ? '#fff' : s.color,
          fontSize: 12, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, marginTop: 1,
        }}>{task.status === 'done' ? '✓' : s.icon}</button>

        <div style={{ flex: 1, minWidth: 0 }}>
          {!editing ? (
            <>
              <div style={{
                fontSize: 14, fontWeight: 600, color: C.slate900,
                fontFamily: "'Heebo',sans-serif", lineHeight: 1.4,
                textDecoration: task.status === 'done' ? 'line-through' : 'none',
                opacity: task.status === 'done' ? 0.5 : 1,
              }}>{task.title}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6, alignItems: 'center' }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
                  backgroundColor: cat.bg, color: cat.color,
                }}>{task.category}</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                  backgroundColor: pri.color + '18', color: pri.color,
                }}>{pri.label}</span>
                {task.assignee_name && (
                  <span style={{ fontSize: 11, color: C.slate500 }}>👤 {task.assignee_name}</span>
                )}
                {task.deadline && (
                  <span style={{ fontSize: 11, color: C.slate500 }}>📅 {task.deadline}</span>
                )}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Edit Title */}
              <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                autoFocus
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 8,
                  border: `1px solid ${C.slate200}`, fontSize: 14,
                  fontFamily: "'Heebo',sans-serif", color: C.slate900,
                  outline: 'none', direction: 'rtl', boxSizing: 'border-box',
                }}
                onFocus={e => e.currentTarget.style.borderColor = C.indigoLight}
                onBlur={e => e.currentTarget.style.borderColor = C.slate200}
              />

              {/* Edit Category */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.slate500, marginBottom: 4 }}>קטגוריה</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {Object.keys(CATEGORY_COLORS).map(c => (
                    <button key={c} onClick={(e) => { e.stopPropagation(); setEditCategory(c) }} style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 16,
                      border: editCategory === c ? `2px solid ${getCategoryStyle(c).color}` : `1px solid ${C.slate200}`,
                      backgroundColor: editCategory === c ? getCategoryStyle(c).bg : 'transparent',
                      color: getCategoryStyle(c).color, cursor: 'pointer',
                      fontFamily: "'Heebo',sans-serif",
                    }}>{c}</button>
                  ))}
                </div>
              </div>

              {/* Edit Priority */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.slate500, marginBottom: 4 }}>עדיפות</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                    <button key={k} onClick={(e) => { e.stopPropagation(); setEditPriority(k) }} style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 16,
                      border: editPriority === k ? `2px solid ${v.color}` : `1px solid ${C.slate200}`,
                      backgroundColor: editPriority === k ? v.color + '18' : 'transparent',
                      color: v.color, cursor: 'pointer', fontFamily: "'Heebo',sans-serif",
                    }}>{v.label}</button>
                  ))}
                </div>
              </div>

              {/* Edit Assignee + Deadline */}
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.slate500, marginBottom: 4 }}>👤 אחראי</div>
                  <input value={editAssignee} onChange={e => setEditAssignee(e.target.value)}
                    placeholder="שם..."
                    onClick={e => e.stopPropagation()}
                    style={{
                      width: '100%', padding: '6px 10px', borderRadius: 8,
                      border: `1px solid ${C.slate200}`, fontSize: 12,
                      fontFamily: "'Heebo',sans-serif", outline: 'none',
                      direction: 'rtl', boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.slate500, marginBottom: 4 }}>📅 דדליין</div>
                  <input type="date" value={editDeadline} onChange={e => setEditDeadline(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    style={{
                      width: '100%', padding: '6px 10px', borderRadius: 8,
                      border: `1px solid ${C.slate200}`, fontSize: 12,
                      fontFamily: "'Heebo',sans-serif", outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.slate500, marginBottom: 4 }}>📝 הערות</div>
                <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  placeholder="הערות נוספות..."
                  rows={2}
                  style={{
                    width: '100%', padding: '6px 10px', borderRadius: 8,
                    border: `1px solid ${C.slate200}`, fontSize: 12,
                    fontFamily: "'Heebo',sans-serif", outline: 'none',
                    direction: 'rtl', resize: 'vertical', boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Save / Cancel */}
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-start' }}>
                <button onClick={(e) => { e.stopPropagation(); handleSave() }} style={{
                  padding: '6px 20px', borderRadius: 8, border: 'none',
                  background: `linear-gradient(135deg, ${C.indigo}, ${C.indigoLight})`,
                  color: '#fff', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', fontFamily: "'Heebo',sans-serif",
                }}>✓ שמור</button>
                <button onClick={(e) => { e.stopPropagation(); setEditing(false) }} style={{
                  padding: '6px 14px', borderRadius: 8,
                  border: `1px solid ${C.slate200}`, backgroundColor: 'transparent',
                  color: C.slate400, fontSize: 12, cursor: 'pointer',
                  fontFamily: "'Heebo',sans-serif",
                }}>ביטול</button>
              </div>
            </div>
          )}
        </div>

        {/* Priority dot */}
        {!editing && (
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            backgroundColor: pri.color, flexShrink: 0, marginTop: 6,
          }} />
        )}
      </div>

      {/* Expanded area */}
      {expanded && !editing && (
        <div style={{
          padding: '0 14px 14px', borderTop: `1px solid ${C.slate100}`,
          paddingTop: 12, animation: 'panelIn .2s ease',
        }}>
          {/* Notes display */}
          {task.notes && (
            <div style={{
              fontSize: 12, color: C.slate500, marginBottom: 10,
              padding: '8px 10px', backgroundColor: C.slate50, borderRadius: 8,
              lineHeight: 1.5,
            }}>📝 {task.notes}</div>
          )}

          {/* Status buttons */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <button key={key} onClick={() => onUpdateStatus(task.id, key as ChatTask['status'])} style={{
                fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 8,
                border: task.status === key ? `2px solid ${cfg.color}` : `1px solid ${C.slate200}`,
                backgroundColor: task.status === key ? cfg.bg : 'transparent',
                color: cfg.color, cursor: 'pointer', fontFamily: "'Heebo',sans-serif",
              }}>{cfg.icon} {cfg.label}</button>
            ))}
          </div>

          {/* Edit + Delete */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => setEditing(true)} style={{
              fontSize: 12, color: C.indigo, backgroundColor: 'transparent',
              border: 'none', cursor: 'pointer', fontFamily: "'Heebo',sans-serif",
              fontWeight: 600, padding: '4px 0',
            }}>✏️ ערוך</button>
            <button onClick={() => onDelete(task.id)} style={{
              fontSize: 12, color: C.red, backgroundColor: 'transparent',
              border: 'none', cursor: 'pointer', fontFamily: "'Heebo',sans-serif",
              fontWeight: 600, padding: '4px 0',
            }}>🗑️ מחק</button>
          </div>
        </div>
      )}
    </div>
  )
}


// ███████████████████████████████████████
// 📌 DECISIONS TIMELINE PANEL
// ███████████████████████████████████████

interface DecisionTimelineProps {
  decisions: ChatDecision[]
  profiles: Record<string, { id: string; full_name: string | null }>
  onClose: () => void
}

export function DecisionTimelinePanel({ decisions, profiles, onClose }: DecisionTimelineProps) {
  const getName = (id: string) => profiles[id]?.full_name || 'משתמש'

  return (
    <PanelShell title="ציר החלטות" subtitle={`${decisions.length} החלטות מתועדות`} icon="📌" onClose={onClose}>
      {decisions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: C.slate400 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📌</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.slate700, marginBottom: 4 }}>
            אין החלטות עדיין
          </div>
          <div style={{ fontSize: 13 }}>
            ה-AI יתעד החלטות אוטומטית מתוך השיחה
          </div>
        </div>
      ) : (
        <div style={{ position: 'relative', paddingRight: 20 }}>
          {/* Vertical line */}
          <div style={{
            position: 'absolute', right: 7, top: 10, bottom: 10,
            width: 2, backgroundColor: C.indigoPale, borderRadius: 2,
          }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {decisions.map((d, i) => (
              <div key={d.id} style={{
                position: 'relative',
                animation: `panelIn .3s ease ${i * 0.05}s both`,
              }}>
                {/* Timeline dot */}
                <div style={{
                  position: 'absolute', right: -14, top: 16,
                  width: 14, height: 14, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${C.indigo}, ${C.indigoLight})`,
                  border: `3px solid ${C.indigoPale}`,
                  boxShadow: `0 0 0 2px ${C.white}`,
                }} />

                <div style={{
                  padding: '14px 16px', borderRadius: 12,
                  backgroundColor: C.white, border: `1px solid ${C.slate200}`,
                }}>
                  <div style={{
                    fontSize: 11.5, color: C.slate400, marginBottom: 6,
                    display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500,
                  }}>
                    <span>📅 {new Date(d.created_at).toLocaleDateString('he-IL')}</span>
                    <span>•</span>
                    <span>{new Date(d.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
                    {d.participants.length > 0 && (
                      <>
                        <span>•</span>
                        <span>👥 {d.participants.join(', ')}</span>
                      </>
                    )}
                  </div>
                  <div style={{
                    fontSize: 14.5, color: C.slate900, fontWeight: 600,
                    lineHeight: 1.55, fontFamily: "'Heebo',sans-serif",
                  }}>{d.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </PanelShell>
  )
}


// ███████████████████████████████████████
// 🔍 SEARCH PANEL
// ███████████████████████████████████████

interface SearchPanelProps {
  onSearch: (query: string) => Promise<any[]>
  profiles: Record<string, { id: string; full_name: string | null }>
  onClose: () => void
}

export function SearchPanel({ onSearch, profiles, onClose }: SearchPanelProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<any>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSearch = (q: string) => {
    setQuery(q)
    clearTimeout(timerRef.current)
    if (q.length < 2) { setResults([]); return }
    timerRef.current = setTimeout(async () => {
      setSearching(true)
      const res = await onSearch(q)
      setResults(res)
      setSearching(false)
    }, 400)
  }

  const getName = (userId: string) => profiles[userId]?.full_name || 'משתמש'

  return (
    <PanelShell title="חיפוש חכם" subtitle="חפש בכל ההיסטוריה" icon="🔍" onClose={onClose}>
      {/* Search input */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px', backgroundColor: C.white,
        borderRadius: 12, border: `2px solid ${C.slate200}`,
        marginBottom: 16, transition: 'border-color .2s',
      }}>
        <span style={{ fontSize: 18, color: C.slate400 }}>🔍</span>
        <input ref={inputRef} value={query} onChange={e => handleSearch(e.target.value)}
          placeholder="חפש נושא, החלטה, אדם..."
          style={{
            flex: 1, border: 'none', outline: 'none', backgroundColor: 'transparent',
            fontSize: 15, fontFamily: "'Heebo',sans-serif",
            color: C.slate900, direction: 'rtl',
          }}
        />
        {searching && <span style={{ fontSize: 14, animation: 'spin .8s linear infinite' }}>⏳</span>}
      </div>

      {/* Results */}
      {query.length >= 2 && !searching && (
        <div style={{
          fontSize: 12, color: C.slate400, marginBottom: 10, fontWeight: 600,
        }}>
          ✦ {results.length} תוצאות עבור "{query}"
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {results.map((r, i) => (
          <div key={r.id} style={{
            padding: '12px 14px', borderRadius: 11, backgroundColor: C.white,
            border: `1px solid ${C.slate200}`,
            animation: `panelIn .2s ease ${i * 0.04}s both`,
            transition: 'box-shadow .2s',
          }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.05)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            <div style={{
              fontSize: 11.5, color: C.slate400, marginBottom: 4,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span>📅 {new Date(r.created_at).toLocaleDateString('he-IL')}</span>
              <span>•</span>
              <span>{getName(r.user_id)}</span>
            </div>
            <div style={{
              fontSize: 14, color: C.slate900, lineHeight: 1.55,
              fontFamily: "'Heebo',sans-serif",
            }}>
              {highlightText(r.content, query)}
            </div>
          </div>
        ))}
      </div>

      {query.length >= 2 && !searching && results.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: C.slate400 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
          <div style={{ fontSize: 14 }}>לא נמצאו תוצאות</div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </PanelShell>
  )
}

function highlightText(text: string, query: string) {
  if (!query || query.length < 2) return text
  const parts = text.split(new RegExp(`(${query})`, 'gi'))
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} style={{
            backgroundColor: C.goldPale, color: C.gold,
            borderRadius: 3, padding: '0 2px', fontWeight: 700,
          }}>{part}</mark>
        ) : part
      )}
    </span>
  )
}
