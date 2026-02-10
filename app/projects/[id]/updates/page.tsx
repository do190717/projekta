'use client'

/**
 * ===========================================
 * דף פרויקט - Projekta v3.0
 * עיצוב מודרני עם Layout של 2 פאנלים
 * + מערכת קבצים היררכית (Miller Columns)
 * ===========================================
 */

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { showSuccess, showError } from '@/app/utils/toast'
import WhatsAppChat from '@/components/WhatsAppChat'
import { useIsMobile } from '@/hooks/useIsMobile'
import Sidebar from '../components/Sidebar'
import MobileSidebar from '../components/MobileSidebar'
import { 
  CATEGORIES, 
  BUILDINGS, 
  FLOORS, 
  STAGES, 
  TRADES, 
  ROLES,
  UPDATE_STATUSES,
  WORK_TYPES,
  getFileIcon as getFileIconHelper,
  formatFileSize as formatFileSizeHelper,
  detectCategory as detectCategoryHelper,
  type UpdateStatusId,
  type WorkTypeId,
} from '@/lib/constants'

// Import components
import { modernStyles, SORT_MODES } from '../components/styles/modernStyles'
import FilesPanel from '../components/files/FilesPanel'
import MobileFilesPanel from '../components/files/MobileFilesPanel'


// ===========================================
// TYPES
// ===========================================

interface PanelSize {
  updates: number
  files: number
}


// ===========================================
// HELPERS
// ===========================================

const detectCategory = (text: string) => detectCategoryHelper(text)
const getFileIcon = (fileType: string) => getFileIconHelper(fileType)
const formatFileSize = (bytes: number) => formatFileSizeHelper(bytes)

const parseMultipleUpdates = (text: string) => {
  const lines = text.split(/[\n]+|(?<=\.)\s+/).map(line => line.trim()).filter(line => line.length > 2)
  if (lines.length === 0 && text.trim().length > 0) lines.push(text.trim())
  return lines.map(line => ({ content: line, category: detectCategory(line), selected: true }))
}

const generateToken = () => Math.random().toString(36).substring(2) + Date.now().toString(36)
const canPreview = (fileType: string) => ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileType?.toLowerCase())


// ===========================================
// SUB COMPONENTS
// ===========================================

// Status Badge Component
function StatusBadge({ status, size = 'normal' }: { status: UpdateStatusId; size?: 'small' | 'normal' }) {
  const info = UPDATE_STATUSES[status] || UPDATE_STATUSES.open
  const padding = size === 'small' ? '3px 8px' : '4px 10px'
  const fontSize = size === 'small' ? '10px' : '11px'
  
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding,
      borderRadius: '6px',
      fontSize,
      fontWeight: 600,
      backgroundColor: info.bgColor,
      color: info.color,
      fontFamily: 'Heebo, sans-serif',
    }}>
      <span>{info.icon}</span>
      <span>{info.name}</span>
    </span>
  )
}

// Work Type Badge Component
function WorkTypeBadge({ 
  workType, 
  onClick,
  size = 'normal' 
}: { 
  workType: WorkTypeId
  onClick?: () => void
  size?: 'small' | 'normal'
}) {
  const info = WORK_TYPES[workType] || WORK_TYPES.pending
  const padding = size === 'small' ? '3px 8px' : '4px 10px'
  const fontSize = size === 'small' ? '10px' : '11px'
  
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding,
        borderRadius: '6px',
        fontSize,
        fontWeight: 600,
        backgroundColor: info.bgColor,
        color: info.color,
        border: 'none',
        cursor: onClick ? 'pointer' : 'default',
        fontFamily: 'Heebo, sans-serif',
        transition: 'all 0.15s ease',
      }}
    >
      <span>{info.icon}</span>
      <span>{info.name}</span>
    </button>
  )
}


// ===========================================
// MAIN COMPONENT - Part 1: State & Effects
// ===========================================

