/**
 * ===========================================
 * Files Panel Component (Desktop)
 * פאנל קבצים לדסקטופ עם Miller Columns
 * ===========================================
 */

import { useState } from 'react'
import { modernStyles, SORT_MODES, COLUMN_TITLES } from '../styles/modernStyles'
import MillerColumn from './MillerColumn'
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
const canPreview = (fileType: string) => ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileType?.toLowerCase())

const getListByType = (type: string) => {
  if (type === 'building') return BUILDINGS
  if (type === 'floor') return FLOORS
  if (type === 'stage') return STAGES
  if (type === 'trade') return TRADES
  return []
}

interface FilesPanelProps {
  projectFiles: any[]
  onClose: () => void
  onUpload: () => void
  onPreview: (file: any) => void
  onDelete: (file: any) => void
  onFileSelect?: (file: any) => void
}

export default function FilesPanel({ 
  projectFiles, 
  onClose, 
  onUpload, 
  onPreview, 
  onDelete,
  onFileSelect,
}: FilesPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortMode, setSortMode] = useState('floor')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [selections, setSelections] = useState<{ [key: string]: string | null }>({ 
    building: null, 
    floor: null, 
    stage: null, 
    trade: null 
  })
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<any>(null)

  // Get column order based on sort mode
  const getColumnOrder = () => (SORT_MODES as SortMode[]).find((m: SortMode) => m.id === sortMode)?.order
 || ['floor', 'stage', 'trade', 'building']
  const columnOrder = getColumnOrder()

  // Handle column selection
  const handleColumnSelect = (columnType: string, value: string) => {
    const order = getColumnOrder()
    const columnIndex = order.indexOf(columnType)
    const newSelections = { ...selections }
    
    // Toggle selection if clicking same item
    if (newSelections[columnType] === value) {
      newSelections[columnType] = null
    } else {
      newSelections[columnType] = value
    }
    
    // Clear subsequent columns
    for (let i = columnIndex + 1; i < order.length; i++) {
      newSelections[order[i]] = null
    }
    
    setSelections(newSelections)
    setSelectedFile(null)
  }

  // Get items for a specific column
  const getColumnItems = (columnType: string, columnIndex: number) => {
    const order = getColumnOrder()
    const list = getListByType(columnType)
    let filteredFiles = [...projectFiles]
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filteredFiles = filteredFiles.filter(f => 
        f.file_name?.toLowerCase().includes(query) || 
        f.description?.toLowerCase().includes(query)
      )
    }
    
    // Apply previous column filters
    for (let i = 0; i < columnIndex; i++) {
      const prevType = order[i]
      const prevValue = selections[prevType]
      if (prevValue) {
        filteredFiles = filteredFiles.filter(f => f[prevType] === prevValue)
      }
    }
    
    return list.map(item => ({ 
      ...item, 
      count: filteredFiles.filter(f => f[columnType] === item.id).length 
    })).filter(item => item.count > 0 || !selections[order[0]])
  }

  // Get filtered files based on all selections
  const getFilteredFiles = () => {
    let filtered = [...projectFiles]
    
    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(f => 
        f.file_name?.toLowerCase().includes(query) || 
        f.description?.toLowerCase().includes(query)
      )
    }
    
    // Apply column filters
    if (selections.building) filtered = filtered.filter(f => f.building === selections.building)
    if (selections.floor) filtered = filtered.filter(f => f.floor === selections.floor)
    if (selections.stage) filtered = filtered.filter(f => f.stage === selections.stage)
    if (selections.trade) filtered = filtered.filter(f => f.trade === selections.trade)
    
    return filtered
  }

  // Check if column should be collapsed
  const isColumnCollapsed = (columnType: string) => {
    return selections[columnType] !== null && hoveredColumn !== columnType
  }

  // Handle file click
  const handleFileClick = (file: any) => {
    setSelectedFile(file)
    if (onFileSelect) {
      onFileSelect(file)
    }
  }

  // Clear all filters
  const clearFilters = () => {
    setSelections({ building: null, floor: null, stage: null, trade: null })
    setSelectedFile(null)
  }

  const filteredFiles = getFilteredFiles()
  const hasActiveFilters = Object.values(selections).some(v => v !== null)

  return (
    <div style={{ 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'white',
    }}>
      {/* Header */}
      <div style={modernStyles.panelHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#1e293b' }}>
            📁 קבצים ותכניות
          </h3>
          <span style={{ 
            ...modernStyles.badge, 
            backgroundColor: '#eff6ff', 
            color: '#6366F1' 
          }}>
            {filteredFiles.length}
          </span>
        </div>
        <button onClick={onClose} style={modernStyles.buttonGhost}>×</button>
      </div>
      
      {/* Search & Sort */}
      <div style={{ 
        padding: '12px 16px', 
        borderBottom: '1px solid #e5e7eb', 
        backgroundColor: '#fafbfc' 
      }}>
        <input 
          type="text" 
          placeholder="🔍 חיפוש קבצים..." 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)} 
          style={{ ...modernStyles.input, marginBottom: '12px' }} 
        />
        
        {/* Sort Mode Selector */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: '#64748b' }}>מיין לפי:</span>
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowSortMenu(!showSortMenu)}
              style={{
                ...modernStyles.chip,
                backgroundColor: '#6366F1',
                color: 'white',
                padding: '6px 12px',
              }}
            >
              {SORT_MODES.find(m => m.id === sortMode)?.icon} {SORT_MODES.find(m => m.id === sortMode)?.name} ▼
            </button>
            
            {showSortMenu && (
              <>
                <div 
                  onClick={() => setShowSortMenu(false)} 
                  style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 5 }} 
                />
                <div style={{
                  position: 'absolute', 
                  top: '100%', 
                  right: 0, 
                  marginTop: '4px',
                  backgroundColor: 'white', 
                  borderRadius: '8px', 
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  overflow: 'hidden', 
                  zIndex: 10, 
                  minWidth: '140px',
                }}>
                  {SORT_MODES.map(mode => (
                    <button 
                      key={mode.id} 
                      onClick={() => { 
                        setSortMode(mode.id)
                        setSelections({ building: null, floor: null, stage: null, trade: null })
                        setShowSortMenu(false)
                      }} 
                      style={{ 
                        width: '100%', 
                        padding: '10px 14px', 
                        border: 'none',
                        backgroundColor: sortMode === mode.id ? '#eff6ff' : 'transparent',
                        color: sortMode === mode.id ? '#6366F1' : '#374151',
                        cursor: 'pointer', 
                        textAlign: 'right', 
                        fontSize: '13px',
                        fontWeight: sortMode === mode.id ? '600' : '400',
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        fontFamily: 'Heebo, sans-serif',
                      }}
                    >
                      <span>{mode.icon}</span>
                      <span>{mode.name}</span>
                      {sortMode === mode.id && <span style={{ marginRight: 'auto' }}>✓</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          
          {/* Clear filters button */}
          {hasActiveFilters && (
            <button 
              onClick={clearFilters}
              style={{
                ...modernStyles.chip,
                backgroundColor: '#fef2f2',
                color: '#ef4444',
              }}
            >
              ✕ נקה סינון
            </button>
          )}
        </div>
      </div>

      {/* Miller Columns + Files List */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Miller Columns */}
        {columnOrder.map((colType, index) => {
          const items = getColumnItems(colType, index)
          const columnInfo = COLUMN_TITLES[colType]
          const prevColType = index > 0 ? columnOrder[index - 1] : null
          const showColumn = index === 0 || selections[prevColType!] !== null
          
          if (!showColumn) return null
          
          return (
            <MillerColumn 
              key={colType} 
              title={columnInfo.title}
              icon={columnInfo.icon}
              items={items} 
              selectedId={selections[colType]} 
              onSelect={(id) => handleColumnSelect(colType, id)} 
              isCollapsed={isColumnCollapsed(colType)} 
              onHover={(hovered) => setHoveredColumn(hovered ? colType : null)} 
            />
          )
        })}
        
        {/* Files List */}
        <div style={{ 
          flex: 1, 
          overflow: 'auto', 
          padding: '12px', 
          backgroundColor: '#fff', 
          borderLeft: '1px solid #e5e7eb' 
        }}>
          {filteredFiles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              <p style={{ fontSize: '36px', marginBottom: '12px' }}>📂</p>
              <p style={{ fontSize: '14px', fontWeight: '500' }}>אין קבצים</p>
              {hasActiveFilters && (
                <button 
                  onClick={clearFilters}
                  style={{
                    ...modernStyles.buttonSecondary,
                    marginTop: '12px',
                  }}
                >
                  נקה סינון
                </button>
              )}
            </div>
          ) : (
            filteredFiles.map(file => {
              const isSelected = selectedFile?.id === file.id
              const trade = TRADES.find(t => t.id === file.trade)
              const floor = FLOORS.find(f => f.id === file.floor)
              const stage = STAGES.find(s => s.id === file.stage)
              
              return (
                <div 
                  key={file.id} 
                  onClick={() => handleFileClick(file)} 
                  style={{ 
                    ...modernStyles.card, 
                    padding: '14px', 
                    marginBottom: '10px', 
                    cursor: 'pointer', 
                    border: isSelected ? '2px solid #6366F1' : '1px solid #e5e7eb', 
                    backgroundColor: isSelected ? '#eff6ff' : 'white',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '30px' }}>{getFileIcon(file.file_type)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ 
                        margin: 0, 
                        fontWeight: '500', 
                        fontSize: '13px', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap', 
                        color: '#1e293b' 
                      }}>
                        {file.file_name}
                      </p>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
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
                  
                  {/* Action buttons - show when selected */}
                  {isSelected && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation()
                          canPreview(file.file_type) ? onPreview(file) : window.open(file.file_url, '_blank') 
                        }} 
                        style={{ 
                          ...modernStyles.buttonPrimary, 
                          flex: 1, 
                          padding: '10px', 
                          fontSize: '13px',
                          justifyContent: 'center',
                        }}
                      >
                        👁️ צפה
                      </button>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation()
                          window.open(file.file_url, '_blank') 
                        }} 
                        style={{ 
                          ...modernStyles.buttonPrimary, 
                          backgroundColor: '#10b981', 
                          padding: '10px 14px', 
                          fontSize: '13px' 
                        }}
                      >
                        ⬇️
                      </button>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation()
                          onDelete(file) 
                        }} 
                        style={{ 
                          ...modernStyles.buttonSecondary, 
                          backgroundColor: '#fef2f2', 
                          color: '#ef4444', 
                          borderColor: '#fecaca', 
                          padding: '10px 14px', 
                          fontSize: '13px' 
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Upload Button */}
      <div style={{ padding: '14px 16px', borderTop: '1px solid #e5e7eb' }}>
        <input type="file" id="projectFileInput" onChange={() => onUpload()} style={{ display: 'none' }} />
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
