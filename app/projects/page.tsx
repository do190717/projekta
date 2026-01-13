'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [newProjectName, setNewProjectName] = useState('')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      setUser(user)
      fetchProjects(user.id)
    }
    init()
  }, [])

  const fetchProjects = async (userId: string) => {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
    
    setProjects(data || [])
    setLoading(false)
  }

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProjectName.trim() || !user) return

    const { error } = await supabase
      .from('projects')
      .insert({ name: newProjectName, owner_id: user.id })

    if (!error) {
      setNewProjectName('')
      fetchProjects(user.id)
    }
  }

  const deleteProject = async (projectId: string) => {
    if (!confirm('האם למחוק את הפרויקט?')) return
    
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)

    if (!error && user) {
      fetchProjects(user.id)
    }
  }

  if (loading) {
    return <div style={{ padding: '50px', textAlign: 'center' }}>טוען...</div>
  }

  return (
    <div style={{ padding: '50px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>הפרויקטים שלי</h1>
        <a href="/" style={{ color: 'var(--primary)' }}>→ חזרה לדף הבית</a>
      </div>

      <form onSubmit={createProject} style={{ marginBottom: '30px', display: 'flex', gap: '10px' }}>
        <input
          type="text"
          placeholder="שם הפרויקט..."
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.target.value)}
          style={{
            flex: 1,
            padding: '12px',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            fontSize: '16px',
          }}
        />
        <button
          type="submit"
          style={{
            padding: '12px 24px',
            backgroundColor: 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '500',
          }}
        >
          צור פרויקט
        </button>
      </form>

      {projects.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--text-light)' }}>אין פרויקטים עדיין. צור את הראשון!</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {projects.map((project) => (
            <div
              key={project.id}
              style={{
                padding: '15px 20px',
                backgroundColor: 'var(--card)',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              <a 
                href={`/projects/${project.id}`}
                style={{ fontWeight: '500', color: 'var(--text)', textDecoration: 'none', flex: 1 }}
              >
                {project.name}
              </a>
              <button
                onClick={() => deleteProject(project.id)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'var(--danger)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                מחק
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}