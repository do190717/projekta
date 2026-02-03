// ===========================================
// Projekta - useTopics Hook (v2 isolated)
// ===========================================
// Hook ראשי לניהול נושאים מובנים
// טבלאות עם prefix: v2_
// ===========================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import type {
  TopicRow,
  TopicItemRow,
  TopicItemResponseRow,
  ThreadMessageRow,
  TopicWithDetails,
  TopicFilters,
  CreateTopicForm,
  ResponseType,
  TopicStatus,
  ItemStatus,
  MiniProfile,
} from './types'
import { canTransitionTopic, canTransitionItem } from './types'

const supabase = createClient()

// ====== TABLE NAMES (v2 isolated) ======
const T = {
  topics: 'v2_topics',
  items: 'v2_topic_items',
  responses: 'v2_topic_item_responses',
  threads: 'v2_thread_messages',
  decisions: 'v2_topic_decisions',
  attachments: 'v2_topic_attachments',
} as const


// ====== HOOK: useTopics ======

export function useTopics(projectId: string | null) {
  const [topics, setTopics] = useState<TopicRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<TopicFilters>({
    status: 'all',
    type: 'all',
    priority: 'all',
    search: '',
  })

  const fetchTopics = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from(T.topics)
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }
      if (filters.type !== 'all') {
        query = query.eq('topic_type', filters.type)
      }
      if (filters.priority !== 'all') {
        query = query.eq('priority', filters.priority)
      }
      if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError
      setTopics(data || [])
    } catch (err: any) {
      setError(err.message)
      console.error('Error fetching topics:', err)
    } finally {
      setLoading(false)
    }
  }, [projectId, filters])

  useEffect(() => {
    fetchTopics()
  }, [fetchTopics])

  // Real-time
  useEffect(() => {
    if (!projectId) return

    const channel = supabase
      .channel(`v2-topics:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: T.topics,
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTopics((prev) => [payload.new as TopicRow, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setTopics((prev) =>
              prev.map((t) => (t.id === payload.new.id ? (payload.new as TopicRow) : t))
            )
          } else if (payload.eventType === 'DELETE') {
            setTopics((prev) => prev.filter((t) => t.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId])

  // יצירת נושא
  const createTopic = useCallback(
    async (form: CreateTopicForm): Promise<TopicRow | null> => {
      if (!projectId) return null

      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const { data: topic, error: topicError } = await supabase
          .from(T.topics)
          .insert({
            project_id: projectId,
            created_by: user.id,
            title: form.title,
            description: form.description || null,
            topic_type: form.topic_type,
            priority: form.priority,
            deadline: form.deadline || null,
          })
          .select()
          .single()

        if (topicError) throw topicError

        if (form.items.length > 0) {
          const itemsToInsert = form.items.map((item, index) => ({
            topic_id: topic.id,
            created_by: user.id,
            item_number: index + 1,
            title: item.title,
            description: item.description || null,
          }))

          const { error: itemsError } = await supabase
            .from(T.items)
            .insert(itemsToInsert)

          if (itemsError) throw itemsError
        }

        return topic
      } catch (err: any) {
        setError(err.message)
        console.error('Error creating topic:', err)
        return null
      }
    },
    [projectId]
  )

  // עדכון סטטוס
  const updateTopicStatus = useCallback(
    async (topicId: string, newStatus: TopicStatus): Promise<boolean> => {
      try {
        const topic = topics.find((t) => t.id === topicId)
        if (!topic) throw new Error('Topic not found')
        if (!canTransitionTopic(topic.status as TopicStatus, newStatus)) {
          throw new Error(`Cannot transition from ${topic.status} to ${newStatus}`)
        }

        const { error } = await supabase
          .from(T.topics)
          .update({ status: newStatus })
          .eq('id', topicId)

        if (error) throw error
        return true
      } catch (err: any) {
        setError(err.message)
        return false
      }
    },
    [topics]
  )

  // סגירת נושא
  const closeTopic = useCallback(
    async (topicId: string, summary: string): Promise<boolean> => {
      try {
        const { data, error } = await supabase.rpc('v2_close_topic_with_decision', {
          p_topic_id: topicId,
          p_summary: summary,
        })

        if (error) throw error
        return true
      } catch (err: any) {
        setError(err.message)
        return false
      }
    },
    []
  )

  return {
    topics,
    loading,
    error,
    filters,
    setFilters,
    createTopic,
    updateTopicStatus,
    closeTopic,
    refresh: fetchTopics,
  }
}


// ====== HOOK: useTopicDetail ======

export function useTopicDetail(topicId: string | null) {
  const [topic, setTopic] = useState<TopicRow | null>(null)
  const [items, setItems] = useState<TopicItemRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTopic = useCallback(async () => {
    if (!topicId) return
    setLoading(true)

    try {
      const { data: topicData, error: topicError } = await supabase
        .from(T.topics)
        .select('*')
        .eq('id', topicId)
        .single()

      if (topicError) throw topicError
      setTopic(topicData)

      const { data: itemsData, error: itemsError } = await supabase
        .from(T.items)
        .select('*')
        .eq('topic_id', topicId)
        .order('item_number')

      if (itemsError) throw itemsError
      setItems(itemsData || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [topicId])

  useEffect(() => {
    fetchTopic()
  }, [fetchTopic])

  // Real-time
  useEffect(() => {
    if (!topicId) return

    const channel = supabase
      .channel(`v2-items:${topicId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: T.items,
          filter: `topic_id=eq.${topicId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setItems((prev) => [...prev, payload.new as TopicItemRow].sort(
              (a, b) => a.item_number - b.item_number
            ))
          } else if (payload.eventType === 'UPDATE') {
            setItems((prev) =>
              prev.map((i) => (i.id === payload.new.id ? (payload.new as TopicItemRow) : i))
            )
          } else if (payload.eventType === 'DELETE') {
            setItems((prev) => prev.filter((i) => i.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [topicId])

  // Real-time על הנושא עצמו (לעדכון ספירות)
  useEffect(() => {
    if (!topicId) return

    const channel = supabase
      .channel(`v2-topic:${topicId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: T.topics,
          filter: `id=eq.${topicId}`,
        },
        (payload) => {
          setTopic(payload.new as TopicRow)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [topicId])

  // הוספת סעיף
  const addItem = useCallback(
    async (title: string, description?: string): Promise<boolean> => {
      if (!topicId) return false
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const nextNumber = items.length > 0 ? Math.max(...items.map((i) => i.item_number)) + 1 : 1

        const { error } = await supabase.from(T.items).insert({
          topic_id: topicId,
          created_by: user.id,
          item_number: nextNumber,
          title,
          description: description || null,
        })

        if (error) throw error
        return true
      } catch (err: any) {
        setError(err.message)
        return false
      }
    },
    [topicId, items]
  )

  // תגובה לסעיף
  const respondToItem = useCallback(
    async (itemId: string, responseType: ResponseType, comment?: string): Promise<boolean> => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const { error } = await supabase
          .from(T.responses)
          .upsert(
            {
              item_id: itemId,
              user_id: user.id,
              response_type: responseType,
              comment: comment || null,
            },
            { onConflict: 'item_id,user_id' }
          )

        if (error) throw error

        // עדכון סטטוס הסעיף
        const newStatus: ItemStatus = 
          responseType === 'accept' ? 'accepted' :
          responseType === 'reject' ? 'rejected' :
          'in_discussion'

        const item = items.find((i) => i.id === itemId)
        if (item && canTransitionItem(item.status as ItemStatus, newStatus)) {
          await supabase
            .from(T.items)
            .update({ status: newStatus })
            .eq('id', itemId)
        }

        return true
      } catch (err: any) {
        setError(err.message)
        return false
      }
    },
    [items]
  )

  // עדכון סטטוס סעיף
  const updateItemStatus = useCallback(
    async (itemId: string, newStatus: ItemStatus): Promise<boolean> => {
      try {
        const item = items.find((i) => i.id === itemId)
        if (!item) throw new Error('Item not found')
        if (!canTransitionItem(item.status as ItemStatus, newStatus)) {
          throw new Error(`Cannot transition from ${item.status} to ${newStatus}`)
        }

        const updates: any = { status: newStatus }
        if (newStatus === 'resolved') {
          updates.resolved_at = new Date().toISOString()
        }

        const { error } = await supabase
          .from(T.items)
          .update(updates)
          .eq('id', itemId)

        if (error) throw error
        return true
      } catch (err: any) {
        setError(err.message)
        return false
      }
    },
    [items]
  )

  return {
    topic,
    items,
    loading,
    error,
    addItem,
    respondToItem,
    updateItemStatus,
    refresh: fetchTopic,
  }
}


