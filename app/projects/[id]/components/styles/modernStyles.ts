/**
 * ===========================================
 * Modern Styles - Projekta v3.0
 * קובץ סגנונות משותף לכל הקומפוננטים
 * ===========================================
 */

export const modernStyles = {
  // Page
  page: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: 'Heebo, sans-serif',
  },
  
  // Header
  header: {
    background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
    color: 'white',
    padding: '14px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)',
  },
  
  // Main container with panels
  mainContainer: {
    display: 'flex',
    height: 'calc(100vh - 60px)',
    overflow: 'hidden',
  },
  
  // Panel
  panel: {
    height: '100%',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
    transition: 'width 0.3s ease',
  },
  
  // Panel header
  panelHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  // Panel content
  panelContent: {
    flex: 1,
    overflow: 'auto',
    padding: '20px',
    backgroundColor: '#f8fafc',
  },
  
  // Updates container (centered)
  updatesContainer: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  
  // Resizer
  resizer: {
    width: '6px',
    cursor: 'col-resize',
    backgroundColor: '#e5e7eb',
    transition: 'background-color 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Card
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)',
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
    transition: 'box-shadow 0.2s ease, transform 0.2s ease',
  },
  
  // Update card
  updateCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    marginBottom: '12px',
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
    transition: 'all 0.2s ease',
  },
  
  // Update card header
  updateCardHeader: {
    padding: '12px 16px',
    backgroundColor: '#fafbfc',
    borderBottom: '1px solid #f1f5f9',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap' as const,
  },
  
  // Update card body
  updateCardBody: {
    padding: '16px',
  },
  
  // Update card footer
  updateCardFooter: {
    padding: '12px 16px',
    borderTop: '1px solid #f1f5f9',
    backgroundColor: '#fafbfc',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap' as const,
  },
  
  // Button primary
  buttonPrimary: {
    padding: '8px 16px',
    backgroundColor: '#6366F1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '13px',
    fontFamily: 'Heebo, sans-serif',
    transition: 'all 0.15s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  },
  
  // Button secondary
  buttonSecondary: {
    padding: '8px 16px',
    backgroundColor: 'white',
    color: '#374151',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '13px',
    fontFamily: 'Heebo, sans-serif',
    transition: 'all 0.15s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  },
  
  // Button ghost
  buttonGhost: {
    padding: '6px 12px',
    backgroundColor: 'transparent',
    color: '#64748b',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '13px',
    fontFamily: 'Heebo, sans-serif',
    transition: 'all 0.15s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  },
  
  // Chip
  chip: {
    padding: '6px 12px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '12px',
    fontFamily: 'Heebo, sans-serif',
    transition: 'all 0.15s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  
  // Input
  input: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'Heebo, sans-serif',
    outline: 'none',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    boxSizing: 'border-box' as const,
  },
  
  // Badge
  badge: {
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    fontFamily: 'Heebo, sans-serif',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  
  // Stat card
  statCard: {
    flex: 1,
    minWidth: '100px',
    padding: '12px 16px',
    backgroundColor: 'white',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    transition: 'all 0.15s ease',
  },
  
  // File item
  fileItem: {
    padding: '12px',
    backgroundColor: 'white',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    marginBottom: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    transition: 'all 0.15s ease',
  },
  
  // Miller Column styles
  millerColumn: {
    minWidth: '140px',
    maxWidth: '140px',
    borderLeft: '1px solid #e5e7eb',
    backgroundColor: '#fafbfc',
    transition: 'all 0.25s ease',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  
  millerColumnCollapsed: {
    minWidth: '50px',
    maxWidth: '50px',
  },
  
  millerColumnHeader: {
    padding: '12px 10px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f1f5f9',
    fontSize: '12px',
    fontWeight: '600',
    color: '#6366F1',
    textAlign: 'center' as const,
    whiteSpace: 'nowrap' as const,
    fontFamily: 'Heebo, sans-serif',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
  },
  
  millerColumnItem: {
    padding: '10px 12px',
    cursor: 'pointer',
    backgroundColor: 'transparent',
    color: '#374151',
    borderRadius: '8px',
    marginBottom: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    fontFamily: 'Heebo, sans-serif',
    fontWeight: '400',
    transition: 'all 0.15s ease',
    border: 'none',
    width: '100%',
    textAlign: 'right' as const,
  },
  
  millerColumnItemSelected: {
    backgroundColor: '#6366F1',
    color: 'white',
    fontWeight: '500',
  },
  
  millerColumnItemCount: {
    fontSize: '10px',
    fontWeight: '600',
    backgroundColor: '#e0e7ff',
    color: '#4338ca',
    padding: '2px 6px',
    borderRadius: '4px',
    marginRight: 'auto',
  },
}

// Column titles for Miller Columns
export const COLUMN_TITLES: { [key: string]: { title: string; icon: string } } = {
  building: { title: 'בניין', icon: '🏢' },
  floor: { title: 'קומה', icon: '🏠' },
  stage: { title: 'שלב', icon: '📋' },
  trade: { title: 'מקצוע', icon: '🔧' },
}

// Sort modes for files
export const SORT_MODES = [
  { id: 'building', name: 'בניין', icon: '🏢', order: ['building', 'floor', 'stage', 'trade'] },
  { id: 'floor', name: 'קומה', icon: '🏠', order: ['floor', 'stage', 'trade', 'building'] },
  { id: 'stage', name: 'שלב', icon: '📋', order: ['stage', 'trade', 'floor', 'building'] },
  { id: 'trade', name: 'מקצוע', icon: '🔧', order: ['trade', 'stage', 'floor', 'building'] },
]
