// ===========================================
// Projekta Chat v2 — useUnreadCount Hook
// ===========================================
// ספירת הודעות שלא נקראו — מבוסס v2_chat_reads
// הודעה "נקראה" = יש לה record ב-v2_chat_reads
// ===========================================

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

export function useUnreadCount(projectId: string | null) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data?.user?.id || null)
    })
  }, [])

  const fetchUnread = useCallback(async () => {
    if (!projectId || !userId) return

    try {
      // RPC: ספור הודעות של אחרים שאין להן read record שלי
      // כי אין RPC, נעשה את זה ב-2 queries
      
      // 1. כל ההודעות של אחרים (לא שלי, לא מחוקות)
      const { data: otherMsgs } = await supabase
        .from('v2_chat_messages')
        .select('id')
        .eq('project_id', projectId)
        .neq('user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(100)

      if (!otherMsgs || otherMsgs.length === 0) {
        setUnreadCount(0)
        return
      }

      // 2. מתוכן, מה כבר נקרא
      const msgIds = otherMsgs.map(m => m.id)
      const { data: readMsgs } = await supabase
        .from('v2_chat_reads')
        .select('message_id')
        .eq('user_id', userId)
        .in('message_id', msgIds)

      const readSet = new Set((readMsgs || []).map(r => r.message_id))
      const unread = msgIds.filter(id => !readSet.has(id))

      setUnreadCount(unread.length)
    } catch (err) {
      // silent
    }
  }, [projectId, userId])

  // Initial fetch
  useEffect(() => {
    fetchUnread()
  }, [fetchUnread])

  // Realtime - new messages
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
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, fetchUnread])

  return { unreadCount, refreshUnread: fetchUnread }
}