export default function ProjectPage() {
  
  const params = useParams()
  if (!params?.id) {
  return <div>Invalid project ID</div>
}
const projectId = params.id as string
  const supabase = createClient()
  const isMobile = useIsMobile()

  // Panel State
  const [showFilesPanel, setShowFilesPanel] = useState(false)
  const [panelSizes, setPanelSizes] = useState<PanelSize>({ updates: 55, files: 45 })
  const [isResizing, setIsResizing] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Core State
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<string>('viewer')
  
  // Updates State
  const [updates, setUpdates] = useState<any[]>([])
  const [newUpdate, setNewUpdate] = useState('')
  const [parsedUpdates, setParsedUpdates] = useState<any[]>([])
  const [showReview, setShowReview] = useState(false)
  const [sending, setSending] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'completed'>('all')
  const [workTypeFilter, setWorkTypeFilter] = useState<'all' | WorkTypeId>('all')
  const [workTypeMenuUpdateId, setWorkTypeMenuUpdateId] = useState<string | null>(null)
  
  // Comments/Chat State
  const [comments, setComments] = useState<{ [key: string]: any[] }>({})
  const [images, setImages] = useState<{ [key: string]: any[] }>({})
  const [reactions, setReactions] = useState<{ [key: string]: any[] }>({})
  const [readStatuses, setReadStatuses] = useState<{ [key: string]: any[] }>({})
  const [chatUpdateId, setChatUpdateId] = useState<string | null>(null)
  const [chatUpdateContent, setChatUpdateContent] = useState<string>('')
  
  // Images State
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [viewingImage, setViewingImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Team State
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [invitations, setInvitations] = useState<any[]>([])
  const [inviteContact, setInviteContact] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviting, setInviting] = useState(false)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<{ [key: string]: any }>({})

  // Files State
  const [projectFiles, setProjectFiles] = useState<any[]>([])
  const [selectedFile, setSelectedFile] = useState<any>(null)
  
  // File Upload State
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [fileToUpload, setFileToUpload] = useState<File | null>(null)
  const [fileUploadData, setFileUploadData] = useState({ trade: 'general', floor: 'general', stage: 'planning', unit: '', description: '' })
  const projectFileInputRef = useRef<HTMLInputElement>(null)
  
  // Preview State
  const [previewFile, setPreviewFile] = useState<any>(null)
  const [showFileSelector, setShowFileSelector] = useState(false)
  const [selectedFilesForUpdate, setSelectedFilesForUpdate] = useState<any[]>([])


  // ===========================================
  // RESIZE HANDLER
  // ===========================================
  
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return
      
      const container = containerRef.current
      const containerRect = container.getBoundingClientRect()
      const containerWidth = containerRect.width
      const mouseX = e.clientX - containerRect.left
      
      const filesPercent = Math.max(25, Math.min(65, ((containerWidth - mouseX) / containerWidth) * 100))
      const updatesPercent = 100 - filesPercent
      
      setPanelSizes({ updates: updatesPercent, files: filesPercent })
    }
    
    const handleMouseUp = () => setIsResizing(false)
    
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])


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
    
    if (projectData?.owner_id === user.id) { 
      setUserRole('owner') 
    } else {
      const { data: memberData } = await supabase.from('project_members').select('role').eq('project_id', projectId).eq('user_id', user.id).single()
      if (memberData) setUserRole(memberData.role)
    }
    
    setLoading(false)
    await fetchUpdates()
    fetchTeamMembers()
    fetchInvitations()
    fetchProjectFiles()
  }
  
  initializePage()
}, [projectId])

  // בדוק sessionStorage אחרי טעינת העדכונים
    useEffect(() => {
    if (loading || updates.length === 0) return
      
    const chatUpdateId = sessionStorage.getItem('openChatForUpdateId')
    const highlightUpdateId = sessionStorage.getItem('highlightUpdateId')
      
    if (chatUpdateId) {
      sessionStorage.removeItem('openChatForUpdateId')
      const update = updates.find(u => u.id === chatUpdateId)
      if (update) {
        setTimeout(() => {
          openChat(chatUpdateId, update.content)
        }, 300)
      }
    } else if (highlightUpdateId) {
      sessionStorage.removeItem('highlightUpdateId')
      setTimeout(() => {
        const element = document.getElementById(`update-${highlightUpdateId}`)
        if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        element.style.animation = 'highlight 3s ease-in-out'
        }
      }, 300)
    }
  }, [loading, updates])


  // ===========================================
  // API FUNCTIONS
  // ===========================================
  
  const fetchProfiles = async (userIds: string[]) => {
    const uniqueIds = [...new Set(userIds)].filter(id => id && !profiles[id])
    if (uniqueIds.length === 0) return
    
    const { data } = await supabase.from('profiles').select('*').in('id', uniqueIds)
    if (data) {
      const newProfiles = { ...profiles }
      data.forEach(profile => { newProfiles[profile.id] = profile })
      setProfiles(newProfiles)
    }
  }
  
  const fetchUpdates = async () => {
    const { data } = await supabase.from('updates').select('*').eq('project_id', projectId).order('created_at', { ascending: false })
    if (data) {
      setUpdates(data)
      fetchProfiles(data.map(u => u.user_id).filter(Boolean))
      data.forEach(update => { 
        fetchComments(update.id)
        fetchImages(update.id)
      })
    }
  }
  
  const fetchComments = async (updateId: string) => {
    const { data } = await supabase.from('comments').select('*').eq('update_id', updateId).order('created_at', { ascending: true })
    if (data) {
      setComments(prev => ({ ...prev, [updateId]: data }))
      fetchProfiles(data.map(c => c.user_id).filter(Boolean))
      fetchReactions(updateId, data)
      fetchReadStatuses(updateId, data)
    }
  }
  
  const fetchImages = async (updateId: string) => {
    const { data } = await supabase.from('images').select('*').eq('update_id', updateId).order('created_at', { ascending: true })
    if (data) setImages(prev => ({ ...prev, [updateId]: data }))
  }
  
  const fetchReactions = async (updateId: string, commentsList: any[]) => {
    const commentIds = commentsList.map(c => c.id)
    if (commentIds.length === 0) {
      setReactions(prev => ({ ...prev, [updateId]: [] }))
      return
    }
    const { data } = await supabase.from('comment_reactions').select('*').in('comment_id', commentIds)
    if (data) setReactions(prev => ({ ...prev, [updateId]: data }))
  }
  
  const fetchReadStatuses = async (updateId: string, commentsList: any[]) => {
    const commentIds = commentsList.map(c => c.id)
    if (commentIds.length === 0) {
      setReadStatuses(prev => ({ ...prev, [updateId]: [] }))
      return
    }
    const { data } = await supabase.from('comment_reads').select('*').in('comment_id', commentIds)
    if (data) setReadStatuses(prev => ({ ...prev, [updateId]: data }))
  }
  
  const fetchTeamMembers = async () => {
    const { data } = await supabase.from('project_members').select('*').eq('project_id', projectId)
    if (data) { 
      setTeamMembers(data)
      fetchProfiles(data.map(m => m.user_id).filter(Boolean)) 
    }
  }
  
  const fetchInvitations = async () => {
    const { data } = await supabase.from('invitations').select('*').eq('project_id', projectId).eq('accepted', false)
    if (data) setInvitations(data)
  }
  
  const fetchProjectFiles = async () => {
    const { data } = await supabase.from('project_files').select('*').eq('project_id', projectId).order('created_at', { ascending: false })
    if (data) {
      setProjectFiles(data)
      window.postMessage({ type: 'FILES_UPDATED', files: data }, '*')
    }
  }


  // ===========================================
  // HANDLERS
  // ===========================================
  
  const canEdit = () => ['owner', 'admin', 'member'].includes(userRole)
  
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => setNewUpdate(e.target.value)
  
  const handleSubmit = () => {
    if (!newUpdate.trim() && selectedImages.length === 0) return
    setParsedUpdates(parseMultipleUpdates(newUpdate.trim() || 'תמונה'))
    setShowReview(true)
  }

  const toggleUpdateSelection = (index: number) => {
    const updated = [...parsedUpdates]
    updated[index].selected = !updated[index].selected
    setParsedUpdates(updated)
  }

  const updateParsedCategory = (index: number, newCategory: any) => {
    const updated = [...parsedUpdates]
    updated[index].category = newCategory
    setParsedUpdates(updated)
  }
  
  const sendUpdate = async () => {
    if (!user) return
    setSending(true)
    
    try {
      const updatesToSend = parsedUpdates.filter(u => u.selected)
      for (const update of updatesToSend) {
        const { data: newUpdateData } = await supabase.from('updates').insert({
          project_id: projectId, 
          content: update.content, 
          category: update.category.id,
          user_id: user.id, 
          status: 'open',
          work_type: 'pending',
          tagged_files: selectedFilesForUpdate.map(f => f.id),
        }).select().single()
        
        if (newUpdateData && selectedImages.length > 0) {
          for (const file of selectedImages) await uploadImage(file, newUpdateData.id)
        }
      }
      
      setNewUpdate('')
      setParsedUpdates([])
      setShowReview(false)
      setSelectedImages([])
      setImagePreviews([])
      setSelectedFilesForUpdate([])
      setShowFileSelector(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      
      showSuccess(updatesToSend.length > 1 ? `נוספו ${updatesToSend.length} עדכונים!` : 'העדכון נוסף!')
      fetchUpdates()
    } catch (error) {
      showError('שגיאה בשליחה')
    }
    
    setSending(false)
  }

  const updateStatus = async (updateId: string, newStatus: UpdateStatusId) => {
    await supabase.from('updates').update({ status: newStatus }).eq('id', updateId)
    showSuccess(`הסטטוס עודכן ל${UPDATE_STATUSES[newStatus].name}`)
    fetchUpdates()
  }

  const updateWorkType = async (updateId: string, newWorkType: WorkTypeId) => {
    await supabase.from('updates').update({ work_type: newWorkType }).eq('id', updateId)
    setWorkTypeMenuUpdateId(null)
    showSuccess(`סוג העבודה עודכן ל${WORK_TYPES[newWorkType].name}`)
    fetchUpdates()
  }

  const deleteUpdate = async (updateId: string) => {
    if (!confirm('למחוק את העדכון?')) return
    await supabase.from('updates').delete().eq('id', updateId)
    showSuccess('העדכון נמחק')
    fetchUpdates()
  }
  
  const handleImagesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setSelectedImages(prev => [...prev, ...files])
    setImagePreviews(prev => [...prev, ...files.map(file => URL.createObjectURL(file))])
  }

  const removeSelectedImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const uploadImage = async (file: File, updateId: string, commentId?: string) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `${projectId}/${updateId}/${commentId || 'main'}/${fileName}`
    
    const { error } = await supabase.storage.from('project-images').upload(filePath, file)
    if (error) throw error
    
    const { data: urlData } = supabase.storage.from('project-images').getPublicUrl(filePath)
    await supabase.from('images').insert({ 
      update_id: updateId, 
      comment_id: commentId || null, 
      url: urlData.publicUrl, 
      user_id: user?.id 
    })
  }
  
  const openChat = (updateId: string, updateContent: string) => {
    setChatUpdateId(updateId)
    setChatUpdateContent(updateContent)
    fetchComments(updateId)
    fetchImages(updateId)
  }
  
  const sendChatMessage = async (content: string, replyTo?: string, imageFiles?: File[], taggedFileIds?: string[]) => {
    if (!chatUpdateId || !user) return
    
    try {
      const { data: commentData } = await supabase.from('comments').insert({
        update_id: chatUpdateId,
        content: content,
        user_id: user.id,
        reply_to: replyTo || null,
        tagged_files: taggedFileIds || [],
      }).select().single()

      if (commentData && imageFiles && imageFiles.length > 0) {
        for (const file of imageFiles) {
          await uploadImage(file, chatUpdateId, commentData.id)
        }
      }

      fetchComments(chatUpdateId)
      fetchImages(chatUpdateId)
    } catch (error) {
      showError('שגיאה בשליחת ההודעה')
    }
  }
  
  const deleteChatMessage = async (messageId: string) => {
    if (!chatUpdateId) return
    try {
      await supabase.from('comments').update({ deleted_at: new Date().toISOString() }).eq('id', messageId)
      fetchComments(chatUpdateId)
    } catch (error) {
      showError('שגיאה במחיקת ההודעה')
    }
  }
  
  const addReaction = async (messageId: string, emoji: string) => {
    if (!chatUpdateId || !user) return
    try {
      await supabase.from('comment_reactions').insert({ comment_id: messageId, user_id: user.id, emoji: emoji })
      const currentComments = comments[chatUpdateId] || []
      fetchReactions(chatUpdateId, currentComments)
    } catch (error) {}
  }
  
  const removeReaction = async (messageId: string, emoji: string) => {
    if (!chatUpdateId || !user) return
    try {
      await supabase.from('comment_reactions').delete().eq('comment_id', messageId).eq('user_id', user.id).eq('emoji', emoji)
      const currentComments = comments[chatUpdateId] || []
      fetchReactions(chatUpdateId, currentComments)
    } catch (error) {}
  }
  
  const markMessagesAsRead = async (messageIds: string[]) => {
    if (!user || messageIds.length === 0) return
    try {
      const inserts = messageIds.map(id => ({ comment_id: id, user_id: user.id }))
      await supabase.from('comment_reads').upsert(inserts, { onConflict: 'comment_id,user_id' })
      if (chatUpdateId) {
        const currentComments = comments[chatUpdateId] || []
        fetchReadStatuses(chatUpdateId, currentComments)
      }
    } catch (error) {}
  }
  
  const handleProjectFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        project_id: projectId, user_id: user.id, file_name: fileToUpload.name,
        file_url: urlData.publicUrl, file_size: fileToUpload.size, file_type: fileExt,
        trade: fileUploadData.trade, floor: fileUploadData.floor, stage: fileUploadData.stage,
        unit: fileUploadData.unit || null, description: fileUploadData.description || null,
      })
      
      showSuccess('הקובץ הועלה בהצלחה!')
      setShowFileUpload(false)
      setFileToUpload(null)
      setFileUploadData({ trade: 'general', floor: 'general', stage: 'planning', unit: '', description: '' })
      if (projectFileInputRef.current) projectFileInputRef.current.value = ''
      fetchProjectFiles()
    } catch (error) {
      showError('שגיאה בהעלאת הקובץ')
    }
    setUploadingFile(false)
  }

  const deleteProjectFile = async (file: any) => {
    if (!confirm(`למחוק את "${file.file_name}"?`)) return
    try {
      const filePath = file.file_url.split('/project-files/')[1]
      if (filePath) await supabase.storage.from('project-files').remove([filePath])
      await supabase.from('project_files').delete().eq('id', file.id)
      showSuccess('הקובץ נמחק')
      if (selectedFile?.id === file.id) setSelectedFile(null)
      fetchProjectFiles()
    } catch (error) {
      showError('שגיאה במחיקה')
    }
  }
  
  const handleFileClick = (file: any) => {
    setSelectedFile(file)
    if (!showFilesPanel) setShowFilesPanel(true)
  }
  
  const toggleFileForUpdate = (file: any) => {
    if (selectedFilesForUpdate.find(f => f.id === file.id)) {
      setSelectedFilesForUpdate(selectedFilesForUpdate.filter(f => f.id !== file.id))
    } else {
      setSelectedFilesForUpdate([...selectedFilesForUpdate, file])
    }
  }
  
  const createInvitation = async () => {
    if (!inviteContact.trim()) return
    setInviting(true)
    
    try {
      const isEmail = inviteContact.includes('@')
      const contact = isEmail ? { email: inviteContact.trim() } : { phone: inviteContact.trim() }
      
      if (contact.phone) {
        const { data: existingUser } = await supabase.from('profiles').select('id').eq('phone', contact.phone).single()
        if (existingUser) {
          await supabase.from('project_members').insert({ project_id: projectId, user_id: existingUser.id, role: inviteRole })
          showSuccess('המשתמש נוסף לפרויקט!')
          setInviteContact('')
          fetchTeamMembers()
          setInviting(false)
          return
        }
      }
      
      const token = generateToken()
      await supabase.from('invitations').insert({ project_id: projectId, invited_by: user?.id, ...contact, role: inviteRole, token })
      setGeneratedLink(`${window.location.origin}/invite/${token}`)
      showSuccess('הזמנה נוצרה!')
      fetchInvitations()
    } catch (error) {
      showError('שגיאה ביצירת הזמנה')
    }
    setInviting(false)
  }

  const copyLink = () => { 
    if (generatedLink) { 
      navigator.clipboard.writeText(generatedLink)
      showSuccess('הלינק הועתק!') 
    } 
  }
  
  const formatPhoneForWhatsApp = (phone: string) => { 
    let cleaned = phone.replace(/\D/g, '')
    if (cleaned.startsWith('0')) cleaned = '972' + cleaned.substring(1)
    return cleaned 
  }
  
  const shareWhatsApp = () => {
    if (!generatedLink || !project) return
    const message = `הוזמנת להצטרף לפרויקט "${project.name}" ב-Projekta!\n\nלחץ על הלינק להצטרפות:\n${generatedLink}`
    const whatsappNumber = inviteContact.includes('@') ? '' : formatPhoneForWhatsApp(inviteContact)
    window.open(whatsappNumber ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
  }
  
  const cancelInvitation = async (invId: string) => { 
    await supabase.from('invitations').delete().eq('id', invId)
    showSuccess('ההזמנה בוטלה')
    fetchInvitations() 
  }
  
  const updateMemberRole = async (memberId: string, newRole: string) => { 
    await supabase.from('project_members').update({ role: newRole }).eq('id', memberId)
    fetchTeamMembers() 
  }
  
  const removeMember = async (memberId: string) => { 
    if (!confirm('להסיר את חבר הצוות?')) return
    await supabase.from('project_members').delete().eq('id', memberId)
    showSuccess('חבר הצוות הוסר')
    fetchTeamMembers() 
  }


  // ===========================================
  // COMPUTED VALUES
  // ===========================================
  
  const filteredUpdates = updates.filter(update => {
    if (statusFilter === 'open' && !(!update.status || update.status === 'open' || update.status === 'in_review')) return false
    if (statusFilter === 'in_progress' && !(update.status === 'approved' || update.status === 'in_progress')) return false
    if (statusFilter === 'completed' && !(update.status === 'completed' || update.status === 'verified')) return false
    if (workTypeFilter !== 'all' && update.work_type !== workTypeFilter) return false
    return true
  })

  const groupedUpdates = CATEGORIES.map(category => ({
    ...category,
    updates: filteredUpdates.filter(u => u.category === category.id)
  })).filter(category => category.updates.length > 0)
  
  const allTeamMemberIds = [project?.owner_id, ...teamMembers.map(m => m.user_id)].filter(Boolean)

  const stats = {
    open: updates.filter(u => !u.status || u.status === 'open' || u.status === 'in_review').length,
    inProgress: updates.filter(u => u.status === 'approved' || u.status === 'in_progress').length,
    completed: updates.filter(u => u.status === 'completed' || u.status === 'verified').length,
    contract: updates.filter(u => u.work_type === 'contract').length,
    addition: updates.filter(u => u.work_type === 'addition').length,
  }
  // ===========================================
  // LOADING STATES
  // ===========================================
  
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>⏳</div>
          <p style={{ color: '#64748b', fontFamily: 'Heebo, sans-serif' }}>טוען...</p>
        </div>
      </div>
    )
  }
  
  if (!project) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>😕</div>
          <p style={{ color: '#64748b', fontFamily: 'Heebo, sans-serif' }}>פרויקט לא נמצא</p>
        </div>
      </div>
    )
  }


  // ===========================================
  // RENDER
  // ===========================================
  
  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700&display=swap');
        * { font-family: 'Heebo', sans-serif; box-sizing: border-box; }
        body { margin: 0; }
  
       @keyframes highlight {
          0% { 
            background-color: transparent; 
            border-color: #e5e7eb;
            transform: scale(1);
          }
          25% { 
            background-color: #DBEAFE; 
            border-color: #3B82F6;
            transform: scale(1.02);
          }
          50% { 
            background-color: #BFDBFE; 
            border-color: #2563EB;
            transform: scale(1.02);
          }
          75% { 
            background-color: #DBEAFE; 
            border-color: #3B82F6;
            transform: scale(1.02);
          }
          100% { 
            background-color: transparent; 
            border-color: #e5e7eb;
            transform: scale(1);
          }
        }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh' }}>
        {/* Sidebar */}
        {!isMobile && <Sidebar projectName={project?.name || 'פרויקט'} />}
        {isMobile && <MobileSidebar projectName={project?.name || 'פרויקט'} currentPage="updates" />}
        
        <div style={{
          ...modernStyles.page,
          marginRight: isMobile ? '0' : '260px',
          flex: 1,
          width: isMobile ? '100%' : 'calc(100% - 260px)',
        }}>
          
          {/* HEADER */}
        <div style={modernStyles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <a href="/projects" style={{ 
              color: 'white', textDecoration: 'none', fontSize: '18px',
              width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.15)',
            }}>←</a>
            <div>
              <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>{project.name}</h1>
              <span style={{ fontSize: '12px', opacity: 0.8 }}>{updates.length} עדכונים • {projectFiles.length} קבצים</span>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setShowFilesPanel(!showFilesPanel)} style={{
              ...modernStyles.buttonSecondary,
              backgroundColor: showFilesPanel ? 'white' : 'rgba(255,255,255,0.15)',
              color: showFilesPanel ? '#6366F1' : 'white',
              border: 'none',
            }}>
              📁 קבצים {projectFiles.length > 0 && `(${projectFiles.length})`}
            </button>
            
            <button onClick={() => setShowTeamModal(true)} style={{
              ...modernStyles.buttonSecondary,
              backgroundColor: 'rgba(255,255,255,0.15)',
              color: 'white',
              border: 'none',
            }}>
              👥 צוות ({teamMembers.length + 1})
            </button>
          </div>
        </div>


        {/* MAIN CONTENT */}
        <div ref={containerRef} style={modernStyles.mainContainer}>
          
          {/* Updates Panel */}
          <div style={{ 
            ...modernStyles.panel, 
            width: showFilesPanel && !isMobile ? `${panelSizes.updates}%` : '100%',
            borderLeft: showFilesPanel && !isMobile ? '1px solid #e5e7eb' : 'none',
          }}>
            <div style={modernStyles.panelContent}>
              <div style={modernStyles.updatesContainer}>
                
                {/* Stats Cards */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  {[
                    { key: 'open', icon: '🔴', color: '#ef4444', bg: '#fef2f2', label: 'פתוחים', count: stats.open },
                    { key: 'in_progress', icon: '🔵', color: '#3b82f6', bg: '#eff6ff', label: 'בעבודה', count: stats.inProgress },
                    { key: 'completed', icon: '✅', color: '#16a34a', bg: '#dcfce7', label: 'הושלמו', count: stats.completed },
                  ].map(stat => (
                    <button key={stat.key} onClick={() => setStatusFilter(statusFilter === stat.key ? 'all' : stat.key as any)} style={{
                      ...modernStyles.statCard,
                      backgroundColor: statusFilter === stat.key ? stat.bg : 'white',
                      borderColor: statusFilter === stat.key ? stat.color : '#e5e7eb',
                      borderWidth: statusFilter === stat.key ? '2px' : '1px',
                      borderStyle: 'solid',
                    }}>
                      <span style={{ fontSize: '24px' }}>{stat.icon}</span>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: stat.color }}>{stat.count}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{stat.label}</div>
                      </div>
                    </button>
                  ))}
                </div>
                
                {/* Filter Chips */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>סינון:</span>
                  <button onClick={() => setWorkTypeFilter(workTypeFilter === 'contract' ? 'all' : 'contract')} style={{
                    ...modernStyles.chip,
                    backgroundColor: workTypeFilter === 'contract' ? '#dbeafe' : '#f1f5f9',
                    color: workTypeFilter === 'contract' ? '#1d4ed8' : '#475569',
                  }}>📋 בחוזה ({stats.contract})</button>
                  <button onClick={() => setWorkTypeFilter(workTypeFilter === 'addition' ? 'all' : 'addition')} style={{
                    ...modernStyles.chip,
                    backgroundColor: workTypeFilter === 'addition' ? '#fef3c7' : '#f1f5f9',
                    color: workTypeFilter === 'addition' ? '#d97706' : '#475569',
                  }}>➕ תוספות ({stats.addition})</button>
                  {(statusFilter !== 'all' || workTypeFilter !== 'all') && (
                    <button onClick={() => { setStatusFilter('all'); setWorkTypeFilter('all') }} style={{
                      ...modernStyles.chip, backgroundColor: '#fef2f2', color: '#ef4444',
                    }}>✕ נקה</button>
                  )}
                </div>

                {/* New Update Form */}
                {canEdit() && (
                  <div style={{ ...modernStyles.card, padding: '16px', marginBottom: '24px' }}>
                    <textarea placeholder="מה קורה בפרויקט?" value={newUpdate} onChange={handleTextChange}
                      style={{ ...modernStyles.input, minHeight: '80px', resize: 'vertical' }} />

                    {imagePreviews.length > 0 && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                        {imagePreviews.map((preview, idx) => (
                          <div key={idx} style={{ position: 'relative' }}>
                            <img src={preview} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }} />
                            <button onClick={() => removeSelectedImage(idx)} style={{ 
                              position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px', 
                              borderRadius: '50%', backgroundColor: '#ef4444', color: 'white', border: '2px solid white', 
                              cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' 
                            }}>×</button>
                          </div>
                        ))}
                      </div>
                    )}

                    {showReview && parsedUpdates.length > 0 && (
                      <div style={{ marginTop: '12px', padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #6366F1' }}>
                        <p style={{ margin: '0 0 12px', fontWeight: '600', color: '#6366F1', fontSize: '13px' }}>🤖 בחר קטגוריה:</p>
                        {parsedUpdates.map((update, idx) => (
                          <div key={idx} style={{ padding: '10px', backgroundColor: 'white', borderRadius: '8px', marginBottom: '8px', border: '1px solid #e5e7eb' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                              <input type="checkbox" checked={update.selected} onChange={() => toggleUpdateSelection(idx)} style={{ accentColor: '#6366F1' }} />
                              <span style={{ fontSize: '13px', color: '#374151' }}>{update.content}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {CATEGORIES.map(cat => (
                                <button key={cat.id} onClick={() => updateParsedCategory(idx, cat)} style={{ 
                                  ...modernStyles.chip,
                                  backgroundColor: update.category.id === cat.id ? '#6366F1' : '#f1f5f9',
                                  color: update.category.id === cat.id ? 'white' : '#475569',
                                  fontSize: '11px', padding: '4px 8px',
                                }}>{cat.icon} {cat.name}</button>
                              ))}
                            </div>
                          </div>
                        ))}
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
                          <button onClick={() => { setShowReview(false); setParsedUpdates([]) }} style={modernStyles.buttonSecondary}>ביטול</button>
                          <button onClick={sendUpdate} disabled={sending} style={{ ...modernStyles.buttonPrimary, backgroundColor: '#10b981' }}>
                            {sending ? '...' : `✓ שלח (${parsedUpdates.filter(u => u.selected).length})`}
                          </button>
                        </div>
                      </div>
                    )}

                    {!showReview && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                        <input type="file" ref={fileInputRef} onChange={handleImagesSelect} accept="image/*" multiple style={{ display: 'none' }} />
                        <button onClick={() => fileInputRef.current?.click()} style={modernStyles.buttonSecondary}>
                          📷 תמונות {selectedImages.length > 0 && `(${selectedImages.length})`}
                        </button>
                        <button onClick={() => setShowFileSelector(!showFileSelector)} style={{
                          ...modernStyles.buttonSecondary,
                          backgroundColor: showFileSelector ? '#eff6ff' : 'white',
                        }}>📎 צרף קובץ {selectedFilesForUpdate.length > 0 && `(${selectedFilesForUpdate.length})`}</button>
                        <button onClick={handleSubmit} disabled={!newUpdate.trim() && selectedImages.length === 0} style={{
                          ...modernStyles.buttonPrimary, marginRight: 'auto',
                          opacity: (newUpdate.trim() || selectedImages.length > 0) ? 1 : 0.5,
                        }}>שלח עדכון</button>
                      </div>
                    )}

                    {showFileSelector && projectFiles.length > 0 && (
                      <div style={{ marginTop: '12px', padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', maxHeight: '200px', overflow: 'auto' }}>
                        <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#64748b', fontWeight: '500' }}>בחר קבצים לתיוג:</p>
                        {projectFiles.map(file => (
                          <div key={file.id} onClick={() => toggleFileForUpdate(file)} style={{ 
                            display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '10px', 
                            cursor: 'pointer', backgroundColor: selectedFilesForUpdate.find(f => f.id === file.id) ? '#eff6ff' : 'white', 
                            marginBottom: '6px', border: selectedFilesForUpdate.find(f => f.id === file.id) ? '1px solid #6366F1' : '1px solid #e5e7eb' 
                          }}>
                            <input type="checkbox" checked={!!selectedFilesForUpdate.find(f => f.id === file.id)} readOnly style={{ accentColor: '#6366F1' }} />
                            <span style={{ fontSize: '18px' }}>{getFileIcon(file.file_type)}</span>
                            <span style={{ fontSize: '13px', fontWeight: '500' }}>{file.file_name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Updates List */}
                {groupedUpdates.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 40px', color: '#64748b' }}>
                    <p style={{ fontSize: '48px', marginBottom: '12px' }}>📋</p>
                    <p style={{ fontSize: '15px', fontWeight: '500' }}>
                      {statusFilter !== 'all' || workTypeFilter !== 'all' ? 'אין עדכונים בסינון הנוכחי' : 'אין עדכונים עדיין'}
                    </p>
                  </div>
                ) : (
                  groupedUpdates.map(category => (
                    <div key={category.id} style={{ marginBottom: '28px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <span style={{ fontSize: '22px' }}>{category.icon}</span>
                        <span style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>{category.name}</span>
                        <span style={{ ...modernStyles.badge, backgroundColor: '#eff6ff', color: '#6366F1' }}>{category.updates.length}</span>
                      </div>
                      
                      {category.updates.map(update => {
                        const updateComments = comments[update.id] || []
                        const updateImages = images[update.id] || []
                        const userName = profiles[update.user_id]?.full_name || 'משתמש'
                        const taggedFiles = update.tagged_files ? projectFiles.filter(f => update.tagged_files.includes(f.id)) : []
                        const isCompleted = update.status === 'completed' || update.status === 'verified'

                        return (
                          <div key={update.id} id={`update-${update.id}`} style={{ ...modernStyles.updateCard, opacity: isCompleted ? 0.7 : 1 }}>
                            <div style={modernStyles.updateCardHeader}>
                              <StatusBadge status={update.status || 'open'} size="small" />
                              <div style={{ position: 'relative' }}>
                                <WorkTypeBadge workType={update.work_type || 'pending'} size="small"
                                  onClick={() => canEdit() && setWorkTypeMenuUpdateId(workTypeMenuUpdateId === update.id ? null : update.id)} />
                                {workTypeMenuUpdateId === update.id && (
                                  <>
                                    <div onClick={() => setWorkTypeMenuUpdateId(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }} />
                                    <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: '1px solid #e5e7eb', zIndex: 100, minWidth: '130px', overflow: 'hidden' }}>
                                      {Object.entries(WORK_TYPES).map(([key, val]) => (
                                        <button key={key} onClick={() => updateWorkType(update.id, key as WorkTypeId)} style={{
                                          width: '100%', padding: '8px 12px', border: 'none', cursor: 'pointer',
                                          backgroundColor: update.work_type === key ? val.bgColor : 'white',
                                          display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontFamily: 'Heebo, sans-serif',
                                        }}><span>{val.icon}</span><span>{val.name}</span></button>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                              <span style={{ marginRight: 'auto', fontSize: '11px', color: '#94a3b8' }}>{userName} • {new Date(update.created_at).toLocaleDateString('he-IL')}</span>
                            </div>

                            <div style={modernStyles.updateCardBody}>
                              <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', color: '#374151', textDecoration: isCompleted ? 'line-through' : 'none' }}>{update.content}</p>
                              
                              {taggedFiles.length > 0 && (
                                <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                                  {taggedFiles.map(file => (
                                    <div key={file.id} onClick={() => handleFileClick(file)} style={{ 
                                      display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#f1f5f9', 
                                      padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '500' 
                                    }}><span>{getFileIcon(file.file_type)}</span><span>{file.file_name}</span></div>
                                  ))}
                                </div>
                              )}

                              {updateImages.filter(img => !img.comment_id).length > 0 && (
                                <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                                  {updateImages.filter(img => !img.comment_id).map(img => (
                                    <img key={img.id} src={img.url} onClick={() => setViewingImage(img.url)} 
                                      style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer' }} />
                                  ))}
                                </div>
                              )}
                            </div>

                            <div style={modernStyles.updateCardFooter}>
                              <button onClick={() => openChat(update.id, update.content)} style={{ 
                                ...modernStyles.buttonPrimary, background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)', padding: '6px 12px', fontSize: '12px',
                              }}>💬 {updateComments.filter(c => !c.deleted_at).length || 'דיון'}</button>
                              
                              {canEdit() && !isCompleted && (
                                <button onClick={() => updateStatus(update.id, 'completed')} style={{ ...modernStyles.chip, backgroundColor: '#dcfce7', color: '#16a34a' }}>✓ סיום</button>
                              )}
                              {canEdit() && isCompleted && (
                                <button onClick={() => updateStatus(update.id, 'open')} style={{ ...modernStyles.chip, backgroundColor: '#fef3c7', color: '#d97706' }}>↩ פתח</button>
                              )}
                              {canEdit() && (
                                <button onClick={() => deleteUpdate(update.id)} style={{ ...modernStyles.buttonGhost, marginRight: 'auto', color: '#ef4444' }}>🗑️</button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Resizer */}
          {showFilesPanel && !isMobile && (
            <div onMouseDown={handleMouseDown} style={{ ...modernStyles.resizer, backgroundColor: isResizing ? '#6366F1' : '#e5e7eb' }}>
              <div style={{ width: '4px', height: '40px', backgroundColor: isResizing ? 'white' : '#94a3b8', borderRadius: '2px', opacity: 0.5 }} />
            </div>
          )}

          {/* Files Panel - Desktop */}
          {showFilesPanel && !isMobile && (
            <div style={{ ...modernStyles.panel, width: `${panelSizes.files}%` }}>
              <FilesPanel
                  projectFiles={projectFiles}
                  onClose={() => setShowFilesPanel(false)}
                  onUpload={() => projectFileInputRef.current?.click()}
                  onFileSelect={(file: any) => { handleFileClick(file); setChatUpdateId(null) }}
                  onDelete={deleteProjectFile}
                  onPreview={(file: any) => setPreviewFile(file)}  // ← הוסף שורה זו!
                />
            </div>
          )}
        </div>


        {/* ============================================= */}
        {/* MODALS */}
        {/* ============================================= */}

        {/* Mobile Files Panel */}
        {showFilesPanel && isMobile && (
          <MobileFilesPanel
              projectFiles={projectFiles}
              onClose={() => setShowFilesPanel(false)}
              onUpload={() => projectFileInputRef.current?.click()}
              onPreview={(file: any) => { handleFileClick(file); setChatUpdateId(null) }}
              onDelete={deleteProjectFile}
            />
        )}

        {/* Hidden File Input */}
        <input type="file" ref={projectFileInputRef} onChange={handleProjectFileSelect} style={{ display: 'none' }} />

        {/* WhatsApp Chat */}
        {chatUpdateId && (
          <WhatsAppChat
            messages={comments[chatUpdateId] || []}
            currentUserId={user?.id || ''}
            profiles={profiles}
            images={images[chatUpdateId] || []}
            reactions={reactions[chatUpdateId] || []}
            readStatuses={readStatuses[chatUpdateId] || []}
            teamMemberIds={allTeamMemberIds}
            projectFiles={projectFiles}
            onSendMessage={sendChatMessage}
            onDeleteMessage={deleteChatMessage}
            onAddReaction={addReaction}
            onRemoveReaction={removeReaction}
            onMarkAsRead={markMessagesAsRead}
            onFileClick={(file: any) => { handleFileClick(file); setChatUpdateId(null) }}
            onClose={() => setChatUpdateId(null)}
            updateContent={chatUpdateContent}
            isMobile={isMobile}
          />
        )}

        {/* File Upload Modal */}
        {showFileUpload && (
          <div onClick={() => setShowFileUpload(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ ...modernStyles.card, width: '90%', maxWidth: '450px', padding: '24px' }}>
              <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px', fontWeight: '600' }}>📤 העלאת קובץ</h2>
              
              <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '32px' }}>{getFileIcon(fileToUpload?.name.split('.').pop() || '')}</span>
                <div>
                  <p style={{ margin: 0, fontWeight: '600', fontSize: '14px' }}>{fileToUpload?.name}</p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>{formatFileSize(fileToUpload?.size || 0)}</p>
                </div>
              </div>
              
              {[
                { key: 'stage', label: 'שלב', items: STAGES },
                { key: 'floor', label: 'קומה', items: FLOORS.slice(0, 5) },
                { key: 'trade', label: 'מקצוע', items: TRADES.slice(0, 5) },
              ].map(section => (
                <div key={section.key} style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '13px' }}>{section.label}</label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {section.items.map(item => (
                      <button key={item.id} onClick={() => setFileUploadData({ ...fileUploadData, [section.key]: item.id })} style={{ 
                        ...modernStyles.chip, 
                        backgroundColor: fileUploadData[section.key as keyof typeof fileUploadData] === item.id ? '#6366F1' : '#f1f5f9',
                        color: fileUploadData[section.key as keyof typeof fileUploadData] === item.id ? 'white' : '#475569',
                      }}>{item.icon} {item.name}</button>
                    ))}
                  </div>
                </div>
              ))}
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowFileUpload(false)} style={modernStyles.buttonSecondary}>ביטול</button>
                <button onClick={uploadProjectFile} disabled={uploadingFile} style={{ ...modernStyles.buttonPrimary, backgroundColor: '#10b981' }}>
                  {uploadingFile ? 'מעלה...' : '✓ העלה'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {previewFile && (
          <div onClick={() => setPreviewFile(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div style={{ color: 'white', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '16px', fontWeight: '500' }}>{previewFile.file_name}</span>
              <a href={previewFile.file_url} download target="_blank" onClick={(e) => e.stopPropagation()} style={{ ...modernStyles.buttonPrimary, textDecoration: 'none' }}>⬇️ הורד</a>
              <button onClick={() => setPreviewFile(null)} style={{ ...modernStyles.buttonPrimary, backgroundColor: '#ef4444' }}>✕ סגור</button>
            </div>
            <div onClick={(e) => e.stopPropagation()} style={{ width: '90%', height: '80%', backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden' }}>
              {['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(previewFile.file_type?.toLowerCase()) ? (
                <img src={previewFile.file_url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : previewFile.file_type?.toLowerCase() === 'pdf' ? (
                <iframe src={previewFile.file_url} style={{ width: '100%', height: '100%', border: 'none' }} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '20px' }}>
                  <span style={{ fontSize: '64px' }}>{getFileIcon(previewFile.file_type)}</span>
                  <p style={{ color: '#64748b' }}>אין תצוגה מקדימה</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Team Modal */}
        {showTeamModal && (
          <div onClick={() => { setShowTeamModal(false); setGeneratedLink(null) }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ ...modernStyles.card, width: '90%', maxWidth: '450px', maxHeight: '80vh', overflow: 'auto', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>👥 ניהול צוות</h2>
                <button onClick={() => { setShowTeamModal(false); setGeneratedLink(null) }} style={modernStyles.buttonGhost}>×</button>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px', color: '#64748b', fontSize: '12px', fontWeight: '600' }}>בעלים</h4>
                <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px' }}>🔑</span>
                  <span style={{ flex: 1, fontWeight: '500', fontSize: '14px' }}>{profiles[project.owner_id]?.full_name || user?.email}</span>
                </div>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px', color: '#64748b', fontSize: '12px', fontWeight: '600' }}>חברי צוות ({teamMembers.length})</h4>
                {teamMembers.length === 0 ? (
                  <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px', fontSize: '13px' }}>אין חברי צוות</p>
                ) : (
                  teamMembers.map((member) => (
                    <div key={member.id} style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '18px' }}>{ROLES[member.role]?.icon}</span>
                      <span style={{ flex: 1, fontWeight: '500', fontSize: '14px' }}>{profiles[member.user_id]?.full_name || 'משתמש'}</span>
                      <select value={member.role} onChange={(e) => updateMemberRole(member.id, e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e5e7eb', fontSize: '12px' }}>
                        <option value="admin">👑 מנהל</option>
                        <option value="member">👷 חבר</option>
                        <option value="viewer">👁️ צופה</option>
                      </select>
                      <button onClick={() => removeMember(member.id)} style={{ ...modernStyles.chip, backgroundColor: '#fef2f2', color: '#ef4444' }}>הסר</button>
                    </div>
                  ))
                )}
              </div>
              
              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '10px' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: '600' }}>➕ הזמן לפרויקט</h4>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <input type="text" placeholder="טלפון או אימייל..." value={inviteContact} onChange={(e) => { setInviteContact(e.target.value); setGeneratedLink(null) }} style={{ ...modernStyles.input, flex: 1, minWidth: '150px' }} />
                  <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} style={{ padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px' }}>
                    <option value="admin">👑 מנהל</option>
                    <option value="member">👷 חבר</option>
                    <option value="viewer">👁️ צופה</option>
                  </select>
                  <button onClick={createInvitation} disabled={!inviteContact.trim() || inviting} style={{ ...modernStyles.buttonPrimary, opacity: inviteContact.trim() ? 1 : 0.5 }}>
                    {inviting ? '...' : 'הזמן'}
                  </button>
                </div>
                
                {generatedLink && (
                  <div style={{ marginTop: '14px', padding: '14px', backgroundColor: 'white', borderRadius: '8px', border: '2px solid #6366F1' }}>
                    <p style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: '600', color: '#6366F1' }}>🔗 לינק נוצר!</p>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                      <input type="text" value={generatedLink} readOnly style={{ ...modernStyles.input, flex: 1, fontSize: '11px', direction: 'ltr' }} />
                      <button onClick={copyLink} style={modernStyles.buttonSecondary}>📋</button>
                    </div>
                    <button onClick={shareWhatsApp} style={{ ...modernStyles.buttonPrimary, width: '100%', backgroundColor: '#25D366' }}>📱 שלח ב-WhatsApp</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Image Viewer */}
        {viewingImage && (
          <div onClick={() => setViewingImage(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, cursor: 'pointer' }}>
            <img src={viewingImage} style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: '8px' }} />
          </div>
        )}

      </div>
      </div>
    </>
  )
}
