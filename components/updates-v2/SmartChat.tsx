'use client'

// ===========================================
// Projekta Smart Chat — Premium UI
// ===========================================
// נתיב: components/updates-v2/SmartChat.tsx
// ===========================================

import { useState, useRef, useEffect, useCallback } from 'react'
import { useChat } from '@/lib/updates-v2/useChat'
import { useTasks } from '@/lib/updates-v2/useTasks'
import { useUnreadCount } from '@/lib/updates-v2/useUnreadCount'
import { useTypingIndicator } from '@/lib/updates-v2/useTypingIndicator'
import type { ChatMessageRow, MiniProfile } from '@/lib/updates-v2/types'
import { TaskBoardPanel, DecisionTimelinePanel, SearchPanel } from './ChatPanels'
import { createClient } from '@/lib/supabase'

// ====== DESIGN TOKENS ======

const C = {
  // Brand
  indigo: '#4F46E5', indigoLight: '#6366F1', indigoDark: '#4338CA',
  indigoPale: '#EEF2FF', indigoGlow: 'rgba(99,102,241,0.15)',
  teal: '#0D9488', tealLight: '#14B8A6', tealPale: '#F0FDFA',
  gold: '#B45309', goldLight: '#D97706', goldPale: '#FEF3C7',
  amber: '#F59E0B',
  // UI
  slate900: '#0F172A', slate800: '#1E293B', slate700: '#334155',
  slate600: '#475569', slate500: '#64748B', slate400: '#94A3B8',
  slate300: '#CBD5E1', slate200: '#E2E8F0', slate100: '#F1F5F9', slate50: '#F8FAFC',
  white: '#FFFFFF',
  green: '#059669', greenBg: '#ECFDF5',
  red: '#DC2626', redBg: '#FEF2F2',
}

// User avatar colors - each user gets a consistent color
const USER_COLORS = [
  { bg: 'linear-gradient(135deg, #6366F1, #818CF8)', text: '#fff' },
  { bg: 'linear-gradient(135deg, #0D9488, #14B8A6)', text: '#fff' },
  { bg: 'linear-gradient(135deg, #D97706, #F59E0B)', text: '#fff' },
  { bg: 'linear-gradient(135deg, #DC2626, #EF4444)', text: '#fff' },
  { bg: 'linear-gradient(135deg, #7C3AED, #8B5CF6)', text: '#fff' },
  { bg: 'linear-gradient(135deg, #2563EB, #3B82F6)', text: '#fff' },
  { bg: 'linear-gradient(135deg, #DB2777, #EC4899)', text: '#fff' },
  { bg: 'linear-gradient(135deg, #059669, #10B981)', text: '#fff' },
]

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '🙏', '✅']

// ====== HELPERS ======

function getUserColorIndex(userId: string): number {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) % USER_COLORS.length
}

function getInitials(name: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(' ')
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return parts[0].slice(0, 2).toUpperCase()
  }
  if (email) {
    const local = email.split('@')[0]
    return local.slice(0, 2).toUpperCase()
  }
  return '👤'
}

function getAvatarColor(userId: string): string {
  const flatColors = ['#6366F1', '#0D9488', '#D97706', '#DC2626', '#7C3AED', '#2563EB', '#DB2777', '#059669']
  const idx = getUserColorIndex(userId)
  return flatColors[idx % flatColors.length]
}

// ====== PROPS ======

interface SmartChatProps {
  projectId: string
  projectName: string
  currentUserId: string
  isMobile?: boolean
}

// ====== MAIN COMPONENT ======

