'use client'

import { useState } from 'react'
import { theme, baseStyles, getStatusColor } from '@/lib/design-system'
import { 
  UPDATE_STATUSES, 
  WORK_TYPES, 
  CATEGORIES,
  getFileIcon,
  type UpdateStatusId,
  type WorkTypeId 
} from '@/lib/constants'

// ===========================================
// Types
// ===========================================

interface UpdateCardProps {
  update: {
    id: string
    content: string
    category: string
    status: UpdateStatusId
    work_type: WorkTypeId
    user_id: string
    created_at: string
    tagged_files?: string[]
    ai_analysis?: {
      suggested_category?: string
      suggested_work_type?: string
      suggested_assignees?: string[]
      summary?: string
    }
  }
  userName: string
  userRole: string
  currentUserId: string
  projectFiles?: any[]
  commentsCount?: number
  imagesCount?: number
  onStatusChange: (updateId: string, newStatus: UpdateStatusId) => void
  onWorkTypeChange: (updateId: string, newWorkType: WorkTypeId) => void
  onDispute: (updateId: string, reason: string) => void
  onOpenChat: (updateId: string, content: string) => void
  onFileClick: (file: any) => void
  onDelete: (updateId: string) => void
  isMobile: boolean
}

// ===========================================
// Sub Components
// ===========================================

function StatusBadge({ status }: { status: UpdateStatusId }) {
  const statusInfo = UPDATE_STATUSES[status]
  const colors = getStatusColor(status)
  
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: 600,
      backgroundColor: colors.bg,
      color: colors.text,
      border: `1px solid ${colors.border}`,
      transition: `all ${theme.transitions.fast}`,
    }}>
      <span>{statusInfo.icon}</span>
      <span>{statusInfo.name}</span>
    </span>
  )
}

