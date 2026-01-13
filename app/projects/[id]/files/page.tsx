'use client'

/**
 * ===========================================
 * דף קבצים - Projekta
 * ===========================================
 */

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Toast from '../../../Toast'

// ===========================================
// HOOKS
// ===========================================

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  
  return isMobile
}

// ===========================================
// CONSTANTS
// ===========================================

const BUILDINGS = [
  { id: 'building_1', name: 'בניין 1', icon: '🏢' },
  { id: 'building_2', name: 'בניין 2', icon: '🏢' },
  { id: 'building_3', name: 'בניין 3', icon: '🏢' },
  { id: 'building_4', name: 'בניין 4', icon: '🏢' },
  { id: 'building_5', name: 'בניין 5', icon: '🏢' },
  { id: 'general', name: 'כללי', icon: '📋' },
]

const TRADES = [
  { id: 'electrical', name: 'חשמל', icon: '⚡' },
  { id: 'plumbing', name: 'אינסטלציה', icon: '🔧' },
  { id: 'engineering', name: 'הנדסה', icon: '🏗️' },
  { id: 'construction', name: 'בנייה', icon: '🧱' },
  { id: 'ac', name: 'מיזוג', icon: '❄️' },
  { id: 'elevators', name: 'מעליות', icon: '🛗' },
  { id: 'safety', name: 'בטיחות', icon: '🦺' },
  { id: 'architecture', name: 'אדריכלות', icon: '🏛️' },
  { id: 'general', name: 'כללי', icon: '📄' },
]

const FLOORS = [
  { id: 'basement', name: 'מרתף/חניון', icon: '🅿️' },
  { id: 'ground', name: 'קומת קרקע', icon: '🏠' },
  { id: 'floor_1', name: 'קומה א׳', icon: '1️⃣' },
  { id: 'floor_2', name: 'קומה ב׳', icon: '2️⃣' },
  { id: 'floor_3', name: 'קומה ג׳', icon: '3️⃣' },
  { id: 'floor_4', name: 'קומה ד׳', icon: '4️⃣' },
  { id: 'floor_5', name: 'קומה ה׳', icon: '5️⃣' },
  { id: 'roof', name: 'גג', icon: '🔝' },
  { id: 'general', name: 'כללי', icon: '📋' },
]

const STAGES = [
  { id: 'planning', name: 'תכנון', icon: '📋' },
  { id: 'execution', name: 'ביצוע', icon: '🔨' },
  { id: 'general', name: 'כללי', icon: '📁' },
]

const FILE_ICONS: { [key: string]: string } = {
  pdf: '📕', dwg: '📐', dxf: '📐', jpg: '🖼️', jpeg: '🖼️', png: '🖼️',
  xlsx: '📊', xls: '📊', doc: '📝', docx: '📝', default: '📄',
}

const SORT_MODES = [
  { id: 'building', name: 'בניין', icon: '🏢', order: ['building', 'floor'] },
  { id: 'floor', name: 'קומה', icon: '🏢', order: ['floor', 'stage'] },
  { id: 'stage', name: 'שלב', icon: '📋', order: ['stage', 'trade'] },
  { id: 'trade', name: 'מקצוע', icon: '🔧', order: ['trade', 'building'] },
]

// ===========================================
// STYLES
// ===========================================

const styles = {
  card: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)',
    border: '1px solid rgba(0,0,0,0.06)',
    transition: 'box-shadow 0.2s ease, transform 0.2s ease',
  },
  buttonPrimary: {
    padding: '10px 20px',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px',
    fontFamily: 'Heebo, sans-serif',
    transition: 'all 0.15s ease',
  },
  buttonSecondary: {
    padding: '10px 20px',
    backgroundColor: '#f8fafc',
    color: '#374151',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px',
    fontFamily: 'Heebo, sans-serif',
    transition: 'all 0.15s ease',
  },
  chip: {
    padding: '8px 16px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: '1px solid transparent',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '13px',
    fontFamily: 'Heebo, sans-serif',
    transition: 'all 0.15s ease',
  },
  chipActive: {
    backgroundColor: '#2563eb',
    color: 'white',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    border: '1.5px solid #e5e7eb',
    borderRadius: '12px',
    fontSize: '15px',
    fontFamily: 'Heebo, sans-serif',
    outline: 'none',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    boxSizing: 'border-box' as const,
  },
  badge: {
    padding: '4px 10px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '500',
    fontFamily: 'Heebo, sans-serif',
  },
}