export default function SmartChat({ projectId, projectName, currentUserId, isMobile = false }: SmartChatProps) {
  const {
    messages, profiles, reactions, messageReads, attachments, loading,
    hasMore, loadMore, sendMessage, uploadAndSend, sendVoiceMessage, forwardMessage,
    deleteMessage, addReaction, removeReaction, markAsRead,
  } = useChat(projectId)

  const {
    tasks, decisions, taskStats, loading: tasksLoading,
    createTask, updateTaskStatus, updateTask, deleteTask,
    createDecision, searchMessages,
  } = useTasks(projectId)

  const { markAllRead } = useUnreadCount(projectId)

  const myName = profiles[currentUserId]?.full_name || 'משתמש'
  const { typingUsers, sendTyping, sendStopTyping } = useTypingIndicator(projectId, currentUserId, myName)

  // --- Idle detection: 60s no interaction = "away" ---
  const isActiveRef = useRef(true)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastMessageCountRef = useRef(messages.length)

  const resetIdleTimer = useCallback(() => {
    // User interacted — mark as active
    if (!isActiveRef.current) {
      // Was idle, now back — mark all as read
      isActiveRef.current = true
      markAllRead()
    }
    isActiveRef.current = true

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => {
      isActiveRef.current = false
    }, 60000) // 60 שניות
  }, [markAllRead])

  // Listen for user activity
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove']
    events.forEach(e => window.addEventListener(e, resetIdleTimer, { passive: true }))
    resetIdleTimer() // start timer

    return () => {
      events.forEach(e => window.removeEventListener(e, resetIdleTimer))
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [resetIdleTimer])

  // Also treat tab visibility as activity signal
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        resetIdleTimer()
      } else {
        // Tab hidden = immediately idle
        isActiveRef.current = false
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [resetIdleTimer])

  // Mark as read only when active
  useEffect(() => {
    if (!currentUserId || messages.length === 0) return

    // Only mark as read if user is actively using the chat
    if (isActiveRef.current) {
      const hasUnreadFromOthers = messages.some(m => m.user_id !== currentUserId)
      if (hasUnreadFromOthers) {
        markAllRead()
      }
    }

    lastMessageCountRef.current = messages.length
  }, [messages, currentUserId, markAllRead])

  const [inputText, setInputText] = useState('')
  const [replyTo, setReplyTo] = useState<ChatMessageRow | null>(null)
  const [activeReactionMsg, setActiveReactionMsg] = useState<string | null>(null)
  const [showScrollDown, setShowScrollDown] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const [activePanel, setActivePanel] = useState<'tasks' | 'decisions' | 'search' | null>(null)
  const [taskFromMsg, setTaskFromMsg] = useState<ChatMessageRow | null>(null)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [attachMenu, setAttachMenu] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [forwardMsg, setForwardMsg] = useState<ChatMessageRow | null>(null)
  const [forwardProjects, setForwardProjects] = useState<{ id: string; name: string }[]>([])
  const [showWaSettings, setShowWaSettings] = useState(false)
  const [waEnabled, setWaEnabled] = useState(false)
  const [waLoading, setWaLoading] = useState(true)
  const [waRecipients, setWaRecipients] = useState<{ user_id: string; phone_number: string; full_name: string }[]>([])
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const cameraVideoRef = useRef<HTMLVideoElement>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)

  const chatRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const isAtBottom = useRef(true)
  const supabaseRef = useRef(createClient())

  // --- WhatsApp status ---
  useEffect(() => {
    const fetchWaStatus = async () => {
      const sb = supabaseRef.current
      const { data } = await sb
        .from('v2_wa_project_settings')
        .select('is_enabled')
        .eq('project_id', projectId)
        .single()
      setWaEnabled(data?.is_enabled || false)
      setWaLoading(false)
    }
    fetchWaStatus()
  }, [projectId])

  const fetchWaRecipients = async () => {
    const sb = supabaseRef.current
    const { data } = await sb.rpc('v2_wa_get_recipients', {
      p_project_id: projectId,
    })
    setWaRecipients(data || [])
  }

  const toggleWa = async () => {
    const newState = !waEnabled
    setWaEnabled(newState)
    const sb = supabaseRef.current
    await sb.rpc('v2_wa_toggle_project', {
      p_project_id: projectId,
      p_enabled: newState,
    })
    if (newState) fetchWaRecipients()
  }

  // --- Auto-scroll ---
  useEffect(() => {
    if (isAtBottom.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleScroll = useCallback(() => {
    if (!chatRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = chatRef.current
    isAtBottom.current = scrollHeight - scrollTop - clientHeight < 80
    setShowScrollDown(!isAtBottom.current)
    if (scrollTop < 50 && hasMore) loadMore()
  }, [hasMore, loadMore])

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Close reaction popup on outside click
  useEffect(() => {
    if (!activeReactionMsg) return
    const close = () => setActiveReactionMsg(null)
    const timer = setTimeout(() => document.addEventListener('click', close), 50)
    return () => { clearTimeout(timer); document.removeEventListener('click', close) }
  }, [activeReactionMsg])

  // Close attach menu on outside click
  useEffect(() => {
    if (!attachMenu) return
    const close = () => setAttachMenu(false)
    const timer = setTimeout(() => document.addEventListener('click', close), 50)
    return () => { clearTimeout(timer); document.removeEventListener('click', close) }
  }, [attachMenu])

  // --- Send ---
  const handleSend = async () => {
    if (!inputText.trim() && pendingFiles.length === 0) return
    const text = inputText.trim()
    setInputText('')
    setReplyTo(null)
    sendStopTyping()
    inputRef.current?.focus()

    if (pendingFiles.length > 0) {
      setUploading(true)
      await uploadAndSend(pendingFiles, text || undefined, replyTo?.id)
      setPendingFiles([])
      setPreviewUrls([])
      setUploading(false)
    } else {
      await sendMessage(text, replyTo?.id)
    }
  }

  // --- File Size Limits ---
  const SIZE_LIMITS: Record<string, number> = {
    image: 5 * 1024 * 1024,    // 5MB
    document: 10 * 1024 * 1024, // 10MB
    video: 25 * 1024 * 1024,    // 25MB
  }

  const getFileCategory = (file: File): string => {
    if (file.type.startsWith('image/')) return 'image'
    if (file.type.startsWith('video/')) return 'video'
    return 'document'
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + 'B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + 'KB'
    return (bytes / (1024 * 1024)).toFixed(1) + 'MB'
  }

  // --- Image Compression ---
  const compressImage = (file: File, maxWidth = 1920, quality = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      // Skip if already small enough (under 500KB)
      if (file.size < 500 * 1024) { resolve(file); return }

      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const canvas = document.createElement('canvas')
        let { width, height } = img

        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) { resolve(file); return }

        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob((blob) => {
          if (!blob || blob.size >= file.size) { resolve(file); return }
          const compressed = new File([blob], file.name, { type: 'image/jpeg' })
          resolve(compressed)
        }, 'image/jpeg', quality)
      }
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
      img.src = url
    })
  }

  // --- File Handling ---
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setFileError(null)
    setAttachMenu(false)

    const validFiles: File[] = []

    for (const file of files) {
      const category = getFileCategory(file)
      const limit = SIZE_LIMITS[category]

      if (file.size > limit) {
        setFileError(`${file.name} גדול מדי (${formatFileSize(file.size)}). מקסימום: ${formatFileSize(limit)}`)
        continue
      }

      // Compress images
      if (category === 'image') {
        const compressed = await compressImage(file)
        validFiles.push(compressed)
      } else {
        validFiles.push(file)
      }
    }

    if (validFiles.length > 0) {
      setPendingFiles(prev => [...prev, ...validFiles])
      const urls = validFiles.map(f => URL.createObjectURL(f))
      setPreviewUrls(prev => [...prev, ...urls])
    }

    e.target.value = ''
  }

  const removePendingFile = (index: number) => {
    URL.revokeObjectURL(previewUrls[index])
    setPendingFiles(prev => prev.filter((_, i) => i !== index))
    setPreviewUrls(prev => prev.filter((_, i) => i !== index))
    if (pendingFiles.length <= 1) setFileError(null)
  }

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items)
    const imageItems = items.filter(item => item.type.startsWith('image/'))
    if (imageItems.length === 0) return

    e.preventDefault()
    setFileError(null)
    for (const item of imageItems) {
      const file = item.getAsFile()
      if (!file) continue
      const named = new File([file], `paste-${Date.now()}.png`, { type: file.type })
      const compressed = await compressImage(named)
      setPendingFiles(prev => [...prev, compressed])
      setPreviewUrls(prev => [...prev, URL.createObjectURL(compressed)])
    }
  }

  // --- Camera ---
  const openCamera = async () => {
    setAttachMenu(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      })
      cameraStreamRef.current = stream
      setShowCamera(true)
      // Wait for video element to mount
      setTimeout(() => {
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream
          cameraVideoRef.current.play()
        }
      }, 100)
    } catch (err) {
      setFileError('לא ניתן לגשת למצלמה. בדוק הרשאות.')
    }
  }

  const capturePhoto = async () => {
    if (!cameraVideoRef.current) return
    const video = cameraVideoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0)
    closeCamera()

    canvas.toBlob(async (blob) => {
      if (!blob) return
      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' })
      const compressed = await compressImage(file)
      setPendingFiles(prev => [...prev, compressed])
      setPreviewUrls(prev => [...prev, URL.createObjectURL(compressed)])
    }, 'image/jpeg', 0.9)
  }

  const closeCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop())
      cameraStreamRef.current = null
    }
    setShowCamera(false)
  }

  // --- Voice Recording ---
  const recordingTimeRef = useRef(0)

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/mp4',
      })
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType })
        const duration = recordingTimeRef.current
        setRecordingTime(0)
        recordingTimeRef.current = 0
        if (duration > 0) {
          setUploading(true)
          await sendVoiceMessage(audioBlob, duration)
          setUploading(false)
        }
      }

      mediaRecorder.start(250)
      mediaRecorderRef.current = mediaRecorder
      setIsRecording(true)
      setRecordingTime(0)
      recordingTimeRef.current = 0

      recordingTimerRef.current = setInterval(() => {
        recordingTimeRef.current += 1
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (err) {
      setFileError('לא ניתן לגשת למיקרופון. בדוק הרשאות.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    mediaRecorderRef.current = null
    setIsRecording(false)
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.ondataavailable = null
      mediaRecorderRef.current.onstop = null
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      const stream = mediaRecorderRef.current.stream
      stream?.getTracks().forEach(t => t.stop())
    }
    mediaRecorderRef.current = null
    audioChunksRef.current = []
    setIsRecording(false)
    setRecordingTime(0)
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
  }

  const formatRecordingTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // --- Forward ---
  const openForwardModal = async (msg: ChatMessageRow) => {
    setForwardMsg(msg)
    // Fetch user's projects
    try {
      const { data: { user } } = await (await import('@/lib/supabase')).createClient().auth.getUser()
      if (!user) return
      const { data } = await (await import('@/lib/supabase')).createClient()
        .from('project_members')
        .select('project_id, projects(id, name)')
        .eq('user_id', user.id)
      if (data) {
        const projects = data
          .map((d: any) => ({ id: d.projects?.id, name: d.projects?.name }))
          .filter((p: any) => p.id && p.id !== projectId)
        setForwardProjects(projects)
      }
    } catch {
      // silent
    }
  }

  const handleForward = async (targetProjectId: string, targetProjectName: string) => {
    if (!forwardMsg) return
    const msgAttachments = attachments[forwardMsg.id]
    await forwardMessage(forwardMsg, targetProjectId, targetProjectName, projectName || 'פרויקט', msgAttachments)
    setForwardMsg(null)
  }

  // --- Helpers ---
  const getProfile = (userId: string): MiniProfile =>
    profiles[userId] || { id: userId, full_name: null, avatar_url: null, email: null }

  const getDisplayName = (userId: string): string => {
    if (userId === currentUserId) return 'אני'
    const p = getProfile(userId)
    return p.full_name || p.email?.split('@')[0] || 'משתמש'
  }

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })

  // Read receipt check marks
  // ✓ gray = sent/delivered, ✓✓ gray = on server, ✓✓ blue = read by someone
  const getCheckMark = (msgId: string): { symbol: string; color: string } => {
    const readers = messageReads[msgId] || []
    const readByOthers = readers.filter(uid => uid !== currentUserId).length > 0
    if (readByOthers) {
      return { symbol: '✓✓', color: '#60A5FA' } // blue — read
    }
    return { symbol: '✓✓', color: 'rgba(255,255,255,.5)' } // white/gray — delivered
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return 'היום'
    if (d.toDateString() === yesterday.toDateString()) return 'אתמול'
    return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  // Group by date
  const groupedMessages: { date: string; messages: ChatMessageRow[] }[] = []
  let curDate = ''
  messages.forEach(msg => {
    const d = formatDate(msg.created_at)
    if (d !== curDate) { curDate = d; groupedMessages.push({ date: d, messages: [] }) }
    groupedMessages[groupedMessages.length - 1].messages.push(msg)
  })

  const memberCount = Object.keys(profiles).length || 1

  // ====== RENDER ======

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%', width: '100%',
      backgroundColor: '#EAEFF5',
      fontFamily: "'Heebo', sans-serif", direction: 'rtl',
      position: 'relative', overflow: 'hidden',
      borderRadius: isMobile ? 0 : '16px',
      boxShadow: isMobile ? 'none' : '0 4px 40px rgba(0,0,0,0.08)',
      margin: isMobile ? 0 : '16px 0',
    }}>

      {/* ============ HEADER ============ */}
      <div style={{
        background: `linear-gradient(135deg, ${C.indigo} 0%, ${C.indigoDark} 50%, #3730A3 100%)`,
        padding: isMobile ? '14px 16px' : '16px 24px',
        display: 'flex', alignItems: 'center', gap: 14,
        color: '#fff',
        boxShadow: '0 4px 30px rgba(79,70,229,.25)',
        position: 'relative', zIndex: 10, flexShrink: 0,
        borderRadius: isMobile ? 0 : '16px 16px 0 0',
      }}>
        {/* Project icon */}
        <div style={{
          width: 44, height: 44, borderRadius: 13,
          background: 'rgba(255,255,255,.12)',
          backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, border: '1px solid rgba(255,255,255,.08)',
        }}>🏗️</div>

        {/* Project info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 16, fontWeight: 700, letterSpacing: '-0.3px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{projectName}</div>
          <div style={{
            fontSize: 12, color: 'rgba(255,255,255,.55)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              backgroundColor: '#34D399', display: 'inline-block',
              boxShadow: '0 0 6px rgba(52,211,153,.5)',
            }} />
            {memberCount} משתתפים • צ׳אט פעיל
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6 }}>
          {/* WhatsApp toggle */}
          <button
            onClick={() => { setShowWaSettings(!showWaSettings); if (!showWaSettings) fetchWaRecipients() }}
            style={{
              width: 36, height: 36, borderRadius: 10,
              border: '1px solid rgba(255,255,255,.1)',
              backgroundColor: showWaSettings ? 'rgba(255,255,255,.22)' : waEnabled ? 'rgba(37,211,102,.25)' : 'rgba(255,255,255,.08)',
              color: '#fff', fontSize: 16, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all .2s', position: 'relative',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            {waEnabled && !waLoading && (
              <span style={{
                position: 'absolute', top: -3, left: -3,
                width: 10, height: 10, borderRadius: '50%',
                backgroundColor: '#25D366',
                border: '2px solid rgba(79,70,229,0.8)',
              }} />
            )}
          </button>
          {([
            { icon: '🔍', panel: 'search' as const, badge: 0 },
            { icon: '📋', panel: 'tasks' as const, badge: taskStats.total - taskStats.done },
            { icon: '📌', panel: 'decisions' as const, badge: decisions.length },
          ]).map((btn) => (
            <button key={btn.panel}
              onClick={() => setActivePanel(activePanel === btn.panel ? null : btn.panel)}
              style={{
                width: 36, height: 36, borderRadius: 10,
                border: '1px solid rgba(255,255,255,.1)',
                backgroundColor: activePanel === btn.panel ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.08)',
                color: '#fff', fontSize: 16, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all .2s', position: 'relative',
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,.18)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = activePanel === btn.panel ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.08)'}
            >
              {btn.icon}
              {btn.badge > 0 && (
                <span style={{
                  position: 'absolute', top: -4, left: -4,
                  minWidth: 18, height: 18, borderRadius: 9,
                  backgroundColor: '#EF4444', color: '#fff',
                  fontSize: 10, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px', border: '2px solid rgba(79,70,229,0.8)',
                }}>{btn.badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ============ WHATSAPP SETTINGS PANEL ============ */}
      {showWaSettings && (
        <div style={{
          padding: '16px 20px',
          background: 'linear-gradient(135deg, #F0FDF4, #ECFDF5)',
          borderBottom: '1px solid rgba(37,211,102,.15)',
          flexShrink: 0,
          animation: 'fadeIn .2s ease',
        }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#166534' }}>
                סנכרון WhatsApp
              </span>
            </div>
            <button
              onClick={() => setShowWaSettings(false)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 18, color: '#6B7280', padding: '2px 6px',
              }}
            >✕</button>
          </div>

          {/* Toggle */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            backgroundColor: 'white', borderRadius: 10, padding: '12px 16px',
            boxShadow: '0 1px 3px rgba(0,0,0,.06)',
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13.5, color: '#1F2937' }}>
                {waEnabled ? 'סנכרון פעיל' : 'סנכרון כבוי'}
              </div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                {waEnabled
                  ? 'הודעות נשלחות ומתקבלות דרך WhatsApp'
                  : 'הפעל כדי לסנכרן הודעות עם WhatsApp'
                }
              </div>
            </div>
            {/* Toggle switch */}
            <button
              onClick={toggleWa}
              disabled={waLoading}
              style={{
                width: 48, height: 26, borderRadius: 13,
                backgroundColor: waEnabled ? '#25D366' : '#D1D5DB',
                border: 'none', cursor: waLoading ? 'not-allowed' : 'pointer',
                position: 'relative', transition: 'background-color .2s',
                flexShrink: 0,
              }}
            >
              <span style={{
                position: 'absolute',
                top: 3, 
                right: waEnabled ? 3 : 'auto',
                left: waEnabled ? 'auto' : 3,
                width: 20, height: 20, borderRadius: '50%',
                backgroundColor: 'white',
                boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                transition: 'all .2s',
              }} />
            </button>
          </div>

          {/* Recipients list */}
          {waEnabled && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6, fontWeight: 500 }}>
                חברי פרויקט עם WhatsApp מחובר:
              </div>
              {waRecipients.length === 0 ? (
                <div style={{
                  fontSize: 12, color: '#9CA3AF', fontStyle: 'italic',
                  backgroundColor: 'white', borderRadius: 8, padding: '10px 14px',
                }}>
                  אין חברי פרויקט עם WhatsApp מאומת. בקש מהם לחבר WhatsApp בדף הפרופיל.
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {waRecipients.map(r => (
                    <span key={r.user_id} style={{
                      backgroundColor: 'white', borderRadius: 20,
                      padding: '5px 12px', fontSize: 12, fontWeight: 500,
                      color: '#166534', border: '1px solid rgba(37,211,102,.2)',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        backgroundColor: '#25D366',
                      }} />
                      {r.full_name || r.phone_number}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============ AI STATUS BAR ============ */}
      <div style={{
        padding: '8px 20px',
        background: `linear-gradient(90deg, ${C.goldPale}, #FFFBEB)`,
        borderBottom: '1px solid rgba(217,119,6,.08)',
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 12.5, flexShrink: 0,
      }}>
        <span style={{
          fontSize: 14, color: C.goldLight,
          animation: 'aiPulse 2s ease-in-out infinite',
        }}>✦</span>
        <span style={{ color: C.gold, fontWeight: 600 }}>
          Projekta AI פעיל
        </span>
        <span style={{ color: C.slate400 }}>—</span>
        <span style={{ color: C.slate500 }}>
          {taskStats.total > 0
            ? `${taskStats.total - taskStats.done} משימות פתוחות • ${taskStats.done} הושלמו`
            : 'מזהה משימות • מתעד החלטות • שומר הקשר'
          }
        </span>
      </div>

      {/* ============ CHAT AREA ============ */}
      <div
        ref={chatRef}
        onScroll={handleScroll}
        style={{
          flex: 1, overflowY: 'auto', padding: '16px 16px',
          display: 'flex', flexDirection: 'column', gap: 4,
          background: 'linear-gradient(180deg, #E8EDF3 0%, #EAEFF5 30%, #EDF1F7 100%)',
        }}
      >
        {/* Load More */}
        {hasMore && (
          <div style={{ textAlign: 'center', padding: '8px 0 12px' }}>
            <button onClick={loadMore} style={{
              fontSize: 12, color: C.slate500, backgroundColor: C.white,
              padding: '7px 20px', borderRadius: 20,
              border: `1px solid ${C.slate200}`,
              cursor: 'pointer', fontFamily: "'Heebo',sans-serif",
              fontWeight: 500, transition: 'all .2s',
              boxShadow: '0 1px 4px rgba(0,0,0,.04)',
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.08)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,.04)'}
            >⬆️ טען הודעות קודמות</button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: C.slate400 }}>
            <div style={{ fontSize: 40, marginBottom: 12, animation: 'aiPulse 1.5s infinite' }}>💬</div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>טוען הודעות...</div>
          </div>
        )}

        {/* Empty */}
        {!loading && messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 24px', color: C.slate400 }}>
            <div style={{
              width: 80, height: 80, borderRadius: 24,
              background: `linear-gradient(135deg, ${C.indigoPale}, #E0E7FF)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 36, margin: '0 auto 20px',
              boxShadow: `0 8px 30px ${C.indigoGlow}`,
            }}>🏗️</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.slate800, marginBottom: 6 }}>
              ברוכים הבאים לצ׳אט הפרויקט
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.6, maxWidth: 280, margin: '0 auto' }}>
              כתבו את ההודעה הראשונה כדי להתחיל.
              <br />ה-AI יזהה משימות והחלטות אוטומטית ✦
            </div>
          </div>
        )}

        {/* Messages */}
        {groupedMessages.map((group) => (
          <div key={group.date}>
            {/* Date Separator */}
            <div style={{ textAlign: 'center', padding: '12px 0 8px' }}>
              <span style={{
                fontSize: 12, color: C.slate500,
                backgroundColor: 'rgba(255,255,255,.85)',
                padding: '4px 16px', borderRadius: 20,
                fontWeight: 600, backdropFilter: 'blur(8px)',
                boxShadow: '0 1px 4px rgba(0,0,0,.03)',
              }}>{group.date}</span>
            </div>

            {/* Messages */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {group.messages.map((msg, idx) => {
                const isMe = msg.user_id === currentUserId
                const prevMsg = idx > 0 ? group.messages[idx - 1] : null
                const nextMsg = idx < group.messages.length - 1 ? group.messages[idx + 1] : null
                const isFirstInGroup = !prevMsg || prevMsg.user_id !== msg.user_id
                const showName = !isMe && isFirstInGroup
                const showAvatar = !isMe && isFirstInGroup
                const isLastInGroup = !nextMsg || nextMsg.user_id !== msg.user_id
                const msgReactions = reactions[msg.id] || []
                const colorIdx = getUserColorIndex(msg.user_id)
                const userColor = USER_COLORS[colorIdx]
                const profile = getProfile(msg.user_id)

                // Bubble radius logic — pointed corner near message side
                // isMe: tail bottom-left (last msg)
                // !isMe: tail top-right (first msg)
                const radiusTR = !isMe ? (isFirstInGroup ? '0px' : '18px') : '18px'
                const radiusTL = '18px'
                const radiusBR = '18px'
                const radiusBL = isMe ? (isLastInGroup ? '0px' : '18px') : '18px'

                return (
                  <div key={msg.id} style={{
                    display: 'flex',
                    direction: 'ltr',
                    justifyContent: isMe ? 'flex-start' : 'flex-end',
                    gap: 6, alignItems: 'flex-start',
                    marginTop: isFirstInGroup ? 10 : 1,
                    paddingLeft: isMe ? 4 : 0,
                    paddingRight: !isMe ? 4 : 0,
                    animation: isFirstInGroup ? 'msgIn .3s ease' : undefined,
                  }}>

                    {/* Bubble wrapper */}
                    <div style={{ maxWidth: '75%', position: 'relative', direction: 'rtl' }}>
                      {/* Name */}
                      {showName && (
                        <div style={{
                          fontSize: 12.5, fontWeight: 700,
                          color: USER_COLORS[colorIdx].text === '#fff'
                            ? C.slate600
                            : C.slate600,
                          marginBottom: 3, paddingRight: 6,
                        }}>{getDisplayName(msg.user_id)}</div>
                      )}

                      {/* Reply preview */}
                      {msg.reply_to && (() => {
                        const original = messages.find(m => m.id === msg.reply_to)
                        if (!original) return null
                        return (
                          <div style={{
                            fontSize: 12, padding: '6px 12px', marginBottom: 2,
                            borderRadius: '12px 12px 4px 4px',
                            backgroundColor: isMe ? 'rgba(255,255,255,.15)' : C.slate100,
                            borderRight: `3px solid ${isMe ? 'rgba(255,255,255,.4)' : C.indigoLight}`,
                            color: isMe ? 'rgba(255,255,255,.7)' : C.slate500,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            <span style={{ fontWeight: 700 }}>{getDisplayName(original.user_id)}: </span>
                            {original.content.slice(0, 50)}
                          </div>
                        )
                      })()}

                      {/* Bubble */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveReactionMsg(activeReactionMsg === msg.id ? null : msg.id)
                        }}
                        style={{
                          padding: '6px 10px',
                          borderRadius: `${radiusTR} ${radiusTL} ${radiusBL} ${radiusBR}`,
                          backgroundColor: isMe ? C.indigo : C.white,
                          color: isMe ? '#fff' : C.slate900,
                          boxShadow: isMe
                            ? '0 2px 12px rgba(79,70,229,.18)'
                            : '0 1px 4px rgba(0,0,0,.06)',
                          fontSize: 14.5, lineHeight: 1.5,
                          whiteSpace: 'pre-wrap', cursor: 'pointer',
                          userSelect: 'text',
                          transition: 'box-shadow .2s',
                          position: 'relative',
                          overflow: 'visible',
                        }}
                      >
                        {/* WhatsApp-style protruding tail */}
                        {isMe && isLastInGroup && (
                          <svg style={{
                            position: 'absolute', bottom: -1, left: -8,
                            width: 12, height: 16, filter: 'drop-shadow(-1px 1px 1px rgba(79,70,229,.10))',
                          }} viewBox="0 0 12 16" fill="none">
                            <path d="M12 16 C12 16 12 8 12 0 C8 4 4 10 0 16 Z" fill={C.indigo} />
                          </svg>
                        )}
                        {!isMe && isFirstInGroup && (
                          <svg style={{
                            position: 'absolute', top: -1, right: -8,
                            width: 12, height: 16, filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,.04))',
                          }} viewBox="0 0 12 16" fill="none">
                            <path d="M0 0 C0 0 0 8 0 16 C4 12 8 6 12 0 Z" fill={C.white} />
                          </svg>
                        )}
                        {msg.deleted_at ? (
                          <span style={{ fontStyle: 'italic', opacity: 0.5, fontSize: 13 }}>
                            🚫 הודעה נמחקה
                            <span style={{ display: 'inline-block', width: isMe ? 58 : 40 }} />
                          </span>
                        ) : (
                          <>
                            {/* Forwarded badge */}
                            {msg.message_type === 'forwarded' && msg.forwarded_from && (
                              <div style={{
                                fontSize: 11, fontStyle: 'italic',
                                color: isMe ? 'rgba(255,255,255,.5)' : C.slate400,
                                marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4,
                              }}>
                                <span>↩️</span>
                                <span>הועברה מ-{(msg.forwarded_from as any).original_user_name}</span>
                                <span>·</span>
                                <span>{(msg.forwarded_from as any).original_project_name}</span>
                              </div>
                            )}

                            {/* Voice message player — time built-in */}
                            {msg.message_type === 'voice' ? (
                              <VoicePlayer
                                audioUrl={(attachments[msg.id] || []).find(a => a.file_type.startsWith('audio/'))?.file_url}
                                duration={msg.metadata && 'duration' in msg.metadata ? (msg.metadata as any).duration : 0}
                                isMe={isMe}
                                avatar={(() => {
                                  const p = getProfile(msg.user_id)
                                  return getInitials(p.full_name, p.email)
                                })()}
                                avatarColor={getAvatarColor(msg.user_id)}
                                time={formatTime(msg.created_at)}
                                checkMark={isMe ? getCheckMark(msg.id) : undefined}
                              />
                            ) : (
                              <>
                                {/* Attachments */}
                                {(attachments[msg.id] || []).length > 0 && (
                                  <div style={{
                                    display: 'flex', flexWrap: 'wrap', gap: 4,
                                    marginBottom: msg.content && !msg.content.startsWith('📎') && !msg.content.startsWith('🎤') ? 4 : 0,
                                  }}>
                                    {(attachments[msg.id] || []).map(att => (
                                      att.file_type.startsWith('image/') ? (
                                        <a key={att.id} href={att.file_url} target="_blank" rel="noopener noreferrer"
                                          onClick={e => e.stopPropagation()}
                                          style={{ display: 'block', borderRadius: 8, overflow: 'hidden' }}>
                                          <img src={att.file_url} alt={att.file_name} style={{
                                            maxWidth: 260, maxHeight: 200, borderRadius: 8,
                                            objectFit: 'cover', display: 'block',
                                          }} />
                                        </a>
                                      ) : att.file_type.startsWith('audio/') ? null : (
                                        <a key={att.id} href={att.file_url} target="_blank" rel="noopener noreferrer"
                                          onClick={e => e.stopPropagation()}
                                          style={{
                                            display: 'flex', alignItems: 'center', gap: 6,
                                            padding: '6px 10px', borderRadius: 8,
                                            backgroundColor: isMe ? 'rgba(255,255,255,.12)' : C.slate100,
                                            fontSize: 12, textDecoration: 'none',
                                            color: isMe ? 'rgba(255,255,255,.8)' : C.slate600,
                                          }}>
                                          <span>📄</span>
                                          <span>{att.file_name}</span>
                                          <span style={{ opacity: 0.5 }}>({(att.file_size / 1024).toFixed(0)}KB)</span>
                                        </a>
                                      )
                                    ))}
                                  </div>
                                )}
                                {/* Text content */}
                                {msg.content && !msg.content.startsWith('📎') && !msg.content.startsWith('🎤') && (
                                  <span>{msg.content}</span>
                                )}
                              </>
                            )}
                          </>
                        )}

                        {/* Inline time — only for non-voice (voice has built-in time) */}
                        {msg.message_type !== 'voice' && (
                          <>
                            <span style={{
                              display: 'inline-block',
                              width: isMe ? 62 : 44,
                            }} />
                            <span style={{
                              position: 'absolute',
                              bottom: 5,
                              left: 8,
                              display: 'inline-flex', alignItems: 'center', gap: 3,
                              direction: 'ltr',
                              userSelect: 'none', pointerEvents: 'none',
                            }}>
                              {isMe && (() => {
                                const check = getCheckMark(msg.id)
                                return <span style={{
                                  fontSize: 11, lineHeight: 1,
                                  color: check.color,
                                }}>{check.symbol}</span>
                              })()}
                              <span style={{
                                fontSize: 10.5, lineHeight: 1,
                                color: isMe ? 'rgba(255,255,255,.5)' : C.slate400,
                              }}>{formatTime(msg.created_at)}</span>
                            </span>
                          </>
                        )}
                      </div>

                      {/* Reactions display */}
                      {msgReactions.length > 0 && (
                        <div style={{
                          display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4,
                          justifyContent: isMe ? 'flex-end' : 'flex-start',
                        }}>
                          {Object.entries(
                            msgReactions.reduce((acc: Record<string, string[]>, r) => {
                              if (!acc[r.emoji]) acc[r.emoji] = []
                              acc[r.emoji].push(r.user_id)
                              return acc
                            }, {})
                          ).map(([emoji, users]) => (
                            <button key={emoji} onClick={(e) => {
                              e.stopPropagation()
                              if ((users as string[]).includes(currentUserId)) removeReaction(msg.id, emoji)
                              else addReaction(msg.id, emoji)
                            }} style={{
                              fontSize: 14, padding: '2px 8px', borderRadius: 12,
                              border: `1.5px solid ${(users as string[]).includes(currentUserId) ? C.indigoLight : C.slate200}`,
                              backgroundColor: (users as string[]).includes(currentUserId) ? C.indigoPale : C.white,
                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3,
                              boxShadow: '0 1px 3px rgba(0,0,0,.04)',
                              transition: 'all .15s',
                            }}>
                              <span>{emoji}</span>
                              {(users as string[]).length > 1 && (
                                <span style={{ fontSize: 11, color: C.slate500, fontWeight: 600 }}>
                                  {(users as string[]).length}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Reactions popup */}
                      {activeReactionMsg === msg.id && !msg.deleted_at && (
                        <div onClick={e => e.stopPropagation()} style={{
                          position: 'absolute',
                          top: -44,
                          ...(isMe ? { left: 0 } : { right: 0 }),
                          display: 'flex', gap: 2, padding: '6px 10px',
                          backgroundColor: C.white, borderRadius: 22,
                          boxShadow: '0 4px 20px rgba(0,0,0,.14)',
                          border: `1px solid ${C.slate100}`,
                          zIndex: 15, animation: 'msgIn .15s ease',
                          whiteSpace: 'nowrap',
                        }}>
                          {QUICK_REACTIONS.map(emoji => (
                            <button key={emoji} onClick={() => {
                              addReaction(msg.id, emoji)
                              setActiveReactionMsg(null)
                            }} style={{
                              fontSize: 20, padding: '3px 4px', borderRadius: 8,
                              border: 'none', backgroundColor: 'transparent',
                              cursor: 'pointer', transition: 'transform .12s',
                              lineHeight: 1,
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.3)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                            >{emoji}</button>
                          ))}
                          <div style={{ width: 1, backgroundColor: C.slate200, margin: '4px 2px' }} />
                          <button onClick={() => {
                            setReplyTo(msg); setActiveReactionMsg(null)
                            inputRef.current?.focus()
                          }} style={{
                            fontSize: 16, padding: '3px 6px', borderRadius: 8,
                            border: 'none', backgroundColor: 'transparent', cursor: 'pointer',
                          }}>↩️</button>
                          <button onClick={() => {
                            setTaskFromMsg(msg); setActiveReactionMsg(null)
                          }} style={{
                            fontSize: 16, padding: '3px 6px', borderRadius: 8,
                            border: 'none', backgroundColor: 'transparent', cursor: 'pointer',
                          }} title="צור משימה מהודעה">📋</button>
                          <button onClick={() => {
                            openForwardModal(msg); setActiveReactionMsg(null)
                          }} style={{
                            fontSize: 16, padding: '3px 6px', borderRadius: 8,
                            border: 'none', backgroundColor: 'transparent', cursor: 'pointer',
                          }} title="העבר">↪️</button>
                          {isMe && (
                            <button onClick={() => {
                              deleteMessage(msg.id); setActiveReactionMsg(null)
                            }} style={{
                              fontSize: 16, padding: '3px 6px', borderRadius: 8,
                              border: 'none', backgroundColor: 'transparent', cursor: 'pointer',
                            }}>🗑️</button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Avatar — right side, first message in group */}
                    {!isMe && (
                      <div style={{ width: 32, minWidth: 32, marginTop: showName ? 20 : 0 }}>
                        {showAvatar && (
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: userColor.bg,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, color: userColor.text, fontWeight: 700,
                            boxShadow: '0 2px 8px rgba(0,0,0,.1)',
                            border: '2px solid #fff',
                          }}>
                            {getInitials(profile.full_name, profile.email)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* ============ SCROLL DOWN ============ */}
      {showScrollDown && (
        <button onClick={scrollToBottom} style={{
          position: 'absolute', bottom: 90, left: '50%', transform: 'translateX(-50%)',
          width: 42, height: 42, borderRadius: '50%',
          backgroundColor: C.white,
          border: `1px solid ${C.slate200}`,
          boxShadow: '0 4px 16px rgba(0,0,0,.12)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, zIndex: 5, animation: 'msgIn .2s ease',
        }}>⬇️</button>
      )}

      {/* ============ REPLY BAR ============ */}
      {replyTo && (
        <div style={{
          padding: '10px 20px',
          backgroundColor: C.white,
          borderTop: `1px solid ${C.slate200}`,
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        }}>
          <div style={{
            width: 4, height: 36, borderRadius: 4,
            background: `linear-gradient(180deg, ${C.indigo}, ${C.indigoLight})`,
            flexShrink: 0,
          }} />
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: C.indigo }}>
              {getDisplayName(replyTo.user_id)}
            </div>
            <div style={{
              fontSize: 13, color: C.slate500,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{replyTo.content.slice(0, 80)}</div>
          </div>
          <button onClick={() => setReplyTo(null)} style={{
            width: 28, height: 28, borderRadius: 8,
            border: `1px solid ${C.slate200}`, backgroundColor: C.slate50,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, color: C.slate400,
          }}>✕</button>
        </div>
      )}

      {/* ============ TYPING INDICATOR ============ */}
      {typingUsers.length > 0 && (
        <div style={{
          padding: '6px 20px',
          backgroundColor: C.white,
          borderTop: `1px solid ${C.slate100}`,
          display: 'flex', alignItems: 'center', gap: 8,
          flexShrink: 0, direction: 'rtl',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 3,
            padding: '4px 0',
          }}>
            <span className="typing-dot" style={{
              width: 6, height: 6, borderRadius: '50%',
              backgroundColor: C.indigo, opacity: 0.7,
              animation: 'typingBounce 1.4s ease infinite',
            }} />
            <span className="typing-dot" style={{
              width: 6, height: 6, borderRadius: '50%',
              backgroundColor: C.indigo, opacity: 0.7,
              animation: 'typingBounce 1.4s ease infinite 0.2s',
            }} />
            <span className="typing-dot" style={{
              width: 6, height: 6, borderRadius: '50%',
              backgroundColor: C.indigo, opacity: 0.7,
              animation: 'typingBounce 1.4s ease infinite 0.4s',
            }} />
          </div>
          <span style={{
            fontSize: 12.5, color: C.slate500,
            fontFamily: "'Heebo',sans-serif", fontWeight: 500,
          }}>
            {typingUsers.length === 1
              ? `${typingUsers[0].userName} מקליד...`
              : `${typingUsers.map(t => t.userName).join(', ')} מקלידים...`
            }
          </span>
        </div>
      )}

      {/* ============ FILE PREVIEW ============ */}
      {previewUrls.length > 0 && (
        <div style={{
          padding: '10px 16px',
          backgroundColor: C.white,
          borderTop: `1px solid ${C.slate200}`,
          display: 'flex', gap: 8, overflowX: 'auto', flexShrink: 0,
        }}>
          {previewUrls.map((url, i) => (
            <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
              {pendingFiles[i]?.type.startsWith('image/') ? (
                <img src={url} alt="" style={{
                  width: 64, height: 64, borderRadius: 10,
                  objectFit: 'cover', border: `2px solid ${C.slate200}`,
                }} />
              ) : (
                <div style={{
                  width: 64, height: 64, borderRadius: 10,
                  backgroundColor: C.slate100, border: `2px solid ${C.slate200}`,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 2,
                }}>
                  <span style={{ fontSize: 20 }}>📄</span>
                  <span style={{ fontSize: 8, color: C.slate500, maxWidth: 50, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {pendingFiles[i]?.name}
                  </span>
                </div>
              )}
              <button onClick={() => removePendingFile(i)} style={{
                position: 'absolute', top: -6, right: -6,
                width: 20, height: 20, borderRadius: '50%',
                backgroundColor: C.red, color: '#fff',
                border: '2px solid #fff', fontSize: 10, fontWeight: 800,
                cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* ============ FILE ERROR ============ */}
      {fileError && (
        <div style={{
          padding: '8px 16px', backgroundColor: '#FEF2F2',
          borderTop: `1px solid #FECACA`,
          display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        }}>
          <span style={{ fontSize: 13, color: '#DC2626', fontFamily: "'Heebo',sans-serif", flex: 1 }}>
            ⚠️ {fileError}
          </span>
          <button onClick={() => setFileError(null)} style={{
            background: 'none', border: 'none', color: '#DC2626',
            cursor: 'pointer', fontSize: 14, fontWeight: 700,
          }}>✕</button>
        </div>
      )}

      {/* ============ INPUT ============ */}
      <div style={{
        padding: '12px 16px',
        borderTop: previewUrls.length > 0 ? 'none' : `1px solid ${C.slate200}`,
        backgroundColor: C.white,
        display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0,
        borderRadius: isMobile ? 0 : '0 0 16px 16px',
        position: 'relative',
      }}>
        {/* Hidden file inputs per category */}
        <input ref={imageInputRef} type="file" accept="image/*" multiple
          onChange={handleFileSelect} style={{ display: 'none' }} />
        <input ref={docInputRef} type="file" multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
          onChange={handleFileSelect} style={{ display: 'none' }} />
        <input ref={videoInputRef} type="file" accept="video/*"
          onChange={handleFileSelect} style={{ display: 'none' }} />

        {/* Attach button */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setAttachMenu(!attachMenu)} style={{
            width: 40, height: 40, borderRadius: '50%', border: 'none',
            backgroundColor: attachMenu ? C.indigoPale : C.slate100,
            color: attachMenu ? C.indigo : C.slate500,
            fontSize: 18, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all .2s', flexShrink: 0,
            transform: attachMenu ? 'rotate(45deg)' : 'rotate(0deg)',
          }}
          onMouseEnter={e => { if (!attachMenu) { e.currentTarget.style.backgroundColor = C.indigoPale; e.currentTarget.style.color = C.indigo }}}
          onMouseLeave={e => { if (!attachMenu) { e.currentTarget.style.backgroundColor = C.slate100; e.currentTarget.style.color = C.slate500 }}}
          >📎</button>

          {/* Attach Menu Popup */}
          {attachMenu && (
            <div style={{
              position: 'absolute',
              bottom: 52,
              right: 0,
              backgroundColor: C.white,
              borderRadius: 16,
              boxShadow: '0 8px 30px rgba(0,0,0,.15)',
              border: `1px solid ${C.slate200}`,
              padding: '8px',
              zIndex: 20,
              animation: 'msgIn .2s ease',
              minWidth: 180,
            }}>
              {[
                { icon: '📷', label: 'מצלמה', sub: 'צלם תמונה', action: () => openCamera(), color: '#8B5CF6' },
                { icon: '🖼️', label: 'תמונה', sub: 'עד 5MB', action: () => imageInputRef.current?.click(), color: '#3B82F6' },
                { icon: '📄', label: 'מסמך', sub: 'PDF, Word, Excel — עד 10MB', action: () => docInputRef.current?.click(), color: '#10B981' },
                { icon: '🎥', label: 'וידאו', sub: 'עד 25MB', action: () => videoInputRef.current?.click(), color: '#F59E0B' },
              ].map((item, i) => (
                <button key={i} onClick={() => { item.action(); setAttachMenu(false) }} style={{
                  width: '100%', padding: '10px 12px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  backgroundColor: 'transparent', border: 'none',
                  borderRadius: 10, cursor: 'pointer',
                  transition: 'all .15s', direction: 'rtl',
                  fontFamily: "'Heebo',sans-serif",
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = C.slate50}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    backgroundColor: item.color + '15',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, flexShrink: 0,
                  }}>{item.icon}</div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: C.slate900 }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: C.slate400 }}>{item.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {isRecording ? (
          /* ===== RECORDING MODE ===== */
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 10,
            backgroundColor: '#FEF2F2', borderRadius: 24,
            padding: '4px 12px', border: `2px solid ${C.red}`,
          }}>
            {/* Cancel */}
            <button onClick={cancelRecording} style={{
              width: 36, height: 36, borderRadius: '50%', border: 'none',
              backgroundColor: 'rgba(220,38,38,0.1)', color: C.red,
              fontSize: 16, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>🗑️</button>

            {/* Recording indicator */}
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 8,
              justifyContent: 'center',
            }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                backgroundColor: C.red,
                animation: 'aiPulse 1s infinite',
              }} />
              <span style={{
                fontSize: 16, fontWeight: 600, color: C.red,
                fontFamily: "'Heebo',sans-serif",
                fontVariantNumeric: 'tabular-nums',
              }}>{formatRecordingTime(recordingTime)}</span>
            </div>

            {/* Stop & Send */}
            <button onClick={stopRecording} style={{
              width: 40, height: 40, borderRadius: '50%', border: 'none',
              background: `linear-gradient(135deg, ${C.indigo}, ${C.indigoLight})`,
              color: '#fff', fontSize: 18, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 3px 12px ${C.indigoGlow}`,
            }}>▲</button>
          </div>
        ) : (
          /* ===== NORMAL INPUT MODE ===== */
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center',
            backgroundColor: C.slate50,
            borderRadius: 24, padding: '4px 6px 4px 16px',
            border: `2px solid ${inputFocused ? C.indigoLight : C.slate200}`,
            transition: 'all .25s',
            boxShadow: inputFocused ? `0 0 0 3px ${C.indigoGlow}` : 'none',
          }}>
            <input
              ref={inputRef}
              value={inputText}
              onChange={e => { setInputText(e.target.value); sendTyping() }}
              onFocus={() => setInputFocused(true)}
              onBlur={() => { setInputFocused(false); sendStopTyping() }}
              onPaste={handlePaste}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault(); handleSend()
                }
              }}
              placeholder={pendingFiles.length > 0 ? 'הוסף הודעה לתמונה...' : 'כתוב הודעה...'}
              style={{
                flex: 1, border: 'none', outline: 'none',
                backgroundColor: 'transparent',
                fontSize: 15, fontFamily: "'Heebo',sans-serif",
                color: C.slate900, direction: 'rtl', padding: '10px 0',
              }}
            />
            {(inputText.trim() || pendingFiles.length > 0) ? (
              /* Send button */
              <button
                onClick={handleSend}
                disabled={uploading}
                style={{
                  width: 40, height: 40, borderRadius: '50%', border: 'none',
                  background: !uploading
                    ? `linear-gradient(135deg, ${C.indigo}, ${C.indigoLight})`
                    : C.slate300,
                  color: '#fff', fontSize: uploading ? 14 : 17,
                  cursor: !uploading ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all .25s',
                  transform: !uploading ? 'scale(1) rotate(-90deg)' : 'scale(.85) rotate(-90deg)',
                  boxShadow: !uploading ? `0 3px 12px ${C.indigoGlow}` : 'none',
                  animation: uploading ? 'aiPulse 1s infinite' : 'none',
                }}
              >{uploading ? '⏳' : '▲'}</button>
            ) : (
              /* Mic button — show when no text */
              <button
                onClick={startRecording}
                style={{
                  width: 40, height: 40, borderRadius: '50%', border: 'none',
                  backgroundColor: C.slate200, color: C.slate600,
                  fontSize: 18, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all .2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = C.indigoPale; e.currentTarget.style.color = C.indigo }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = C.slate200; e.currentTarget.style.color = C.slate600 }}
              >🎤</button>
            )}
          </div>
        )}
      </div>

      {/* ============ CAMERA OVERLAY ============ */}
      {showCamera && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 100,
          backgroundColor: '#000',
          display: 'flex', flexDirection: 'column',
          borderRadius: isMobile ? 0 : 16, overflow: 'hidden',
        }}>
          <video
            ref={cameraVideoRef}
            autoPlay
            playsInline
            muted
            style={{
              flex: 1, objectFit: 'cover', width: '100%',
              transform: 'scaleX(-1)',
            }}
          />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '24px 0 32px',
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 40,
            background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
          }}>
            {/* Cancel */}
            <button onClick={closeCamera} style={{
              width: 48, height: 48, borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.2)',
              border: '2px solid rgba(255,255,255,0.5)',
              color: '#fff', fontSize: 20, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(8px)',
            }}>✕</button>

            {/* Capture */}
            <button onClick={capturePhoto} style={{
              width: 72, height: 72, borderRadius: '50%',
              backgroundColor: '#fff',
              border: '4px solid rgba(255,255,255,0.5)',
              cursor: 'pointer',
              boxShadow: '0 0 30px rgba(255,255,255,0.3)',
              transition: 'all .15s',
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.9)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            />
          </div>
        </div>
      )}

      {/* ============ FORWARD MODAL ============ */}
      {forwardMsg && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 100,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: isMobile ? 0 : 16,
        }} onClick={() => setForwardMsg(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            backgroundColor: C.white, borderRadius: 16,
            padding: 24, width: 320, maxHeight: '70%',
            boxShadow: '0 20px 60px rgba(0,0,0,.2)',
            direction: 'rtl', fontFamily: "'Heebo',sans-serif",
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>העברת הודעה</div>
                <div style={{ fontSize: 12, color: C.slate400 }}>בחר פרויקט יעד</div>
              </div>
              <button onClick={() => setForwardMsg(null)} style={{
                background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: C.slate400,
              }}>✕</button>
            </div>

            {/* Message preview */}
            <div style={{
              padding: '8px 12px', borderRadius: 10,
              backgroundColor: C.slate50, border: `1px solid ${C.slate200}`,
              marginBottom: 16, fontSize: 13, color: C.slate600,
              maxHeight: 60, overflow: 'hidden',
            }}>
              <span style={{ fontWeight: 600 }}>{getDisplayName(forwardMsg.user_id)}: </span>
              {forwardMsg.content.slice(0, 80)}{forwardMsg.content.length > 80 ? '...' : ''}
            </div>

            {/* Project list */}
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {forwardProjects.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, color: C.slate400, fontSize: 13 }}>
                  אין פרויקטים נוספים להעברה
                </div>
              ) : (
                forwardProjects.map(p => (
                  <button key={p.id} onClick={() => handleForward(p.id, p.name)} style={{
                    width: '100%', padding: '12px 14px',
                    display: 'flex', alignItems: 'center', gap: 10,
                    backgroundColor: 'transparent', border: 'none',
                    borderRadius: 10, cursor: 'pointer',
                    transition: 'all .15s', fontFamily: "'Heebo',sans-serif",
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = C.slate50}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: `linear-gradient(135deg, ${C.indigo}, ${C.indigoLight})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 14, fontWeight: 700,
                    }}>{p.name?.charAt(0) || '?'}</div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.slate900 }}>{p.name}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============ TASK FROM MESSAGE MODAL ============ */}
      {taskFromMsg && (
        <TaskFromMessageModal
          message={taskFromMsg}
          onConfirm={async (title: string, category: string) => {
            await createTask({ title, category, source_message_id: taskFromMsg.id })
            setTaskFromMsg(null)
          }}
          onClose={() => setTaskFromMsg(null)}
        />
      )}

      {/* ============ SIDE PANELS ============ */}
      {activePanel === 'tasks' && (
        <TaskBoardPanel
          tasks={tasks}
          stats={taskStats}
          onUpdateStatus={updateTaskStatus}
          onUpdateTask={updateTask}
          onDeleteTask={deleteTask}
          onCreateTask={(title: string, category?: string) => createTask({ title, category })}
          onClose={() => setActivePanel(null)}
        />
      )}
      {activePanel === 'decisions' && (
        <DecisionTimelinePanel
          decisions={decisions}
          profiles={profiles}
          onClose={() => setActivePanel(null)}
        />
      )}
      {activePanel === 'search' && (
        <SearchPanel
          onSearch={searchMessages}
          profiles={profiles}
          onClose={() => setActivePanel(null)}
        />
      )}

      {/* ============ CSS ============ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800&display=swap');
        @keyframes msgIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes aiPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: .4; transform: scale(.9); }
        }
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        div::-webkit-scrollbar { width: 4px; }
        div::-webkit-scrollbar-track { background: transparent; }
        div::-webkit-scrollbar-thumb { background: ${C.slate300}; border-radius: 10px; }
        div::-webkit-scrollbar-thumb:hover { background: ${C.slate400}; }
      `}</style>
    </div>
  )
}


// ===========================================
// Task From Message Modal
// ===========================================

const CATEGORIES = ['כללי', 'ריצוף', 'חשמל', 'אינסטלציה', 'דלתות', 'צבע', 'אלומיניום', 'גבס', 'ברזל', 'ניקיון']

function TaskFromMessageModal({ message, onConfirm, onClose }: {
  message: ChatMessageRow
  onConfirm: (title: string, category: string) => Promise<void>
  onClose: () => void
}) {
  const [title, setTitle] = useState(message.content.slice(0, 120))
  const [category, setCategory] = useState('כללי')
  const [saving, setSaving] = useState(false)

  // Auto-detect category
  useState(() => {
    const text = message.content.toLowerCase()
    if (text.includes('חשמל') || text.includes('שקע') || text.includes('תאורה')) setCategory('חשמל')
    else if (text.includes('ריצוף') || text.includes('אריח')) setCategory('ריצוף')
    else if (text.includes('אינסטלציה') || text.includes('צנרת') || text.includes('ברז')) setCategory('אינסטלציה')
    else if (text.includes('דלת')) setCategory('דלתות')
    else if (text.includes('צבע') || text.includes('שפכטל')) setCategory('צבע')
    else if (text.includes('אלומיניום') || text.includes('חלון')) setCategory('אלומיניום')
    else if (text.includes('גבס') || text.includes('תקרה')) setCategory('גבס')
    else if (text.includes('ברזל') || text.includes('פלדה')) setCategory('ברזל')
  })

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    await onConfirm(title.trim(), category)
    setSaving(false)
  }

  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, zIndex: 30,
      backgroundColor: 'rgba(0,0,0,0.4)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, animation: 'msgIn .2s ease',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 400,
        backgroundColor: '#fff', borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,.18)',
        overflow: 'hidden', direction: 'rtl',
        fontFamily: "'Heebo',sans-serif",
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          background: 'linear-gradient(135deg, #4F46E5, #4338CA)',
          color: '#fff',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 22 }}>📋</span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>צור משימה מהודעה</div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>המשימה תקושר להודעה המקורית</div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '20px' }}>
          {/* Original message preview */}
          <div style={{
            padding: '10px 14px', borderRadius: 10,
            backgroundColor: '#F1F5F9', marginBottom: 16,
            borderRight: '3px solid #6366F1',
            fontSize: 13, color: '#64748B', lineHeight: 1.5,
            maxHeight: 60, overflow: 'hidden',
          }}>
            {message.content.slice(0, 100)}{message.content.length > 100 ? '...' : ''}
          </div>

          {/* Title */}
          <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
            כותרת המשימה
          </label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            autoFocus
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 10,
              border: '2px solid #E2E8F0', fontSize: 14,
              fontFamily: "'Heebo',sans-serif", color: '#0F172A',
              outline: 'none', direction: 'rtl', boxSizing: 'border-box',
              transition: 'border-color .2s',
            }}
            onFocus={e => e.currentTarget.style.borderColor = '#6366F1'}
            onBlur={e => e.currentTarget.style.borderColor = '#E2E8F0'}
          />

          {/* Category */}
          <label style={{
            fontSize: 13, fontWeight: 700, color: '#334155',
            display: 'block', marginTop: 14, marginBottom: 8,
          }}>
            קטגוריה
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)} style={{
                padding: '5px 14px', borderRadius: 20, fontSize: 12.5, fontWeight: 600,
                border: category === cat ? '2px solid #4F46E5' : '1px solid #E2E8F0',
                backgroundColor: category === cat ? '#EEF2FF' : 'transparent',
                color: category === cat ? '#4F46E5' : '#64748B',
                cursor: 'pointer', fontFamily: "'Heebo',sans-serif",
                transition: 'all .15s',
              }}>{cat}</button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{
          padding: '14px 20px', borderTop: '1px solid #E2E8F0',
          display: 'flex', gap: 8, justifyContent: 'flex-start',
        }}>
          <button onClick={handleSave} disabled={!title.trim() || saving} style={{
            padding: '9px 28px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, #4F46E5, #6366F1)',
            color: '#fff', fontSize: 14, fontWeight: 700,
            cursor: title.trim() && !saving ? 'pointer' : 'default',
            fontFamily: "'Heebo',sans-serif",
            opacity: title.trim() && !saving ? 1 : 0.5,
            boxShadow: '0 2px 8px rgba(99,102,241,.25)',
          }}>
            {saving ? '...' : '✓ צור משימה'}
          </button>
          <button onClick={onClose} style={{
            padding: '9px 20px', borderRadius: 10,
            border: '1px solid #E2E8F0', backgroundColor: 'transparent',
            color: '#64748B', fontSize: 14, cursor: 'pointer',
            fontFamily: "'Heebo',sans-serif",
          }}>ביטול</button>
        </div>
      </div>
    </div>
  )
}


