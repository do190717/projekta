'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }
    getUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) {
    return <div style={{ padding: '50px', textAlign: 'center' }}>טוען...</div>
  }

  if (!user) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <h1>ברוכים הבאים ל-Projekta</h1>
        <p>התחבר כדי להמשיך</p>
        <a href="/login">לדף ההתחברות</a>
      </div>
    )
  }

  return (
    <div style={{ padding: '50px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Projekta</h1>
        <button
          onClick={handleLogout}
          style={{
            padding: '10px 20px',
            backgroundColor: 'var(--danger)',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          התנתק
        </button>
      </div>
      
      <div style={{ backgroundColor: 'var(--card)', padding: '20px', borderRadius: '10px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2>שלום! 🎉</h2>
        <p>מחובר כ: <strong>{user.email}</strong></p>
      </div>

      <a
        href="/projects"
        style={{
          display: 'inline-block',
          padding: '15px 30px',
          backgroundColor: 'var(--primary)',
          color: 'white',
          borderRadius: '8px',
          textDecoration: 'none',
          fontSize: '18px',
        }}
      >
        📁 הפרויקטים שלי
      </a>
    </div>
  )
}
