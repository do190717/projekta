// ===========================================
// Projekta Chat v2 — useChat Hook
// ===========================================
// צ'אט פרויקטי עם real-time, pagination, reactions
// טבלאות v2_chat_*
// ===========================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import type {
  ChatMessageRow,
  ChatReactionRow,
  ChatAttachmentRow,
  ForwardedFrom,
  MiniProfile,
} from './types'


const T = {
  messages: 'v2_chat_messages',
  reactions: 'v2_chat_reactions',
  reads: 'v2_chat_reads',
  attachments: 'v2_chat_attachments',
} as const

const PAGE_SIZE = 50

export function useChat(projectId: string | null) {
  const supabase = createClient()
  const [messages, setMessages] = useState<ChatMessageRow[]>([])
  const [profiles, setProfiles] = useState<Record<string, MiniProfile>>({})
  const [reactions, setReactions] = useState<Record<string, ChatReactionRow[]>>({})
  const [messageReads, setMessageReads] = useState<Record<string, string[]>>({}) // message_id → user_ids who read
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const loadingMore = useRef(false)

  // --- Fetch Profiles ---
  const fetchProfiles = useCallback(async (userIds: string[]) => {
    const newIds = [...new Set(userIds)].filter(id => id && !profiles[id])
    if (newIds.length === 0) return

    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, email')
      .in('id', newIds)

    if (data) {
      setProfiles(prev => {
        const updated = { ...prev }
        data.forEach((p: any) => { updated[p.id] = p })
        return updated
      })
    }
  }, [profiles])

  // --- Fetch Messages (initial + pagination) ---
  const fetchMessages = useCallback(async (before?: string) => {
    if (!projectId) return
    if (!before) setLoading(true)

    try {
      let query = supabase
        .from(T.messages)
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)

      if (before) {
        query = query.lt('created_at', before)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      const msgs = (data || []).reverse() // הודעות בסדר כרונולוגי
      
      if (before) {
        setMessages(prev => [...msgs, ...prev])
      } else {
        setMessages(msgs)
      }

      setHasMore((data || []).length === PAGE_SIZE)

      // טעינת פרופילים
      const userIds = msgs.map(m => m.user_id)
      await fetchProfiles(userIds)

      // טעינת reactions
      if (msgs.length > 0) {
        const msgIds = msgs.map(m => m.id)
        const { data: reactionsData } = await supabase
          .from(T.reactions)
          .select('*')
          .in('message_id', msgIds)

        if (reactionsData) {
          setReactions(prev => {
            const updated = { ...prev }
            reactionsData.forEach((r: ChatReactionRow) => {
              if (!updated[r.message_id]) updated[r.message_id] = []
              // avoid duplicates
              if (!updated[r.message_id].find(x => x.id === r.id)) {
                updated[r.message_id] = [...updated[r.message_id], r]
              }
            })
            return updated
          })
        }

        // טעינת reads
        const { data: readsData } = await supabase
          .from(T.reads)
          .select('message_id, user_id')
          .in('message_id', msgIds)

        if (readsData) {
          setMessageReads(prev => {
            const updated = { ...prev }
            readsData.forEach((r: { message_id: string; user_id: string }) => {
              if (!updated[r.message_id]) updated[r.message_id] = []
              if (!updated[r.message_id].includes(r.user_id)) {
                updated[r.message_id] = [...updated[r.message_id], r.user_id]
              }
            })
            return updated
          })
        }
      }
    } catch (err: any) {
      setError(err.message)
      console.error('Error fetching messages:', err)
    } finally {
      setLoading(false)
      loadingMore.current = false
    }
  }, [projectId, fetchProfiles])

  // --- Initial Load ---
  useEffect(() => {
    fetchMessages()
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  // --- Load More (pagination) ---
  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore.current || messages.length === 0) return
    loadingMore.current = true
    const oldest = messages[0]
    fetchMessages(oldest.created_at)
  }, [hasMore, messages, fetchMessages])

  // --- Real-time Messages ---
  useEffect(() => {
    if (!projectId) return

    const channel = supabase
      .channel(`v2-chat:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: T.messages,
          filter: `project_id=eq.${projectId}`,
        },
        async (payload) => {
          const newMsg = payload.new as ChatMessageRow
          setMessages(prev => {
            // avoid duplicate
            if (prev.find(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
          // load profile if needed
          await fetchProfiles([newMsg.user_id])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: T.messages,
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const updated = payload.new as ChatMessageRow
          setMessages(prev =>
            prev.map(m => m.id === updated.id ? updated : m)
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, fetchProfiles])

  // --- Real-time Reactions ---
  useEffect(() => {
    if (!projectId) return

    const channel = supabase
      .channel(`v2-chat-reactions:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: T.reactions,
        },
        () => {
          // פשוט רענון — כי reactions קשור ל-message_id ולא ל-project_id
          // בפרודקשן נוסיף filter יותר חכם
          if (messages.length > 0) {
            const msgIds = messages.map(m => m.id)
            supabase
              .from(T.reactions)
              .select('*')
              .in('message_id', msgIds)
              .then(({ data }) => {
                if (data) {
                  const grouped: Record<string, ChatReactionRow[]> = {}
                  data.forEach((r: ChatReactionRow) => {
                    if (!grouped[r.message_id]) grouped[r.message_id] = []
                    grouped[r.message_id].push(r)
                  })
                  setReactions(grouped)
                }
              })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, messages])

  // --- Real-time Reads ---
  useEffect(() => {
    if (!projectId || messages.length === 0) return

    const channel = supabase
      .channel(`v2-chat-reads:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: T.reads,
        },
        (payload) => {
          const newRead = payload.new as { message_id: string; user_id: string }
          // Only update if it's one of our loaded messages
          if (messages.find(m => m.id === newRead.message_id)) {
            setMessageReads(prev => {
              const updated = { ...prev }
              if (!updated[newRead.message_id]) updated[newRead.message_id] = []
              if (!updated[newRead.message_id].includes(newRead.user_id)) {
                updated[newRead.message_id] = [...updated[newRead.message_id], newRead.user_id]
              }
              return updated
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, messages])

  // --- Send Message ---
  const sendMessage = useCallback(
    async (content: string, replyTo?: string, messageType: 'message' | 'system' | 'ai_card' = 'message', metadata?: any): Promise<ChatMessageRow | null> => {
      if (!projectId) return null

      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const { data, error: insertError } = await supabase
          .from(T.messages)
          .insert({
            project_id: projectId,
            user_id: user.id,
            content,
            reply_to: replyTo || null,
            message_type: messageType,
            metadata: metadata || null,
          })
          .select()
          .single()

        if (insertError) throw insertError
        return data
      } catch (err: any) {
        setError(err.message)
        console.error('Error sending message:', err)
        return null
      }
    },
    [projectId]
  )

  // --- Delete Message (soft) ---
  const deleteMessage = useCallback(
    async (messageId: string): Promise<boolean> => {
      try {
        const { error } = await supabase
          .from(T.messages)
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', messageId)

        if (error) throw error
        return true
      } catch (err: any) {
        setError(err.message)
        return false
      }
    },
    []
  )

  // --- Add Reaction ---
  const addReaction = useCallback(
    async (messageId: string, emoji: string): Promise<boolean> => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const { error } = await supabase
          .from(T.reactions)
          .insert({ message_id: messageId, user_id: user.id, emoji })

        if (error) throw error
        return true
      } catch (err: any) {
        // ignore duplicate error
        return false
      }
    },
    []
  )

  // --- Remove Reaction ---
  const removeReaction = useCallback(
    async (messageId: string, emoji: string): Promise<boolean> => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const { error } = await supabase
          .from(T.reactions)
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', user.id)
          .eq('emoji', emoji)

        if (error) throw error
        return true
      } catch (err: any) {
        return false
      }
    },
    []
  )

  // --- Mark as Read ---
  const markAsRead = useCallback(
    async (messageIds: string[]): Promise<void> => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || messageIds.length === 0) return

        const inserts = messageIds.map(id => ({ message_id: id, user_id: user.id }))
        await supabase
          .from(T.reads)
          .upsert(inserts, { onConflict: 'message_id,user_id' })
      } catch (err) {
        // silent fail
      }
    },
    []
  )

  // --- Upload Attachment ---
  const uploadAndSend = useCallback(
    async (files: File[], content?: string, replyTo?: string): Promise<ChatMessageRow | null> => {
      if (!projectId) return null
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        // 1. שלח הודעה (עם טקסט או ברירת מחדל)
        const msgContent = content?.trim() || (files.length === 1 ? `📎 ${files[0].name}` : `📎 ${files.length} קבצים`)
        const { data: msgData, error: msgError } = await supabase
          .from(T.messages)
          .insert({
            project_id: projectId,
            user_id: user.id,
            content: msgContent,
            reply_to: replyTo || null,
            message_type: 'message',
          })
          .select()
          .single()

        if (msgError) throw msgError

        // 2. העלה כל קובץ ל-Storage ושמור ב-attachments
        for (const file of files) {
          const ext = file.name.split('.').pop() || 'bin'
          const path = `${user.id}/${projectId}/${msgData.id}/${Date.now()}.${ext}`

          const { error: uploadError } = await supabase.storage
            .from('chat-attachments')
            .upload(path, file, { contentType: file.type })

          if (uploadError) {
            console.error('Upload error:', uploadError)
            continue
          }

          const { data: urlData } = supabase.storage
            .from('chat-attachments')
            .getPublicUrl(path)

          await supabase
            .from(T.attachments)
            .insert({
              message_id: msgData.id,
              uploaded_by: user.id,
              file_name: file.name,
              file_type: file.type,
              file_size: file.size,
              file_url: urlData.publicUrl,
            })
        }

        return msgData
      } catch (err: any) {
        setError(err.message)
        console.error('Error uploading:', err)
        return null
      }
    },
    [projectId]
  )

  // --- Get Attachments for Messages ---
  const [attachments, setAttachments] = useState<Record<string, ChatAttachmentRow[]>>({})

  useEffect(() => {
    if (messages.length === 0) return
    const msgIds = messages.map(m => m.id)
    supabase
      .from(T.attachments)
      .select('*')
      .in('message_id', msgIds)
      .then(({ data }) => {
        if (data) {
          const grouped: Record<string, ChatAttachmentRow[]> = {}
          data.forEach((a: ChatAttachmentRow) => {
            if (!grouped[a.message_id]) grouped[a.message_id] = []
            grouped[a.message_id].push(a)
          })
          setAttachments(grouped)
        }
      })
  }, [messages])

  // --- Send Voice Message ---
  const sendVoiceMessage = useCallback(
    async (audioBlob: Blob, duration: number): Promise<ChatMessageRow | null> => {
      if (!projectId) return null
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        // 1. Create voice message immediately (shows in chat via realtime)
        const durationText = duration < 60
          ? `0:${Math.round(duration).toString().padStart(2, '0')}`
          : `${Math.floor(duration / 60)}:${Math.round(duration % 60).toString().padStart(2, '0')}`

        const { data: msgData, error: msgError } = await supabase
          .from(T.messages)
          .insert({
            project_id: projectId,
            user_id: user.id,
            content: `🎤 הודעה קולית (${durationText})`,
            message_type: 'voice',
            metadata: { duration },
          })
          .select()
          .single()

        if (msgError) throw msgError

        // 2. Upload audio (background — message already visible)
        const ext = audioBlob.type.includes('webm') ? 'webm' : audioBlob.type.includes('ogg') ? 'ogg' : 'mp4'
        const path = `${user.id}/${projectId}/${msgData.id}/voice.${ext}`

        supabase.storage
          .from('chat-attachments')
          .upload(path, audioBlob, { contentType: audioBlob.type })
          .then(({ error: uploadError }) => {
            if (uploadError) {
              console.error('Voice upload error:', uploadError)
              return
            }
            const { data: urlData } = supabase.storage
              .from('chat-attachments')
              .getPublicUrl(path)

            supabase
              .from(T.attachments)
              .insert({
                message_id: msgData.id,
                uploaded_by: user.id,
                file_name: `voice.${ext}`,
                file_type: audioBlob.type,
                file_size: audioBlob.size,
                file_url: urlData.publicUrl,
              })
              .then(() => {
                // Trigger attachment refetch
                const msgIds = messages.map(m => m.id)
                if (!msgIds.includes(msgData.id)) msgIds.push(msgData.id)
                supabase
                  .from(T.attachments)
                  .select('*')
                  .in('message_id', msgIds)
                  .then(({ data }) => {
                    if (data) {
                      const grouped: Record<string, ChatAttachmentRow[]> = {}
                      data.forEach((a: ChatAttachmentRow) => {
                        if (!grouped[a.message_id]) grouped[a.message_id] = []
                        grouped[a.message_id].push(a)
                      })
                      setAttachments(grouped)
                    }
                  })
              })
          })

        return msgData
      } catch (err: any) {
        setError(err.message)
        console.error('Error sending voice:', err)
        return null
      }
    },
    [projectId, messages]
  )

  // --- Forward Message ---
  const forwardMessage = useCallback(
    async (
      originalMessage: ChatMessageRow,
      targetProjectId: string,
      targetProjectName: string,
      originalProjectName: string,
      originalAttachments?: ChatAttachmentRow[]
    ): Promise<ChatMessageRow | null> => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const originalProfile = profiles[originalMessage.user_id]
        const forwardedFrom: ForwardedFrom = {
          original_message_id: originalMessage.id,
          original_project_id: originalMessage.project_id,
          original_project_name: originalProjectName,
          original_user_id: originalMessage.user_id,
          original_user_name: originalProfile?.full_name || 'משתמש',
          original_created_at: originalMessage.created_at,
        }

        // Create forwarded message in target project
        const { data: msgData, error: msgError } = await supabase
          .from(T.messages)
          .insert({
            project_id: targetProjectId,
            user_id: user.id,
            content: originalMessage.content,
            message_type: 'forwarded',
            metadata: originalMessage.metadata,
            forwarded_from: forwardedFrom,
          })
          .select()
          .single()

        if (msgError) throw msgError

        // Copy attachments if any
        if (originalAttachments && originalAttachments.length > 0) {
          for (const att of originalAttachments) {
            await supabase
              .from(T.attachments)
              .insert({
                message_id: msgData.id,
                uploaded_by: user.id,
                file_name: att.file_name,
                file_type: att.file_type,
                file_size: att.file_size,
                file_url: att.file_url, // reuse same Storage URL
              })
          }
        }

        return msgData
      } catch (err: any) {
        setError(err.message)
        console.error('Error forwarding:', err)
        return null
      }
    },
    [profiles]
  )

  return {
    messages,
    profiles,
    reactions,
    messageReads,
    attachments,
    loading,
    error,
    hasMore,
    loadMore,
    sendMessage,
    uploadAndSend,
    sendVoiceMessage,
    forwardMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    markAsRead,
    refresh: () => fetchMessages(),
  }
}