function WorkTypeBadge({ workType, onClick }: { workType: WorkTypeId; onClick?: () => void }) {
  const info = WORK_TYPES[workType]
  
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: 600,
        backgroundColor: info.bgColor,
        color: info.color,
        border: `1.5px solid ${info.color}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: `all ${theme.transitions.fast}`,
        fontFamily: theme.typography.fontFamily.sans,
      }}
    >
      <span>{info.icon}</span>
      <span>{info.name}</span>
    </button>
  )
}

function CategoryChip({ categoryId }: { categoryId: string }) {
  const category = CATEGORIES.find(c => c.id === categoryId) || CATEGORIES[CATEGORIES.length - 1]
  
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '3px 10px',
      borderRadius: '8px',
      fontSize: '12px',
      fontWeight: 500,
      backgroundColor: theme.colors.gray[100],
      color: theme.colors.gray[700],
    }}>
      <span>{category.icon}</span>
      <span>{category.name}</span>
    </span>
  )
}

function ActionButton({ 
  icon, 
  label, 
  onClick, 
  variant = 'ghost',
  disabled = false,
  color,
}: { 
  icon: string
  label: string
  onClick: () => void
  variant?: 'ghost' | 'primary' | 'success' | 'danger' | 'warning'
  disabled?: boolean
  color?: string
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: theme.colors.primary[500],
          color: 'white',
          border: 'none',
        }
      case 'success':
        return {
          backgroundColor: theme.colors.success.main,
          color: 'white',
          border: 'none',
        }
      case 'danger':
        return {
          backgroundColor: theme.colors.error.light,
          color: theme.colors.error.main,
          border: `1px solid ${theme.colors.error.main}`,
        }
      case 'warning':
        return {
          backgroundColor: theme.colors.warning.light,
          color: theme.colors.warning.dark,
          border: `1px solid ${theme.colors.warning.main}`,
        }
      default:
        return {
          backgroundColor: theme.colors.gray[100],
          color: color || theme.colors.gray[700],
          border: `1px solid ${theme.colors.gray[200]}`,
        }
    }
  }
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 14px',
        borderRadius: '10px',
        fontSize: '13px',
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: `all ${theme.transitions.fast}`,
        fontFamily: theme.typography.fontFamily.sans,
        ...getVariantStyles(),
      }}
    >
      <span style={{ fontSize: '14px' }}>{icon}</span>
      <span>{label}</span>
    </button>
  )
}

// ===========================================
// Status Action Buttons
// ===========================================

function StatusActions({ 
  status, 
  userRole,
  onStatusChange,
  onDispute,
}: { 
  status: UpdateStatusId
  userRole: string
  onStatusChange: (newStatus: UpdateStatusId) => void
  onDispute: () => void
}) {
  const statusInfo = UPDATE_STATUSES[status]
  const nextStatuses = statusInfo.nextStatuses
  
  // הרשאות לפי תפקיד
  const canApprove = ['owner', 'admin', 'supervisor', 'engineer'].includes(userRole)
  const canDispute = ['contractor', 'worker'].includes(userRole) || canApprove
  const canComplete = ['contractor', 'worker', 'admin'].includes(userRole) || canApprove
  const canVerify = ['owner', 'admin', 'supervisor'].includes(userRole)
  
  const renderButtons = () => {
    const buttons = []
    
    if (status === 'open' && canApprove) {
      buttons.push(
        <ActionButton key="review" icon="🔍" label="העבר לבדיקה" onClick={() => onStatusChange('in_review')} />
      )
    }
    
    if (status === 'in_review') {
      if (canApprove) {
        buttons.push(
          <ActionButton key="approve" icon="✅" label="אשר" variant="success" onClick={() => onStatusChange('approved')} />
        )
        buttons.push(
          <ActionButton key="reject" icon="❌" label="דחה" variant="danger" onClick={() => onStatusChange('rejected')} />
        )
      }
      if (canDispute) {
        buttons.push(
          <ActionButton key="dispute" icon="⚠️" label="השגה" variant="warning" onClick={onDispute} />
        )
      }
    }
    
    if (status === 'disputed' && canApprove) {
      buttons.push(
        <ActionButton key="back-review" icon="🔄" label="החזר לבדיקה" onClick={() => onStatusChange('in_review')} />
      )
    }
    
    if (status === 'approved' && canComplete) {
      buttons.push(
        <ActionButton key="start" icon="🔨" label="התחל ביצוע" variant="primary" onClick={() => onStatusChange('in_progress')} />
      )
    }
    
    if (status === 'in_progress' && canComplete) {
      buttons.push(
        <ActionButton key="complete" icon="✔️" label="סיים" variant="success" onClick={() => onStatusChange('completed')} />
      )
    }
    
    if (status === 'completed' && canVerify) {
      buttons.push(
        <ActionButton key="verify" icon="🏆" label="אשר סופית" variant="success" onClick={() => onStatusChange('verified')} />
      )
      buttons.push(
        <ActionButton key="reopen" icon="🔄" label="החזר לביצוע" onClick={() => onStatusChange('in_progress')} />
      )
    }
    
    return buttons
  }
  
  const buttons = renderButtons()
  
  if (buttons.length === 0) return null
  
  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      marginTop: '12px',
      paddingTop: '12px',
      borderTop: `1px solid ${theme.colors.border.light}`,
    }}>
      {buttons}
    </div>
  )
}

// ===========================================
// Main Component
// ===========================================

export default function UpdateCard({
  update,
  userName,
  userRole,
  currentUserId,
  projectFiles = [],
  commentsCount = 0,
  imagesCount = 0,
  onStatusChange,
  onWorkTypeChange,
  onDispute,
  onOpenChat,
  onFileClick,
  onDelete,
  isMobile,
}: UpdateCardProps) {
  const [showWorkTypeMenu, setShowWorkTypeMenu] = useState(false)
  const [showDisputeModal, setShowDisputeModal] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  
  const category = CATEGORIES.find(c => c.id === update.category)
  const taggedFiles = update.tagged_files 
    ? projectFiles.filter(f => update.tagged_files?.includes(f.id)) 
    : []
  
  const isCompleted = ['completed', 'verified', 'cancelled', 'rejected'].includes(update.status)
  
  const handleDispute = () => {
    if (disputeReason.trim()) {
      onDispute(update.id, disputeReason)
      setShowDisputeModal(false)
      setDisputeReason('')
    }
  }
  
  const handleWorkTypeSelect = (workType: WorkTypeId) => {
    onWorkTypeChange(update.id, workType)
    setShowWorkTypeMenu(false)
  }
  
  return (
    <>
      <div 
        style={{
          backgroundColor: theme.colors.background.secondary,
          borderRadius: theme.borderRadius.xl,
          border: `1px solid ${isCompleted ? theme.colors.border.light : theme.colors.border.medium}`,
          boxShadow: theme.shadows.sm,
          overflow: 'hidden',
          opacity: isCompleted ? 0.75 : 1,
          transition: `all ${theme.transitions.normal}`,
          animation: 'fadeInUp 0.3s ease-out',
        }}
      >
        {/* Header */}
        <div style={{
          padding: isMobile ? '14px 16px' : '16px 20px',
          borderBottom: `1px solid ${theme.colors.border.light}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          backgroundColor: theme.colors.gray[50],
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <CategoryChip categoryId={update.category} />
            <StatusBadge status={update.status} />
            <div style={{ position: 'relative' }}>
              <WorkTypeBadge 
                workType={update.work_type} 
                onClick={() => userRole !== 'viewer' && setShowWorkTypeMenu(!showWorkTypeMenu)} 
              />
              
              {/* Work Type Dropdown */}
              {showWorkTypeMenu && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  backgroundColor: 'white',
                  borderRadius: theme.borderRadius.lg,
                  boxShadow: theme.shadows.lg,
                  border: `1px solid ${theme.colors.border.light}`,
                  zIndex: 100,
                  minWidth: '160px',
                  overflow: 'hidden',
                  animation: 'fadeInDown 0.15s ease-out',
                }}>
                  {Object.entries(WORK_TYPES).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => handleWorkTypeSelect(key as WorkTypeId)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        border: 'none',
                        backgroundColor: update.work_type === key ? value.bgColor : 'transparent',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontFamily: theme.typography.fontFamily.sans,
                        color: theme.colors.text.primary,
                        transition: `background-color ${theme.transitions.fast}`,
                      }}
                    >
                      <span>{value.icon}</span>
                      <span style={{ fontWeight: update.work_type === key ? 600 : 400 }}>{value.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '13px',
            color: theme.colors.text.tertiary,
          }}>
            <span style={{ fontWeight: 500, color: theme.colors.text.secondary }}>{userName}</span>
            <span>{new Date(update.created_at).toLocaleDateString('he-IL')}</span>
          </div>
        </div>
        
        {/* Content */}
        <div style={{ padding: isMobile ? '16px' : '20px' }}>
          {/* Main Text */}
          <p style={{
            margin: 0,
            fontSize: '15px',
            lineHeight: 1.7,
            color: theme.colors.text.primary,
            textDecoration: isCompleted ? 'line-through' : 'none',
            opacity: isCompleted ? 0.7 : 1,
          }}>
            {update.content}
          </p>
          
          {/* AI Analysis (if exists) */}
          {update.ai_analysis?.summary && (
            <div style={{
              marginTop: '12px',
              padding: '12px 14px',
              backgroundColor: theme.colors.primary[50],
              borderRadius: theme.borderRadius.lg,
              border: `1px solid ${theme.colors.primary[200]}`,
              fontSize: '13px',
              color: theme.colors.primary[700],
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}>
              <span style={{ fontSize: '16px' }}>🤖</span>
              <span>{update.ai_analysis.summary}</span>
            </div>
          )}
          
          {/* Tagged Files */}
          {taggedFiles.length > 0 && (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              marginTop: '14px',
            }}>
              {taggedFiles.map(file => (
                <button
                  key={file.id}
                  onClick={() => onFileClick(file)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    backgroundColor: theme.colors.gray[100],
                    border: `1px solid ${theme.colors.border.light}`,
                    borderRadius: theme.borderRadius.md,
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: theme.colors.text.secondary,
                    transition: `all ${theme.transitions.fast}`,
                    fontFamily: theme.typography.fontFamily.sans,
                  }}
                >
                  <span>{getFileIcon(file.file_type)}</span>
                  <span style={{
                    maxWidth: isMobile ? '100px' : '150px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {file.file_name}
                  </span>
                </button>
              ))}
            </div>
          )}
          
          {/* Footer Actions */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: `1px solid ${theme.colors.border.light}`,
            flexWrap: 'wrap',
            gap: '10px',
          }}>
            {/* Chat Button */}
            <button
              onClick={() => onOpenChat(update.id, update.content)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                border: 'none',
                borderRadius: theme.borderRadius.lg,
                color: 'white',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: theme.typography.fontFamily.sans,
                boxShadow: '0 2px 8px rgba(37, 211, 102, 0.3)',
                transition: `all ${theme.transitions.fast}`,
              }}
            >
              <span>💬</span>
              <span>דיון</span>
              {commentsCount > 0 && (
                <span style={{
                  backgroundColor: 'rgba(255,255,255,0.25)',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '11px',
                }}>
                  {commentsCount}
                </span>
              )}
            </button>
            
            {/* Secondary Actions */}
            <div style={{ display: 'flex', gap: '8px' }}>
              {imagesCount > 0 && (
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '13px',
                  color: theme.colors.text.tertiary,
                }}>
                  📷 {imagesCount}
                </span>
              )}
              
              {userRole !== 'viewer' && (
                <button
                  onClick={() => onDelete(update.id)}
                  style={{
                    padding: '8px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '16px',
                    opacity: 0.5,
                    transition: `opacity ${theme.transitions.fast}`,
                  }}
                  title="מחק"
                >
                  🗑️
                </button>
              )}
            </div>
          </div>
          
          {/* Status Actions */}
          <StatusActions
            status={update.status}
            userRole={userRole}
            onStatusChange={(newStatus) => onStatusChange(update.id, newStatus)}
            onDispute={() => setShowDisputeModal(true)}
          />
        </div>
      </div>
      
      {/* Dispute Modal */}
      {showDisputeModal && (
        <div 
          onClick={() => setShowDisputeModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              borderRadius: theme.borderRadius['2xl'],
              padding: '24px',
              width: '100%',
              maxWidth: '450px',
              boxShadow: theme.shadows.xl,
              animation: 'scaleIn 0.2s ease-out',
            }}
          >
            <h3 style={{
              margin: '0 0 20px',
              fontSize: '18px',
              fontWeight: 600,
              color: theme.colors.text.primary,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <span>⚠️</span>
              <span>הגשת השגה</span>
            </h3>
            
            <p style={{
              margin: '0 0 16px',
              fontSize: '14px',
              color: theme.colors.text.secondary,
              lineHeight: 1.6,
            }}>
              אתה חולק על הסיווג של עבודה זו. נא לפרט את הסיבה:
            </p>
            
            <textarea
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="לדוגמה: לפי סעיף 4.2 בחוזה, עבודה זו אינה כלולה..."
              style={{
                width: '100%',
                minHeight: '120px',
                padding: '14px',
                border: `1.5px solid ${theme.colors.border.medium}`,
                borderRadius: theme.borderRadius.lg,
                fontSize: '14px',
                fontFamily: theme.typography.fontFamily.sans,
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
                transition: `border-color ${theme.transitions.fast}`,
              }}
            />
            
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              marginTop: '20px',
            }}>
              <button
                onClick={() => setShowDisputeModal(false)}
                style={{
                  padding: '12px 20px',
                  backgroundColor: theme.colors.gray[100],
                  border: `1px solid ${theme.colors.border.light}`,
                  borderRadius: theme.borderRadius.lg,
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: theme.typography.fontFamily.sans,
                  color: theme.colors.text.primary,
                }}
              >
                ביטול
              </button>
              <button
                onClick={handleDispute}
                disabled={!disputeReason.trim()}
                style={{
                  padding: '12px 20px',
                  backgroundColor: theme.colors.warning.main,
                  border: 'none',
                  borderRadius: theme.borderRadius.lg,
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: disputeReason.trim() ? 'pointer' : 'not-allowed',
                  opacity: disputeReason.trim() ? 1 : 0.5,
                  fontFamily: theme.typography.fontFamily.sans,
                  color: 'white',
                }}
              >
                שלח השגה
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Click outside to close work type menu */}
      {showWorkTypeMenu && (
        <div 
          onClick={() => setShowWorkTypeMenu(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99,
          }}
        />
      )}
    </>
  )
}