// ===========================================
// HELPERS
// ===========================================

const getFileIcon = (fileType: string) => FILE_ICONS[fileType?.toLowerCase()] || FILE_ICONS.default

const formatFileSize = (bytes: number) => {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const canPreview = (fileType: string) => ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileType?.toLowerCase())

const getListByType = (type: string) => {
  if (type === 'building') return BUILDINGS
  if (type === 'floor') return FLOORS
  if (type === 'stage') return STAGES
  if (type === 'trade') return TRADES
  return []
}

// ===========================================
// SUB COMPONENTS
// ===========================================

interface MillerColumnProps {
  title: string
  items: { id: string; name: string; icon: string; count?: number }[]
  selectedId: string | null
  onSelect: (id: string) => void
  isCollapsed: boolean
  onHover: (hovered: boolean) => void
}

function MillerColumn({ title, items, selectedId, onSelect, isCollapsed, onHover }: MillerColumnProps) {
  const selectedItem = items.find(item => item.id === selectedId)
  
  return (
    <div
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      style={{
        minWidth: isCollapsed ? '56px' : '200px',
        maxWidth: isCollapsed ? '56px' : '200px',
        borderLeft: '1px solid #f1f5f9',
        backgroundColor: '#fafbfc',
        transition: 'all 0.2s ease',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 200px)',
      }}
    >
      <div style={{
        padding: isCollapsed ? '12px 8px' : '12px 16px',
        borderBottom: '1px solid #f1f5f9',
        backgroundColor: '#f8fafc',
        fontSize: '14px',
        fontWeight: '600',
        color: '#64748b',
        textAlign: 'center',
        whiteSpace: 'nowrap',
        fontFamily: 'Heebo, sans-serif',
        letterSpacing: '0.3px',
      }}>
        {isCollapsed ? '☰' : title}
      </div>
      
      <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
        {isCollapsed ? (
          <div style={{ padding: '16px 8px', textAlign: 'center', fontSize: '28px' }}>
            {selectedItem?.icon || '📁'}
          </div>
        ) : (
          items.map(item => (
            <div
              key={item.id}
              onClick={() => onSelect(item.id)}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                backgroundColor: selectedId === item.id ? '#2563eb' : 'transparent',
                color: selectedId === item.id ? 'white' : '#374151',
                borderRadius: '12px',
                marginBottom: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '14px',
                fontFamily: 'Heebo, sans-serif',
                fontWeight: selectedId === item.id ? '600' : '500',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (selectedId !== item.id) e.currentTarget.style.backgroundColor = '#f1f5f9'
              }}
              onMouseLeave={(e) => {
                if (selectedId !== item.id) e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <span style={{ fontSize: '20px' }}>{item.icon}</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
              {item.count !== undefined && item.count > 0 && (
                <span style={{
                  fontSize: '12px', fontWeight: '600',
                  backgroundColor: selectedId === item.id ? 'rgba(255,255,255,0.25)' : '#e0e7ff',
                  color: selectedId === item.id ? 'white' : '#4338ca',
                  padding: '3px 10px', borderRadius: '8px',
                }}>{item.count}</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ===========================================
// MAIN COMPONENT
// ===========================================

export default function FilesPage() {
  const params = useParams()
  const projectId = params.id as string
  const supabase = createClient()
  const isMobile = useIsMobile()

  // Core State
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  
  // Files State
  const [projectFiles, setProjectFiles] = useState<any[]>([])
  const [filesSearchQuery, setFilesSearchQuery] = useState('')
  const [sortMode, setSortMode] = useState<string>('floor')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [selections, setSelections] = useState<{ [key: string]: string | null }>({ building: null, floor: null, stage: null, trade: null })
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<any>(null)
  
  // Upload State
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [fileToUpload, setFileToUpload] = useState<File | null>(null)
  const [fileUploadData, setFileUploadData] = useState({ building: 'general', trade: 'general', floor: 'general', stage: 'planning', unit: '', description: '' })
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Preview State
  const [previewFile, setPreviewFile] = useState<any>(null)

  // ===========================================
  // EFFECTS
  // ===========================================
  
  useEffect(() => {
    const initializePage = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUser(user)
      
      const { data: projectData } = await supabase.from('projects').select('*').eq('id', projectId).single()
      setProject(projectData)
      
      setLoading(false)
      fetchProjectFiles()
    }
    
    initializePage()
  }, [projectId])


  // ===========================================
  // API FUNCTIONS
  // ===========================================
  
  const fetchProjectFiles = async () => {
  const { data } = await supabase.from('project_files').select('*').eq('project_id', projectId).order('created_at', { ascending: false })
  if (data) {
    setProjectFiles(data)
    // Broadcast עדכון לדפים אחרים
    window.postMessage({ type: 'FILES_UPDATED', files: data }, '*')
  }
}

  // ===========================================
  // HANDLERS
  // ===========================================
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) { setFileToUpload(file); setShowFileUpload(true) }
  }

  const uploadProjectFile = async () => {
    if (!fileToUpload || !user) return
    setUploadingFile(true)
    
    try {
      const fileExt = fileToUpload.name.split('.').pop()?.toLowerCase() || ''
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${projectId}/files/${fileName}`
      
      const { error: uploadError } = await supabase.storage.from('project-files').upload(filePath, fileToUpload)
      if (uploadError) throw uploadError
      
      const { data: urlData } = supabase.storage.from('project-files').getPublicUrl(filePath)
      
      await supabase.from('project_files').insert({
        project_id: projectId, 
        user_id: user.id, 
        file_name: fileToUpload.name,
        file_url: urlData.publicUrl, 
        file_size: fileToUpload.size, 
        file_type: fileExt,
        building: fileUploadData.building,
        trade: fileUploadData.trade, 
        floor: fileUploadData.floor, 
        stage: fileUploadData.stage,
        unit: fileUploadData.unit || null, 
        description: fileUploadData.description || null,
      })
      
      setToast({ message: 'הקובץ הועלה בהצלחה!', type: 'success' })
      setShowFileUpload(false)
      setFileToUpload(null)
      setFileUploadData({ building: 'general', trade: 'general', floor: 'general', stage: 'planning', unit: '', description: '' })
      if (fileInputRef.current) fileInputRef.current.value = ''
      fetchProjectFiles()
    } catch (error) {
      setToast({ message: 'שגיאה בהעלאת הקובץ', type: 'error' })
    }
    
    setUploadingFile(false)
  }

  const deleteProjectFile = async (file: any) => {
    if (!confirm(`למחוק את "${file.file_name}"?`)) return
    
    try {
      const filePath = file.file_url.split('/project-files/')[1]
      if (filePath) await supabase.storage.from('project-files').remove([filePath])
      await supabase.from('project_files').delete().eq('id', file.id)
      setToast({ message: 'הקובץ נמחק', type: 'success' })
      if (selectedFile?.id === file.id) setSelectedFile(null)
      fetchProjectFiles()
    } catch (error) {
      setToast({ message: 'שגיאה במחיקה', type: 'error' })
    }
  }

  const getColumnOrder = () => SORT_MODES.find(m => m.id === sortMode)?.order || ['floor', 'stage', 'trade']

  const handleColumnSelect = (columnType: string, value: string) => {
    const order = getColumnOrder()
    const columnIndex = order.indexOf(columnType)
    const newSelections = { ...selections }
    newSelections[columnType] = value
    for (let i = columnIndex + 1; i < order.length; i++) newSelections[order[i]] = null
    setSelections(newSelections)
    setSelectedFile(null)
  }

  const getColumnItems = (columnType: string, columnIndex: number) => {
    const order = getColumnOrder()
    const list = getListByType(columnType)
    let filteredFiles = [...projectFiles]
    for (let i = 0; i < columnIndex; i++) {
      const prevType = order[i]
      const prevValue = selections[prevType]
      if (prevValue) filteredFiles = filteredFiles.filter(f => f[prevType] === prevValue)
    }
    return list.map(item => ({ ...item, count: filteredFiles.filter(f => f[columnType] === item.id).length })).filter(item => item.count > 0 || !selections[order[0]])
  }

  const getFilteredFiles = () => {
    let filtered = [...projectFiles]
    if (filesSearchQuery) {
      const query = filesSearchQuery.toLowerCase()
      filtered = filtered.filter(f => f.file_name?.toLowerCase().includes(query) || f.description?.toLowerCase().includes(query))
    }
    if (selections.building) filtered = filtered.filter(f => f.building === selections.building)
    if (selections.floor) filtered = filtered.filter(f => f.floor === selections.floor)
    if (selections.stage) filtered = filtered.filter(f => f.stage === selections.stage)
    if (selections.trade) filtered = filtered.filter(f => f.trade === selections.trade)
    return filtered
  }

  const isColumnCollapsed = (columnType: string) => selections[columnType] !== null && hoveredColumn !== columnType
  
  const handleFileClick = (file: any) => setSelectedFile(file)

  // ===========================================
  // COMPUTED VALUES
  // ===========================================
  
  const columnOrder = getColumnOrder()
  const filteredFiles = getFilteredFiles()

  // ===========================================
  // LOADING
  // ===========================================
  
  if (loading) {
    return <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'Heebo, sans-serif' }}>טוען...</div>
  }

  // ===========================================
  // RENDER
  // ===========================================
  
  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700&display=swap');
        * { font-family: 'Heebo', sans-serif; box-sizing: border-box; }
      `}</style>

      <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'Heebo, sans-serif' }}>
        
        {/* Header */}
        <div style={{ 
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          color: 'white', 
          padding: isMobile ? '12px 16px' : '16px 24px',
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '12px',
          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '16px', flex: 1, minWidth: 0 }}>
            <a href={`/projects/${projectId}`} style={{ 
              color: 'white', textDecoration: 'none', fontSize: '20px',
              width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.15)',
            }}>←</a>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ margin: 0, fontSize: isMobile ? '16px' : '20px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                📁 קבצים ותכניות
              </h1>
              {project && (
                <div style={{ fontSize: '12px', opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {project.name}
                </div>
              )}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', opacity: 0.7 }}>
              {filteredFiles.length} קבצים
            </span>
            <button onClick={() => fileInputRef.current?.click()} style={{
              padding: isMobile ? '8px 12px' : '10px 18px', 
              backgroundColor: '#10b981',
              color: 'white', border: 'none', borderRadius: '12px', 
              cursor: 'pointer', fontWeight: '600', fontSize: '14px',
            }}>
              ➕ {!isMobile && 'העלה קובץ'}
            </button>
          </div>
        </div>

        {/* Controls */}
        <div style={{ padding: isMobile ? '16px' : '20px 24px', backgroundColor: 'white', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', gap: isMobile ? '12px' : '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input 
              type="text" 
              placeholder="🔍 חיפוש קבצים..." 
              value={filesSearchQuery} 
              onChange={(e) => setFilesSearchQuery(e.target.value)} 
              style={{ 
                ...styles.input, 
                flex: 1, 
                minWidth: isMobile ? '200px' : '300px',
                marginBottom: 0,
              }} 
            />
            
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowSortMenu(!showSortMenu)} 
                style={{ 
                  ...styles.chip, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  padding: '12px 16px',
                  fontSize: '14px',
                }}
              >
                ☰ מיין: {SORT_MODES.find(m => m.id === sortMode)?.name}
              </button>
              
              {showSortMenu && (
                <>
                  <div 
                    onClick={() => setShowSortMenu(false)} 
                    style={{ 
                      position: 'fixed', 
                      top: 0, 
                      left: 0, 
                      right: 0, 
                      bottom: 0, 
                      zIndex: 5 
                    }} 
                  />
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    overflow: 'hidden',
                    zIndex: 10,
                    minWidth: '200px',
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
                          padding: '16px 20px',
                          border: 'none',
                          backgroundColor: sortMode === mode.id ? '#eff6ff' : 'transparent',
                          color: sortMode === mode.id ? '#2563eb' : '#374151',
                          cursor: 'pointer',
                          textAlign: 'right',
                          fontSize: '14px',
                          fontWeight: sortMode === mode.id ? '600' : '400',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                        }}
                      >
                        <span style={{ fontSize: '16px' }}>{mode.icon}</span>
                        <span>לפי {mode.name}</span>
                        {sortMode === mode.id && <span style={{ marginRight: 'auto', color: '#2563eb' }}>✓</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ display: 'flex', height: 'calc(100vh - 140px)' }}>
          
          {/* Miller Columns */}
          {!isMobile && (
            <>
              {columnOrder.map((colType, index) => {
                const items = getColumnItems(colType, index)
                const title = colType === 'building' ? 'בניין' : colType === 'floor' ? 'קומה' : colType === 'stage' ? 'שלב' : 'מקצוע'
                const prevColType = index > 0 ? columnOrder[index - 1] : null
                const showColumn = index === 0 || selections[prevColType!] !== null
                if (!showColumn) return null
                return (
                  <MillerColumn 
                    key={colType} 
                    title={title} 
                    items={items} 
                    selectedId={selections[colType]} 
                    onSelect={(id) => handleColumnSelect(colType, id)} 
                    isCollapsed={isColumnCollapsed(colType)} 
                    onHover={(hovered) => setHoveredColumn(hovered ? colType : null)} 
                  />
                )
              })}
            </>
          )}
          
          {/* Files Grid */}
          <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '16px' : '20px' }}>
            {filteredFiles.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 20px', color: '#94a3b8' }}>
                <p style={{ fontSize: '64px', marginBottom: '20px' }}>📂</p>
                <p style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>אין קבצים</p>
                <p style={{ fontSize: '14px' }}>העלה קובץ ראשון</p>
              </div>
            ) : (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', 
                gap: '16px' 
              }}>
                {filteredFiles.map(file => {
                  const isSelected = selectedFile?.id === file.id
                  const trade = TRADES.find(t => t.id === file.trade)
                  const floor = FLOORS.find(f => f.id === file.floor)
                  const stage = STAGES.find(s => s.id === file.stage)
                  const building = BUILDINGS.find(b => b.id === file.building)
                  
                  return (
                    <div 
                      key={file.id} 
                      onClick={() => handleFileClick(file)} 
                      style={{ 
                        ...styles.card, 
                        cursor: 'pointer', 
                        border: isSelected ? '2px solid #2563eb' : '1px solid rgba(0,0,0,0.06)', 
                        backgroundColor: isSelected ? '#eff6ff' : 'white',
                        padding: '16px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                        <span style={{ fontSize: '40px' }}>{getFileIcon(file.file_type)}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontWeight: '600', fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1e293b', marginBottom: '4px' }}>
                            {file.file_name}
                          </p>
                          <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                            {formatFileSize(file.file_size)}
                          </p>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                        {building && (
                          <span style={{ ...styles.badge, backgroundColor: '#fef3c7', color: '#d97706' }}>
                            {building.icon} {building.name}
                          </span>
                        )}
                        {trade && (
                          <span style={{ ...styles.badge, backgroundColor: '#eff6ff', color: '#2563eb' }}>
                            {trade.icon} {trade.name}
                          </span>
                        )}
                        {floor && (
                          <span style={{ ...styles.badge, backgroundColor: '#dcfce7', color: '#16a34a' }}>
                            {floor.icon} {floor.name}
                          </span>
                        )}
                        {stage && (
                          <span style={{ ...styles.badge, backgroundColor: '#f3e8ff', color: '#7c3aed' }}>
                            {stage.icon} {stage.name}
                          </span>
                        )}
                      </div>
                      
                      {file.description && (
                        <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#64748b', lineHeight: '1.4' }}>
                          {file.description}
                        </p>
                      )}
                      
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            canPreview(file.file_type) ? setPreviewFile(file) : window.open(file.file_url, '_blank') 
                          }} 
                          style={{ ...styles.buttonPrimary, flex: 1, padding: '10px', fontSize: '13px' }}
                        >
                          👁️ צפה
                        </button>
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            window.open(file.file_url, '_blank') 
                          }} 
                          style={{ ...styles.buttonPrimary, backgroundColor: '#10b981', padding: '10px 14px', fontSize: '13px' }}
                        >
                          ⬇️
                        </button>
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            deleteProjectFile(file) 
                          }} 
                          style={{ ...styles.buttonSecondary, backgroundColor: '#fef2f2', color: '#ef4444', borderColor: '#fecaca', padding: '10px 14px', fontSize: '13px' }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* File Upload Modal */}
        {showFileUpload && (
          <div onClick={() => setShowFileUpload(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: isMobile ? '16px' : '0' }}>
            <div onClick={(e) => e.stopPropagation()} style={{ ...styles.card, width: '90%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto', padding: isMobile ? '20px' : '28px' }}>
              <h2 style={{ marginTop: 0, marginBottom: '24px', fontSize: '20px', fontWeight: '600', color: '#1e293b' }}>📤 העלאת קובץ</h2>
              
              <div style={{ backgroundColor: '#f8fafc', padding: '18px', borderRadius: '14px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{ fontSize: '36px' }}>{getFileIcon(fileToUpload?.name.split('.').pop() || '')}</span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: '600', fontSize: '15px', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileToUpload?.name}</p>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>{formatFileSize(fileToUpload?.size || 0)}</p>
                </div>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', fontSize: '14px', color: '#374151' }}>בניין</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {BUILDINGS.map(building => (
                    <button key={building.id} onClick={() => setFileUploadData({ ...fileUploadData, building: building.id })} style={{ ...styles.chip, ...(fileUploadData.building === building.id ? styles.chipActive : {}) }}>
                      {building.icon} {building.name}
                    </button>
                  ))}
                </div>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', fontSize: '14px', color: '#374151' }}>שלב</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {STAGES.map(stage => (
                    <button key={stage.id} onClick={() => setFileUploadData({ ...fileUploadData, stage: stage.id })} style={{ ...styles.chip, ...(fileUploadData.stage === stage.id ? styles.chipActive : {}) }}>
                      {stage.icon} {stage.name}
                    </button>
                  ))}
                </div>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', fontSize: '14px', color: '#374151' }}>קומה</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {FLOORS.slice(0, 6).map(floor => (
                    <button key={floor.id} onClick={() => setFileUploadData({ ...fileUploadData, floor: floor.id })} style={{ ...styles.chip, ...(fileUploadData.floor === floor.id ? styles.chipActive : {}) }}>
                      {floor.icon} {floor.name}
                    </button>
                  ))}
                </div>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', fontSize: '14px', color: '#374151' }}>מקצוע</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {TRADES.slice(0, 6).map(trade => (
                    <button key={trade.id} onClick={() => setFileUploadData({ ...fileUploadData, trade: trade.id })} style={{ ...styles.chip, ...(fileUploadData.trade === trade.id ? styles.chipActive : {}) }}>
                      {trade.icon} {trade.name}
                    </button>
                  ))}
                </div>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', fontSize: '14px', color: '#374151' }}>תיאור (אופציונלי)</label>
                <input type="text" value={fileUploadData.description} onChange={(e) => setFileUploadData({ ...fileUploadData, description: e.target.value })} placeholder="תיאור הקובץ..." style={styles.input} />
              </div>
              
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', fontSize: '14px', color: '#374151' }}>יחידה/דירה (אופציונלי)</label>
                <input type="text" value={fileUploadData.unit} onChange={(e) => setFileUploadData({ ...fileUploadData, unit: e.target.value })} placeholder="לדוגמה: דירה 10" style={styles.input} />
              </div>
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowFileUpload(false)} style={styles.buttonSecondary}>ביטול</button>
                <button onClick={uploadProjectFile} disabled={uploadingFile} style={{ ...styles.buttonPrimary, backgroundColor: uploadingFile ? '#9ca3af' : '#10b981' }}>
                  {uploadingFile ? 'מעלה...' : '✓ העלה'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {previewFile && (
          <div onClick={() => setPreviewFile(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: isMobile ? '16px' : '0' }}>
            <div style={{ color: 'white', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={{ fontSize: isMobile ? '14px' : '18px', fontWeight: '500', maxWidth: isMobile ? '150px' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {previewFile.file_name}
              </span>
              <a href={previewFile.file_url} download target="_blank" onClick={(e) => e.stopPropagation()} style={{ ...styles.buttonPrimary, textDecoration: 'none' }}>
                ⬇️ הורד
              </a>
              <button onClick={() => setPreviewFile(null)} style={{ ...styles.buttonPrimary, backgroundColor: '#ef4444' }}>
                ✕ סגור
              </button>
            </div>
            <div onClick={(e) => e.stopPropagation()} style={{ width: '90%', height: isMobile ? '70%' : '80%', backgroundColor: 'white', borderRadius: '16px', overflow: 'hidden' }}>
              {['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(previewFile.file_type?.toLowerCase()) ? (
                <img src={previewFile.file_url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : previewFile.file_type?.toLowerCase() === 'pdf' ? (
                <iframe src={previewFile.file_url} style={{ width: '100%', height: '100%', border: 'none' }} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '24px' }}>
                  <span style={{ fontSize: '80px' }}>{getFileIcon(previewFile.file_type)}</span>
                  <p style={{ color: '#64748b', fontSize: '16px' }}>אין תצוגה מקדימה לקובץ זה</p>
                  <a href={previewFile.file_url} download target="_blank" style={{ ...styles.buttonPrimary, textDecoration: 'none' }}>
                    ⬇️ הורד קובץ
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} />
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </>
  )
}