// ====== HOOK: useItemThread ======

export function useItemThread(itemId: string | null) {
  const [messages, setMessages] = useState<ThreadMessageRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMessages = useCallback(async () => {
    if (!itemId) return
    setLoading(true)

    try {
      const { data, error: fetchError } = await supabase
        .from(T.threads)
        .select('*')
        .eq('item_id', itemId)
        .order('created_at', { ascending: true })

      if (fetchError) throw fetchError
      setMessages(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [itemId])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  // Real-time
  useEffect(() => {
    if (!itemId) return

    const channel = supabase
      .channel(`v2-thread:${itemId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: T.threads,
          filter: `item_id=eq.${itemId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ThreadMessageRow])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [itemId])

  const sendMessage = useCallback(
    async (content: string, replyTo?: string): Promise<boolean> => {
      if (!itemId) return false
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const { error } = await supabase.from(T.threads).insert({
          item_id: itemId,
          user_id: user.id,
          content,
          reply_to: replyTo || null,
        })

        if (error) throw error
        return true
      } catch (err: any) {
        setError(err.message)
        return false
      }
    },
    [itemId]
  )

  return {
    messages,
    loading,
    error,
    sendMessage,
    refresh: fetchMessages,
  }
}


// ====== HOOK: useItemResponses ======

export function useItemResponses(itemId: string | null) {
  const [responses, setResponses] = useState<(TopicItemResponseRow & { user: MiniProfile })[]>([])
  const [loading, setLoading] = useState(false)

  const fetchResponses = useCallback(async () => {
    if (!itemId) return
    setLoading(true)

    try {
      // שליפת תגובות
      const { data: responseData, error: respError } = await supabase
        .from(T.responses)
        .select('*')
        .eq('item_id', itemId)

      if (respError) throw respError
      if (!responseData || responseData.length === 0) {
        setResponses([])
        setLoading(false)
        return
      }

      // שליפת פרופילים בנפרד
      const userIds = [...new Set(responseData.map((r: any) => r.user_id))]
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds)

      const profilesMap: Record<string, MiniProfile> = {}
      ;(profilesData || []).forEach((p: any) => {
        profilesMap[p.id] = p
      })

      const mapped = responseData.map((r: any) => ({
        ...r,
        user: profilesMap[r.user_id] || { id: r.user_id, full_name: null, avatar_url: null },
      }))
      setResponses(mapped)
    } catch (err) {
      console.error('Error fetching responses:', err)
    } finally {
      setLoading(false)
    }
  }, [itemId])

  useEffect(() => {
    fetchResponses()
  }, [fetchResponses])

  // Real-time
  useEffect(() => {
    if (!itemId) return

    const channel = supabase
      .channel(`v2-responses:${itemId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: T.responses,
          filter: `item_id=eq.${itemId}`,
        },
        () => {
          fetchResponses()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [itemId, fetchResponses])

  return { responses, loading, refresh: fetchResponses }
}