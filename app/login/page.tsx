'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
    } else {
      // ✅ תיקון: router במקום window.location.href
      router.push('/projects')
      router.refresh()
    }
  }

  const handleSignUp = async () => {
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setMessage(error.message)
    } else {
      setMessage('נשלח אליך מייל לאימות!')
    }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '20px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '10px', color: 'var(--primary)' }}>Projekta</h1>
      <p style={{ textAlign: 'center', marginBottom: '30px', color: 'var(--text-light)' }}>ניהול פרויקטים חכם</p>
      
      <div style={{ backgroundColor: 'var(--card)', padding: '30px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="אימייל"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '12px',
              marginBottom: '15px',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '16px',
            }}
          />
          <input
            type="password"
            placeholder="סיסמה"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '12px',
              marginBottom: '20px',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '16px',
            }}
          />
          
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              marginBottom: '10px',
              fontSize: '16px',
              fontWeight: '500',
            }}
          >
            {loading ? 'טוען...' : 'התחבר'}
          </button>
          
          <button
            type="button"
            onClick={handleSignUp}
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: 'var(--card)',
              color: 'var(--primary)',
              border: '1px solid var(--primary)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500',
            }}
          >
            הרשמה
          </button>
        </form>

        {message && (
          <p style={{ marginTop: '20px', textAlign: 'center', color: 'var(--text-light)' }}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}