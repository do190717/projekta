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
      padding: isMobile ? '16px' : '50px',
      maxWidth: '800px',
      margin: '0 auto',
      minHeight: '100vh',
      fontFamily: 'Heebo, sans-serif',
      direction: 'rtl',
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'start' : 'center',
        marginBottom: isMobile ? '24px' : '30px',
        gap: isMobile ? '12px' : '0',
      }}>
        <h1 style={{
          fontSize: isMobile ? '28px' : '36px',
          fontWeight: '700',
          margin: 0,
          color: '#1e293b',
        }}>
          📂 הפרויקטים שלי
        </h1>
        <a 
          href="/" 
          style={{ 
            color: '#6366F1',
            textDecoration: 'none',
            fontSize: isMobile ? '14px' : '16px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          → חזרה לדף הבית
        </a>
      </div>

      {/* Create Project Form */}
      <form 
        onSubmit={createProject} 
        style={{ 
          marginBottom: isMobile ? '24px' : '30px',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '12px' : '10px',
        }}
      >
        <input
          type="text"
          placeholder="שם הפרויקט החדש..."
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.target.value)}
          style={{
            flex: 1,
            padding: isMobile ? '14px 16px' : '12px',
            border: '2px solid #e5e7eb',
            borderRadius: isMobile ? '12px' : '8px',
            fontSize: '16px',
            fontFamily: 'Heebo, sans-serif',
            outline: 'none',
            transition: 'border-color 0.2s',
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
            padding: isMobile ? '14px 24px' : '12px 24px',
            backgroundColor: '#6366F1',
            color: 'white',
            border: 'none',
            borderRadius: isMobile ? '12px' : '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            fontFamily: 'Heebo, sans-serif',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#4F46E5'
            e.currentTarget.style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#6366F1'
            e.currentTarget.style.transform = 'translateY(0)'
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
          borderRadius: isMobile ? '16px' : '12px',
          border: '2px dashed #e5e7eb',
        }}>
          <p style={{ 
            fontSize: isMobile ? '48px' : '64px',
            margin: '0 0 16px 0',
          }}>
            📋
          </p>
          <p style={{ 
            color: '#64748b',
            fontSize: isMobile ? '16px' : '18px',
            margin: '0 0 8px 0',
            fontWeight: '600',
          }}>
            אין פרויקטים עדיין
          </p>
          <p style={{ 
            color: '#94a3b8',
            fontSize: isMobile ? '14px' : '15px',
            margin: 0,
          }}>
            צור את הפרויקט הראשון שלך למעלה!
          </p>
        </div>
      ) : (
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: isMobile ? '12px' : '10px',
        }}>
          {projects.map((project) => (
            <div
              key={project.id}
              style={{
                padding: isMobile ? '16px' : '15px 20px',
                backgroundColor: 'white',
                borderRadius: isMobile ? '12px' : '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: '1px solid #f1f5f9',
                transition: 'all 0.2s',
                gap: isMobile ? '12px' : '16px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.borderColor = '#6366F1'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
                e.currentTarget.style.transform = 'translateY(0)'
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
                  fontSize: isMobile ? '16px' : '15px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span style={{ fontSize: isMobile ? '20px' : '18px' }}>📁</span>
                {project.name}
              </a>
              <button
                onClick={() => deleteProject(project.id)}
                style={{
                  padding: isMobile ? '10px 16px' : '8px 16px',
                  backgroundColor: '#EF4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: isMobile ? '10px' : '6px',
                  cursor: 'pointer',
                  fontSize: isMobile ? '14px' : '13px',
                  fontWeight: '600',
                  fontFamily: 'Heebo, sans-serif',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#DC2626'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#EF4444'
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
          marginTop: isMobile ? '24px' : '32px',
          padding: isMobile ? '16px' : '20px',
          backgroundColor: '#f8fafc',
          borderRadius: isMobile ? '12px' : '8px',
          textAlign: 'center',
        }}>
          <p style={{
            margin: 0,
            color: '#64748b',
            fontSize: isMobile ? '13px' : '14px',
          }}>
            💡 יש לך <strong style={{ color: '#6366F1' }}>{projects.length}</strong> {projects.length === 1 ? 'פרויקט' : 'פרויקטים'} פעילים
          </p>
        </div>
      )}
    </div>
  )
}
