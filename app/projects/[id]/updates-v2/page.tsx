'use client'

// ===========================================
// Projekta Smart Chat — Page
// נתיב: app/projects/[id]/updates-v2/page.tsx
// ===========================================

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import SmartChat from '@/components/updates-v2/SmartChat'
import Sidebar from '../components/Sidebar'
import { useIsMobile } from '@/hooks/useIsMobile'

const supabase = createClient()

export default function ChatV2Page() {
  const params = useParams()
  const router = useRouter()
  const isMobile = useIsMobile()
  if (!params?.id) {
  return <div>Invalid project ID</div>
}
const projectId = params.id as string

  const [user, setUser] = useState<any>(null)
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      const { data: projectData } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      setProject(projectData)
      setLoading(false)
    }
    init()
  }, [projectId, router])

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', fontFamily: "'Heebo', sans-serif",
        backgroundColor: '#F1F5F9', color: '#64748B',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12, animation: 'pulse 1.5s infinite' }}>🏗️</div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>טוען...</div>
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.35} }`}</style>
      </div>
    )
  }

  if (!project) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', fontFamily: "'Heebo', sans-serif",
        backgroundColor: '#F1F5F9', color: '#64748B', direction: 'rtl',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>❌</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>פרויקט לא נמצא</div>
          <button onClick={() => router.push('/projects')} style={{
            marginTop: 12, padding: '8px 20px', borderRadius: 8,
            border: 'none', backgroundColor: '#4F46E5', color: '#fff',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
            fontFamily: "'Heebo', sans-serif",
          }}>חזרה לפרויקטים</button>
        </div>
      </div>
    )
  }

  // === MOBILE ===
  if (isMobile) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <SmartChat
          projectId={projectId}
          projectName={project.name || 'פרויקט'}
          currentUserId={user.id}
          isMobile={true}
        />
      </div>
    )
  }

  // === DESKTOP ===
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar projectName={project.name} />

      <div style={{
        marginRight: '260px',
        flex: 1,
        backgroundColor: '#F1F5F9',
        fontFamily: "'Heebo', sans-serif",
        direction: 'rtl',
        display: 'flex',
        justifyContent: 'center',
        height: '100vh',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '800px',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <SmartChat
            projectId={projectId}
            projectName={project.name || 'פרויקט'}
            currentUserId={user.id}
            isMobile={false}
          />
        </div>
      </div>
    </div>
  )
}
