// ===========================================
// Projekta Chat v2 — useTasks Hook
// ===========================================
// ניהול משימות והחלטות שנגזרות מהצ'אט
// נתיב: lib/updates-v2/useTasks.ts
// ===========================================

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

// --- Types ---

export interface ChatTask {
  id: string
  project_id: string
  source_message_id: string | null
  created_by: string
  title: string
  category: string
  status: 'pending' | 'scheduled' | 'in_progress' | 'blocked' | 'done'
  priority: 'low' | 'medium' | 'high' | 'critical'
  assignee_id: string | null
  assignee_name: string | null
  deadline: string | null
  completed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ChatDecision {
  id: string
  project_id: string
  source_message_id: string | null
  created_by: string
  text: string
  participants: string[]
  related_task_ids: string[]
  created_at: string
}

// --- Hook ---

export function useTasks(projectId: string | null) {
  const [tasks, setTasks] = useState<ChatTask[]>([])
  const [decisions, setDecisions] = useState<ChatDecision[]>([])
  const [loading, setLoading] = useState(true)

  // --- Fetch Tasks ---
  const fetchTasks = useCallback(async () => {
    if (!projectId) return
    const { data } = await supabase
      .from('v2_chat_tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
    if (data) setTasks(data)
  }, [projectId])

  // --- Fetch Decisions ---
  const fetchDecisions = useCallback(async () => {
    if (!projectId) return
    const { data } = await supabase
      .from('v2_chat_decisions')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
    if (data) setDecisions(data)
  }, [projectId])

  // --- Initial Load ---
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([fetchTasks(), fetchDecisions()])
      setLoading(false)
    }
    load()
  }, [fetchTasks, fetchDecisions])

  // --- Create Task ---
  const createTask = useCallback(async (task: {
    title: string
    category?: string
    priority?: ChatTask['priority']
    assignee_name?: string
    deadline?: string
    source_message_id?: string
  }): Promise<ChatTask | null> => {
    if (!projectId) return null
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('v2_chat_tasks')
      .insert({
        project_id: projectId,
        created_by: user.id,
        title: task.title,
        category: task.category || 'כללי',
        priority: task.priority || 'medium',
        assignee_name: task.assignee_name || null,
        deadline: task.deadline || null,
        source_message_id: task.source_message_id || null,
      })
      .select()
      .single()

    if (error) { console.error('Create task error:', error); return null }
    await fetchTasks()
    return data
  }, [projectId, fetchTasks])

  // --- Update Task Status ---
  const updateTaskStatus = useCallback(async (
    taskId: string,
    status: ChatTask['status']
  ): Promise<boolean> => {
    const update: any = { status }
    if (status === 'done') update.completed_at = new Date().toISOString()
    if (status !== 'done') update.completed_at = null

    const { error } = await supabase
      .from('v2_chat_tasks')
      .update(update)
      .eq('id', taskId)

    if (error) { console.error('Update task error:', error); return false }
    await fetchTasks()
    return true
  }, [fetchTasks])

  // --- Update Task ---
  const updateTask = useCallback(async (
    taskId: string,
    updates: Partial<Pick<ChatTask, 'title' | 'category' | 'priority' | 'assignee_name' | 'deadline' | 'notes'>>
  ): Promise<boolean> => {
    const { error } = await supabase
      .from('v2_chat_tasks')
      .update(updates)
      .eq('id', taskId)

    if (error) { console.error('Update task error:', error); return false }
    await fetchTasks()
    return true
  }, [fetchTasks])

  // --- Delete Task ---
  const deleteTask = useCallback(async (taskId: string): Promise<boolean> => {
    const { error } = await supabase
      .from('v2_chat_tasks')
      .delete()
      .eq('id', taskId)

    if (error) { console.error('Delete task error:', error); return false }
    await fetchTasks()
    return true
  }, [fetchTasks])

  // --- Create Decision ---
  const createDecision = useCallback(async (decision: {
    text: string
    participants?: string[]
    related_task_ids?: string[]
    source_message_id?: string
  }): Promise<ChatDecision | null> => {
    if (!projectId) return null
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('v2_chat_decisions')
      .insert({
        project_id: projectId,
        created_by: user.id,
        text: decision.text,
        participants: decision.participants || [],
        related_task_ids: decision.related_task_ids || [],
        source_message_id: decision.source_message_id || null,
      })
      .select()
      .single()

    if (error) { console.error('Create decision error:', error); return null }
    await fetchDecisions()
    return data
  }, [projectId, fetchDecisions])

  // --- Search Messages ---
  const searchMessages = useCallback(async (query: string): Promise<any[]> => {
    if (!projectId || query.length < 2) return []

    // נסה FTS קודם
    const { data, error } = await supabase
      .from('v2_chat_messages')
      .select('*')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .textSearch('content', query, { type: 'plain' })
      .order('created_at', { ascending: false })
      .limit(20)

    if (error || !data || data.length === 0) {
      // Fallback ל-ILIKE
      const { data: fallback } = await supabase
        .from('v2_chat_messages')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .ilike('content', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(20)
      return fallback || []
    }
    return data
  }, [projectId])

  // --- Stats ---
  const taskStats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    scheduled: tasks.filter(t => t.status === 'scheduled').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
    done: tasks.filter(t => t.status === 'done').length,
  }

  return {
    tasks,
    decisions,
    taskStats,
    loading,
    createTask,
    updateTaskStatus,
    updateTask,
    deleteTask,
    createDecision,
    searchMessages,
    refresh: () => { fetchTasks(); fetchDecisions() },
  }
}
