'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const ROLES: { [key: string]: { name: string; icon: string } } = {
  admin: { name: 'מנהל', icon: '👑' },
  member: { name: 'חבר צוות', icon: '👷' },
  viewer: { name: 'צופה', icon: '👁️' },
}

export default function InvitePage() {
  const params = useParams()
  const token = params.token as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [invitation, setInvitation] = useState<any>(null)
  const [project, setProject] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [accepting, setAccepting] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    if (!token) {
      setError('לינק לא תקין')
      setLoading(false)
      return
    }

    const init = async () => {
      try {
        // Check if user is logged in
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        setUser(currentUser)

        // Find invitation by token
        const { data: inv, error: invError } = await supabase
          .from('invitations')
          .select('*')
          .eq('token', token)
          .single()

        if (invError || !inv) {
          setError('הזמנה לא נמצאה או פגה תוקפה')
          setLoading(false)
          return
        }

        if (inv.accepted) {
          setError('הזמנה זו כבר נוצלה')
          setLoading(false)
          return
        }

        setInvitation(inv)

        // Get project details
        const { data: proj } = await supabase
          .from('projects')
          .select('*')
          .eq('id', inv.project_id)
          .single()

        setProject(proj)
        setLoading(false)
      } catch (err) {
        console.error('Error:', err)
        setError('שגיאה בטעינת ההזמנה')
        setLoading(false)
      }
    }

    init()
  }, [token])

  const acceptInvitation = async () => {
    if (!user || !invitation) return

    setAccepting(true)

    try {
      // Check if already a member
      const { data: existingMember } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', invitation.project_id)
        .eq('user_id', user.id)
        .single()

      if (existingMember) {
        window.location.href = `/projects/${invitation.project_id}`
        return
      }

      // Add as member
      const { error: memberError } = await supabase
        .from('project_members')
        .insert({
          project_id: invitation.project_id,
          user_id: user.id,
          role: invitation.role
        })

      if (memberError) throw memberError

      // Mark invitation as accepted
      await supabase
        .from('invitations')
        .update({ accepted: true })
        .eq('id', invitation.id)

      // Update user's phone if invitation has phone
      if (invitation.phone) {
        await supabase
          .from('profiles')
          .update({ phone: invitation.phone })
          .eq('id', user.id)
      }

      // Redirect to project
      window.location.href = `/projects/${invitation.project_id}`
    } catch (err) {
      console.error('Error accepting:', err)
      setError('שגיאה בקבלת ההזמנה')
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        padding: '20px'
      }}>
        <p style={{ fontSize: '18px' }}>טוען...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        padding: '20px'
      }}>
        <div style={{ 
          backgroundColor: 'white', 
          padding: '40px', 
          borderRadius: '16px',
          textAlign: 'center',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}>
          <p style={{ fontSize: '48px', marginBottom: '20px' }}>😕</p>
          <h2 style={{ marginBottom: '15px', color: '#dc2626' }}>{error}</h2>
          <a 
            href="/projects" 
            style={{ 
              color: '#2563eb',
              textDecoration: 'none'
            }}
          >
            → לדף הפרויקטים
          </a>
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#f5f5f5',
      padding: '20px'
    }}>
      <div style={{ 
        backgroundColor: 'white', 
        padding: '40px', 
        borderRadius: '16px',
        textAlign: 'center',
        maxWidth: '450px',
        width: '100%',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
      }}>
        <p style={{ fontSize: '48px', marginBottom: '20px' }}>🎉</p>
        <h1 style={{ marginBottom: '10px', fontSize: '24px' }}>הוזמנת לפרויקט!</h1>
        
        <div style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '20px', 
          borderRadius: '12px',
          marginBottom: '25px'
        }}>
          <h2 style={{ margin: '0 0 10px 0', color: '#2563eb' }}>
            {project?.name || 'פרויקט'}
          </h2>
          <p style={{ margin: 0, color: '#666' }}>
            תפקיד: {ROLES[invitation?.role]?.icon || '👤'} {ROLES[invitation?.role]?.name || 'חבר'}
          </p>
        </div>

        {!user ? (
          <div>
            <p style={{ marginBottom: '20px', color: '#666' }}>
              כדי להצטרף לפרויקט, יש להתחבר או להירשם:
            </p>
            <a 
              href={`/login?redirect=/invite/${token}`}
              style={{ 
                display: 'block',
                width: '100%',
                padding: '15px 30px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '500',
                textDecoration: 'none',
                boxSizing: 'border-box'
              }}
            >
              התחבר / הירשם
            </a>
          </div>
        ) : (
          <div>
            <p style={{ marginBottom: '20px', color: '#666' }}>
              מחובר כ: {user.email}
            </p>
            <button 
              onClick={acceptInvitation}
              disabled={accepting}
              style={{ 
                width: '100%',
                padding: '15px 30px',
                backgroundColor: accepting ? '#9ca3af' : '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: accepting ? 'not-allowed' : 'pointer'
              }}
            >
              {accepting ? 'מצטרף...' : '✓ הצטרף לפרויקט'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