// ===========================================
// Voice Player — WhatsApp Style
// ===========================================

function VoicePlayer({ audioUrl, duration, isMe, avatar, avatarColor, time, checkMark }: {
  audioUrl?: string
  duration: number
  isMe: boolean
  avatar: string
  avatarColor: string
  time?: string
  checkMark?: { symbol: string; color: string }
}) {
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(duration)
  const audioRef = useRef<HTMLAudioElement>(null)
  const animRef = useRef<number>(0)

  const bars = useRef(
    Array.from({ length: 32 }, (_, i) => {
      const seed = (i * 7 + 13) % 17
      return 0.15 + (seed / 17) * 0.85
    })
  ).current

  const fmt = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const progress = audioDuration > 0 ? currentTime / audioDuration : 0

  const tick = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
      if (!audioRef.current.paused) {
        animRef.current = requestAnimationFrame(tick)
      }
    }
  }, [])

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!audioRef.current || !audioUrl) return
    if (playing) {
      audioRef.current.pause()
      cancelAnimationFrame(animRef.current)
      setPlaying(false)
    } else {
      audioRef.current.play()
      animRef.current = requestAnimationFrame(tick)
      setPlaying(true)
    }
  }

  const handleEnded = () => {
    setPlaying(false)
    setCurrentTime(0)
    cancelAnimationFrame(animRef.current)
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current && audioRef.current.duration && isFinite(audioRef.current.duration)) {
      setAudioDuration(audioRef.current.duration)
    }
  }

  const handleBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !audioUrl) return
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const pct = clickX / rect.width
    audioRef.current.currentTime = pct * audioDuration
    setCurrentTime(audioRef.current.currentTime)
  }

  const playBtnBg = isMe ? 'rgba(255,255,255,0.25)' : '#E2E8F0'
  const playBtnColor = isMe ? '#fff' : '#334155'
  const barPlayed = isMe ? 'rgba(255,255,255,0.9)' : '#4F46E5'
  const barUnplayed = isMe ? 'rgba(255,255,255,0.3)' : '#CBD5E1'
  const timeColor = isMe ? 'rgba(255,255,255,0.55)' : '#94A3B8'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, direction: 'ltr', minWidth: 200 }}>
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} preload="metadata"
          onEnded={handleEnded} onLoadedMetadata={handleLoadedMetadata} />
      )}

      {/* Avatar — left side */}
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        backgroundColor: avatarColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: avatar.length > 1 ? 9.5 : 11, fontWeight: 700, flexShrink: 0,
        border: `2px solid ${isMe ? 'rgba(255,255,255,0.3)' : '#E2E8F0'}`,
      }}>{avatar}</div>

      {/* Waveform area */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Bars */}
        <div onClick={handleBarClick} style={{
          display: 'flex', alignItems: 'center', gap: 1.5,
          height: 26, cursor: 'pointer',
        }}>
          {bars.map((h, i) => {
            const barPct = i / bars.length
            const played = barPct <= progress
            return (
              <div key={i} style={{
                flex: 1, maxWidth: 3.5, minWidth: 2,
                height: `${h * 100}%`,
                borderRadius: 1.5,
                backgroundColor: played ? barPlayed : barUnplayed,
                transition: 'background-color .1s',
              }} />
            )
          })}
        </div>

        {/* Bottom row: time+check left, duration right */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 1,
        }}>
          {time ? (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontSize: 10.5, color: timeColor, direction: 'ltr',
            }}>
              {checkMark && <span style={{ fontSize: 11, color: checkMark.color }}>{checkMark.symbol}</span>}
              {time}
            </span>
          ) : <span />}
          <span style={{
            fontSize: 10.5, color: timeColor, fontVariantNumeric: 'tabular-nums',
          }}>
            {playing || currentTime > 0 ? fmt(currentTime) : fmt(audioDuration)}
          </span>
        </div>
      </div>

      {/* Play / Pause — right side */}
      <button onClick={togglePlay} style={{
        width: 34, height: 34, borderRadius: '50%',
        backgroundColor: playBtnBg, border: 'none',
        cursor: audioUrl ? 'pointer' : 'default',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, color: playBtnColor, flexShrink: 0,
        opacity: audioUrl ? 1 : 0.4,
      }}>
        {!audioUrl ? (
          <span style={{ fontSize: 10, animation: 'aiPulse 1s infinite' }}>⏳</span>
        ) : playing ? '⏸' : '▶'}
      </button>
    </div>
  )
}
