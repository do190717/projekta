// ===========================================
// Projekta Chat v2 — useUnreadCount Hook
// ===========================================
// ספירת הודעות שלא נקראו — מבוסס RPC
// סנכרון בין components עם BroadcastChannel
// ===========================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'


// BroadcastChannel לסנכרון בין instances (Sidebar ↔ SmartChat)
const CHANNEL_NAME = 'projekta-unread-sync'

function getBroadcast(): BroadcastChannel | null {
  try {
    return new BroadcastChannel(CHANNEL_NAME)
  } catch {
    return null // SSR or unsupported
  }
}

export function useUnreadCount(projectId: string | null) {
  const supabase = createClient()
  const [unreadCount, setUnreadCount] = useState(0)
  const broadcastRef = useRef<BroadcastChannel | null>(null)

  // --- Fetch unread count via RPC ---
  const fetchUnread = useCallback(async () => {
    if (!projectId) return

    try {
      const { data, error } = await supabase.rpc('v2_get_unread_count', {
        p_project_id: projectId,
      })

      if (error) {
        console.error('Unread count error:', error)
        return
      }

      const count = data ?? 0
      setUnreadCount(count)
      return count
    } catch (err) {
      console.error('Unread count fetch failed:', err)
    }
  }, [projectId])

  // --- Mark all as read via RPC ---
  const markAllRead = useCallback(async () => {
    if (!projectId) return

    try {
      const { error } = await supabase.rpc('v2_mark_chat_read', {
        p_project_id: projectId,
      })

      if (error) {
        console.error('Mark read error:', error)
        return
      }

      // Update local state immediately
      setUnreadCount(0)

      // Notify other instances (e.g. Sidebar)
      try {
        broadcastRef.current?.postMessage({
          type: 'mark_read',
          projectId,
        })
      } catch {
        // ignore
      }
    } catch (err) {
      console.error('Mark read failed:', err)
    }
  }, [projectId])

  // --- BroadcastChannel listener ---
  useEffect(() => {
    const bc = getBroadcast()
    broadcastRef.current = bc
    if (!bc) return

    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'mark_read' && event.data?.projectId === projectId) {
        setUnreadCount(0)
      }
      if (event.data?.type === 'new_message' && event.data?.projectId === projectId) {
        fetchUnread()
      }
    }

    bc.addEventListener('message', handler)
    return () => {
      bc.removeEventListener('message', handler)
      bc.close()
    }
  }, [projectId, fetchUnread])

  // --- Initial fetch ---
  useEffect(() => {
    fetchUnread()
  }, [fetchUnread])

  // --- Realtime: new messages trigger recount ---
  useEffect(() => {
    if (!projectId) return

    const channel = supabase
      .channel(`v2-unread:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'v2_chat_messages',
        },
        () => {
          fetchUnread()
          // Notify other instances
          try {
            broadcastRef.current?.postMessage({
              type: 'new_message',
              projectId,
            })
          } catch {
            // ignore
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, fetchUnread])

  return { unreadCount, markAllRead, refreshUnread: fetchUnread }
}