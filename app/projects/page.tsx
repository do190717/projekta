'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useIsMobile } from '@/hooks/useIsMobile'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [newProjectName, setNewProjectName] = useState('')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const isMobile = useIsMobile()

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
    return (
      <div style={{ 
        padding: isMobile ? '20px' : '50px', 
        textAlign: 'center',
        fontFamily: 'Heebo, sans-serif',
      }}>
        טוען...
      </div>
    )
  }

  return (
    <div style={{ 
      padding: isMobile ? '20px' : '50px',
      maxWidth: '800px',
      margin: '0 auto',
      minHeight: '100vh',
      fontFamily: 'Heebo, sans-serif',
      direction: 'rtl',
    }}>
      {/* Header - Mobile Centered */}
      <div style={{ 
        marginBottom: isMobile ? '32px' : '40px',
      }}>
        {/* Title - Always Centered on Mobile */}
        <h1 style={{
          fontSize: isMobile ? '32px' : '36px',
          fontWeight: '700',
          margin: '0 0 16px 0',
          color: '#1e293b',
          textAlign: isMobile ? 'center' : 'right',
        }}>
          📂 הפרויקטים שלי
        </h1>
        
        {/* Back Link - Centered on Mobile */}
        <a 
          href="/" 
          style={{ 
            color: '#6366F1',
            textDecoration: 'none',
            fontSize: isMobile ? '16px' : '16px',
            fontWeight: '600',
            display: isMobile ? 'block' : 'inline-flex',
            textAlign: isMobile ? 'center' : 'right',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          ← חזרה לדף הבית
        </a>
      </div>

      {/* Create Project Form */}
      <form 
        onSubmit={createProject} 
        style={{ 
          marginBottom: isMobile ? '32px' : '30px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <input
          type="text"
          placeholder="שם הפרויקט החדש..."
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.target.value)}
          style={{
            width: '100%',
            padding: '16px',
            border: '2px solid #e5e7eb',
            borderRadius: '12px',
            fontSize: '16px',
            fontFamily: 'Heebo, sans-serif',
            outline: 'none',
            transition: 'border-color 0.2s',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#6366F1'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#e5e7eb'
          }}
        />
        <button
          type="submit"
          style={{
            width: '100%',
            padding: '16px',
            backgroundColor: '#6366F1',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '700',
            fontFamily: 'Heebo, sans-serif',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#4F46E5'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#6366F1'
          }}
        >
          ➕ צור פרויקט
        </button>
      </form>

      {/* Projects List */}
      {projects.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: isMobile ? '60px 20px' : '80px 40px',
          backgroundColor: 'white',
          borderRadius: '16px',
          border: '2px dashed #e5e7eb',
        }}>
          <p style={{ 
            fontSize: '64px',
            margin: '0 0 16px 0',
          }}>
            📋
          </p>
          <p style={{ 
            color: '#64748b',
            fontSize: '18px',
            margin: '0 0 8px 0',
            fontWeight: '600',
          }}>
            אין פרויקטים עדיין
          </p>
          <p style={{ 
            color: '#94a3b8',
            fontSize: '15px',
            margin: 0,
          }}>
            צור את הפרויקט הראשון שלך למעלה!
          </p>
        </div>
      ) : (
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          {projects.map((project) => (
            <div
              key={project.id}
              style={{
                padding: '20px',
                backgroundColor: 'white',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'stretch' : 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: '2px solid #f1f5f9',
                transition: 'all 0.2s',
                gap: '16px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(99,102,241,0.15)'
                e.currentTarget.style.borderColor = '#6366F1'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'
                e.currentTarget.style.borderColor = '#f1f5f9'
              }}
            >
              <a 
                href={`/projects/${project.id}`}
                style={{ 
                  fontWeight: '600',
                  color: '#1e293b',
                  textDecoration: 'none',
                  flex: 1,
                  fontSize: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <span style={{ fontSize: '24px' }}>📁</span>
                {project.name}
              </a>
              <button
                onClick={() => deleteProject(project.id)}
                style={{
                  padding: '14px 24px',
                  backgroundColor: '#EF4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: '700',
                  fontFamily: 'Heebo, sans-serif',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  width: isMobile ? '100%' : 'auto',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#DC2626'
                  e.currentTarget.style.transform = 'scale(1.02)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#EF4444'
                  e.currentTarget.style.transform = 'scale(1)'
                }}
              >
                🗑️ מחק
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Footer info */}
      {projects.length > 0 && (
        <div style={{
          marginTop: '32px',
          padding: '20px',
          backgroundColor: '#EFF6FF',
          borderRadius: '12px',
          textAlign: 'center',
          border: '2px solid #DBEAFE',
        }}>
          <p style={{
            margin: 0,
            color: '#1e40af',
            fontSize: '15px',
            fontWeight: '600',
          }}>
            💡 יש לך <strong style={{ color: '#6366F1', fontSize: '18px' }}>{projects.length}</strong> {projects.length === 1 ? 'פרויקט' : 'פרויקטים'} פעילים
          </p>
        </div>
      )}
    </div>
  )
}
