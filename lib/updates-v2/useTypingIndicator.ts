// ===========================================
// Projekta Chat v2 — useTypingIndicator Hook
// ===========================================
// Supabase Realtime Broadcast — אין שמירה ב-DB
// שולח/מקבל אירועי "מקליד" בזמן אמת
// ===========================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'


// כמה שניות אחרי הפסקת הקלדה נחשב "הפסיק"
const TYPING_TIMEOUT = 3000
// כמה שניות מינימום בין שליחות broadcast
const THROTTLE_MS = 2000

interface TypingUser {
  userId: string
  userName: string
  startedAt: number
}

export function useTypingIndicator(projectId: string | null, currentUserId: string | null, currentUserName: string) {
  const supabase = createClient()
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const channelRef = useRef<any>(null)
  const lastBroadcastRef = useRef(0)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cleanupIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // --- Setup Realtime Channel ---
  useEffect(() => {
    if (!projectId) return

    const channel = supabase.channel(`typing:${projectId}`, {
      config: { broadcast: { self: false } },
    })

    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (!payload?.userId || payload.userId === currentUserId) return

        setTypingUsers(prev => {
          const existing = prev.filter(t => t.userId !== payload.userId)
          return [...existing, {
            userId: payload.userId,
            userName: payload.userName || 'משתמש',
            startedAt: Date.now(),
          }]
        })
      })
      .on('broadcast', { event: 'stop_typing' }, ({ payload }) => {
        if (!payload?.userId) return
        setTypingUsers(prev => prev.filter(t => t.userId !== payload.userId))
      })
      .subscribe()

    channelRef.current = channel

    // Cleanup stale typing indicators every 2s
    cleanupIntervalRef.current = setInterval(() => {
      const now = Date.now()
      setTypingUsers(prev => prev.filter(t => now - t.startedAt < TYPING_TIMEOUT))
    }, 2000)

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
      if (cleanupIntervalRef.current) clearInterval(cleanupIntervalRef.current)
    }
  }, [projectId, currentUserId])

  // --- Broadcast "I'm typing" (throttled) ---
  const sendTyping = useCallback(async () => {
    if (!channelRef.current || !currentUserId) return

    const now = Date.now()
    if (now - lastBroadcastRef.current < THROTTLE_MS) return
    lastBroadcastRef.current = now

    try {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: currentUserId, userName: currentUserName },
      })
    } catch (error) {
      console.error('Failed to send typing indicator:', error)
    }

    // Auto stop after timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      sendStopTyping()
    }, TYPING_TIMEOUT)
  }, [currentUserId, currentUserName])

  // --- Broadcast "I stopped typing" ---
  const sendStopTyping = useCallback(async () => {
    if (!channelRef.current || !currentUserId) return

    try {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'stop_typing',
        payload: { userId: currentUserId },
      })
    } catch (error) {
      console.error('Failed to send stop typing indicator:', error)
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }
  }, [currentUserId])

  return {
    typingUsers: typingUsers.filter(t => t.userId !== currentUserId),
    sendTyping,
    sendStopTyping,
  }
}
