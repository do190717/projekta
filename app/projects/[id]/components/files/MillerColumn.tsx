/**
 * ===========================================
 * Miller Column Component
 * עמודת ניווט היררכית לקבצים
 * ===========================================
 */

import { modernStyles } from '../styles/modernStyles'

interface MillerColumnItem {
  id: string
  name: string
  icon: string
  count?: number
}

interface MillerColumnProps {
  title: string
  icon: string
  items: MillerColumnItem[]
  selectedId: string | null
  onSelect: (id: string) => void
  isCollapsed: boolean
  onHover: (hovered: boolean) => void
}

export default function MillerColumn({ 
  title, 
  icon, 
  items, 
  selectedId, 
  onSelect, 
  isCollapsed, 
  onHover 
}: MillerColumnProps) {
  const selectedItem = items.find(item => item.id === selectedId)
  
  return (
    <div
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      style={{
        ...modernStyles.millerColumn,
        ...(isCollapsed ? modernStyles.millerColumnCollapsed : {}),
      }}
    >
      {/* Column Header */}
      <div style={modernStyles.millerColumnHeader}>
        {isCollapsed ? (
          <span style={{ fontSize: '16px' }}>{icon}</span>
        ) : (
          <>
            <span>{icon}</span>
            <span>{title}</span>
          </>
        )}
      </div>
      
      {/* Column Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
        {isCollapsed ? (
          // Collapsed view - show only selected icon
          <div style={{ 
            padding: '12px 8px', 
            textAlign: 'center', 
            fontSize: '20px',
            color: selectedItem ? '#6366F1' : '#94a3b8',
          }}>
            {selectedItem?.icon || icon}
          </div>
        ) : (
          // Expanded view - show all items
          items.map(item => {
            const isSelected = selectedId === item.id
            return (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                style={{
                  ...modernStyles.millerColumnItem,
                  ...(isSelected ? modernStyles.millerColumnItemSelected : {}),
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = '#f1f5f9'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }
                }}
              >
                <span style={{ fontSize: '14px' }}>{item.icon}</span>
                <span style={{ 
                  flex: 1, 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis', 
                  whiteSpace: 'nowrap',
                  textAlign: 'right',
                }}>{item.name}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span style={{
                    ...modernStyles.millerColumnItemCount,
                    backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : '#e0e7ff',
                    color: isSelected ? 'white' : '#4338ca',
                  }}>{item.count}</span>
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
