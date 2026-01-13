/**
 * ===========================================
 * Mobile Files Panel Component
 * פאנל קבצים למובייל עם ניווט שלב-אחר-שלב
 * ===========================================
 */

import { useState } from 'react'
import { modernStyles, SORT_MODES } from '../styles/modernStyles'
import { 
  BUILDINGS, 
  FLOORS, 
  STAGES, 
  TRADES,
  getFileIcon as getFileIconHelper,
} from '@/lib/constants'

interface SortMode {
  id: string
  name: string
  icon: string
  order: string[]
}

const getFileIcon = (fileType: string) => getFileIconHelper(fileType)

const getListByType = (type: string) => {
  if (type === 'building') return BUILDINGS
  if (type === 'floor') return FLOORS
  if (type === 'stage') return STAGES
  if (type === 'trade') return TRADES
  return []
}

interface MobileFilesPanelProps {
  projectFiles: any[]
  onClose: () => void
  onUpload: () => void
  onPreview: (file: any) => void
  onDelete: (file: any) => void
}

export default function MobileFilesPanel({ 
  projectFiles, 
  onClose, 
  onUpload, 
  onPreview, 
  onDelete 
}: MobileFilesPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortMode, setSortMode] = useState('floor')
  const [currentLevel, setCurrentLevel] = useState(0)
  const [selections, setSelections] = useState<string[]>([])
  
  const getColumnOrder = () => (SORT_MODES as SortMode[]).find((m: SortMode) => m.id === sortMode)?.order || ['floor', 'stage', 'trade', 'building']
  const columnOrder = getColumnOrder()

  const getFilteredFiles = () => {
    let filtered = [...projectFiles]
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(f => f.file_name?.toLowerCase().includes(q))
    }
    selections.forEach((sel, idx) => {
      if (sel) filtered = filtered.filter(f => f[columnOrder[idx]] === sel)
    })
    return filtered
  }

  const getOptionsForLevel = (level: number) => {
    const type = columnOrder[level]
    const list = getListByType(type)
    let filtered = [...projectFiles]
    for (let i = 0; i < level; i++) {
      if (selections[i]) filtered = filtered.filter(f => f[columnOrder[i]] === selections[i])
    }
    return list.map(item => ({
      ...item,
      count: filtered.filter(f => f[type] === item.id).length
    })).filter(item => item.count > 0)
  }

  const handleSelect = (level: number, value: string) => {
    const newSelections = [...selections]
    newSelections[level] = value
    for (let i = level + 1; i < 4; i++) newSelections[i] = ''
    setSelections(newSelections)
    setCurrentLevel(level + 1)
  }

  const goBack = () => {
    if (currentLevel > 0) {
      const newSelections = [...selections]
      newSelections[currentLevel - 1] = ''
      setSelections(newSelections)
      setCurrentLevel(currentLevel - 1)
    }
  }

  const filteredFiles = getFilteredFiles()
  const currentOptions = currentLevel < 4 ? getOptionsForLevel(currentLevel) : []
  const showFiles = currentLevel === 4 || (currentLevel < 4 && currentOptions.length === 0)

  const breadcrumb = selections.filter(Boolean).map((sel, idx) => {
    const type = columnOrder[idx]
    const list = getListByType(type)
    const item = list.find(i => i.id === sel)
    return item ? `${item.icon} ${item.name}` : ''
  }).filter(Boolean).join(' ← ')

  return (
    <div style={{
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0,
      backgroundColor: '#f8fafc', 
      zIndex: 1000, 
      display: 'flex', 
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
        color: 'white', 
        padding: '14px 16px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px',
      }}>
        <button 
          onClick={currentLevel > 0 ? goBack : onClose} 
          style={{
            background: 'none', 
            border: 'none', 
            color: 'white', 
            fontSize: '24px', 
            cursor: 'pointer', 
            padding: '4px',
          }}
        >
          {currentLevel > 0 ? '→' : '←'}
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '600', fontSize: '16px' }}>📁 קבצים</div>
          {breadcrumb && (
            <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '2px' }}>{breadcrumb}</div>
          )}
        </div>
        <span style={{ 
          fontSize: '12px', 
          backgroundColor: 'rgba(255,255,255,0.2)', 
          padding: '4px 10px', 
          borderRadius: '12px' 
        }}>
          {filteredFiles.length}
        </span>
      </div>

      {/* Search */}
      <div style={{ 
        padding: '12px 16px', 
        backgroundColor: 'white', 
        borderBottom: '1px solid #e5e7eb' 
      }}>
        <input 
          type="text" 
          placeholder="🔍 חיפוש קבצים..." 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ 
            ...modernStyles.input,
            backgroundColor: '#f8fafc',
          }} 
        />
      </div>

      {/* Sort Mode Tabs - only show at level 0 */}
      {currentLevel === 0 && (
        <div style={{ 
          padding: '12px 16px', 
          backgroundColor: 'white', 
          borderBottom: '1px solid #e5e7eb', 
          display: 'flex', 
          gap: '8px',
          overflowX: 'auto',
        }}>
          {SORT_MODES.map(mode => (
            <button 
              key={mode.id} 
              onClick={() => { setSortMode(mode.id); setSelections([]) }}
              style={{
                padding: '10px 16px',
                backgroundColor: sortMode === mode.id ? '#6366F1' : '#f1f5f9',
                color: sortMode === mode.id ? 'white' : '#475569',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '13px',
                fontFamily: 'Heebo, sans-serif',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              {mode.icon} {mode.name}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
        {showFiles ? (
          // Show files
          filteredFiles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
              <p style={{ fontSize: '48px', marginBottom: '12px' }}>📂</p>
              <p style={{ fontSize: '15px', fontWeight: '500' }}>אין קבצים</p>
            </div>
          ) : (
            filteredFiles.map(file => {
              const trade = TRADES.find(t => t.id === file.trade)
              const floor = FLOORS.find(f => f.id === file.floor)
              const stage = STAGES.find(s => s.id === file.stage)
              return (
                <div 
                  key={file.id} 
                  style={{ 
                    backgroundColor: 'white', 
                    borderRadius: '12px', 
                    padding: '14px', 
                    marginBottom: '10px', 
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    border: '1px solid #e5e7eb',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '32px' }}>{getFileIcon(file.file_type)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ 
                        margin: 0, 
                        fontWeight: '500', 
                        fontSize: '14px', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap',
                        color: '#1e293b',
                      }}>
                        {file.file_name}
                      </p>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                        {trade && (
                          <span style={{ 
                            ...modernStyles.badge, 
                            backgroundColor: '#eff6ff', 
                            color: '#6366F1' 
                          }}>
                            {trade.icon} {trade.name}
                          </span>
                        )}
                        {floor && (
                          <span style={{ 
                            ...modernStyles.badge, 
                            backgroundColor: '#dcfce7', 
                            color: '#16a34a' 
                          }}>
                            {floor.icon} {floor.name}
                          </span>
                        )}
                        {stage && (
                          <span style={{ 
                            ...modernStyles.badge, 
                            backgroundColor: '#fef3c7', 
                            color: '#d97706' 
                          }}>
                            {stage.icon} {stage.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                    <button 
                      onClick={() => onPreview(file)} 
                      style={{ 
                        ...modernStyles.buttonPrimary, 
                        flex: 1, 
                        justifyContent: 'center',
                        padding: '10px',
                      }}
                    >
                      👁️ צפה
                    </button>
                    <button 
                      onClick={() => window.open(file.file_url, '_blank')} 
                      style={{ 
                        ...modernStyles.buttonPrimary, 
                        backgroundColor: '#10b981',
                        padding: '10px 14px',
                      }}
                    >
                      ⬇️
                    </button>
                    <button 
                      onClick={() => onDelete(file)} 
                      style={{ 
                        ...modernStyles.buttonSecondary, 
                        backgroundColor: '#fef2f2', 
                        color: '#ef4444', 
                        borderColor: '#fecaca',
                        padding: '10px 14px',
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              )
            })
          )
        ) : (
          // Show navigation options
          currentOptions.map(option => (
            <button 
              key={option.id} 
              onClick={() => handleSelect(currentLevel, option.id)}
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                transition: 'all 0.15s ease',
                fontFamily: 'Heebo, sans-serif',
              }}
            >
              <span style={{ fontSize: '26px' }}>{option.icon}</span>
              <span style={{ 
                flex: 1, 
                fontSize: '15px', 
                fontWeight: '500', 
                textAlign: 'right', 
                color: '#1e293b' 
              }}>
                {option.name}
              </span>
              <span style={{ 
                backgroundColor: '#eff6ff', 
                color: '#6366F1', 
                padding: '4px 12px', 
                borderRadius: '8px', 
                fontSize: '13px', 
                fontWeight: '600' 
              }}>
                {option.count}
              </span>
              <span style={{ color: '#94a3b8', fontSize: '18px' }}>←</span>
            </button>
          ))
        )}
      </div>

      {/* Upload Button */}
      <div style={{ 
        padding: '12px 16px', 
        backgroundColor: 'white', 
        borderTop: '1px solid #e5e7eb' 
      }}>
        <button 
          onClick={onUpload} 
          style={{ 
            ...modernStyles.buttonPrimary, 
            width: '100%', 
            padding: '14px', 
            backgroundColor: '#10b981',
            fontSize: '15px',
            justifyContent: 'center',
          }}
        >
          ➕ העלה קובץ
        </button>
      </div>
    </div>
  )
}
