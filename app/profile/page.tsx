'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Toast from '../Toast'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')

  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      setUser(user)

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
        setFullName(profileData.full_name || '')
        setPhone(profileData.phone || '')
      }

      setLoading(false)
    }
    init()
  }, [])

  const saveProfile = async () => {
    if (!user) return

    setSaving(true)

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: fullName,
          phone: phone,
          updated_at: new Date().toISOString(),
        })

      if (error) throw error

      setToast({ message: 'הפרופיל נשמר בהצלחה!', type: 'success' })
    } catch (error) {
      console.error('Error saving profile:', error)
      setToast({ message: 'שגיאה בשמירת הפרופיל', type: 'error' })
    }

    setSaving(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        טוען...
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f7fa' }}>
      {/* Header */}
      <div style={{ 
        backgroundColor: '#2563eb', 
        color: 'white', 
        padding: '15px 30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ margin: 0, fontSize: '22px' }}>👤 הפרופיל שלי</h1>
        <a href="/projects" style={{ color: 'white', textDecoration: 'none' }}>
          ← חזרה לפרויקטים
        </a>
      </div>

      {/* Content */}
      <div style={{ 
        maxWidth: '500px', 
        margin: '40px auto', 
        padding: '0 20px' 
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '30px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        }}>
          {/* Avatar */}
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              backgroundColor: '#e0e7ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 15px',
              fontSize: '40px',
            }}>
              {fullName ? fullName[0].toUpperCase() : '👤'}
            </div>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>{user?.email}</p>
          </div>

          {/* Form */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '500',
              color: '#333'
            }}>
              שם מלא
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="הכנס את שמך המלא"
              style={{
                width: '100%',
                padding: '12px 15px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '16px',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
            />
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '500',
              color: '#333'
            }}>
              📱 מספר טלפון
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="050-1234567"
              style={{
                width: '100%',
                padding: '12px 15px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '16px',
                boxSizing: 'border-box',
                direction: 'ltr',
                textAlign: 'right',
              }}
            />
            <p style={{ 
              margin: '8px 0 0', 
              fontSize: '13px', 
              color: '#666' 
            }}>
              מספר הטלפון ישמש לשיחות ולזיהוי בפרויקטים
            </p>
          </div>

          {/* Save button */}
          <button
            onClick={saveProfile}
            disabled={saving}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: saving ? '#9ca3af' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: saving ? 'not-allowed' : 'pointer',
              marginBottom: '15px',
            }}
          >
            {saving ? 'שומר...' : '✓ שמור פרופיל'}
          </button>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: 'transparent',
              color: '#dc2626',
              border: '1px solid #dc2626',
              borderRadius: '10px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            🚪 התנתק
          </button>
        </div>

        {/* Info card */}
        <div style={{
          backgroundColor: '#fef3c7',
          borderRadius: '12px',
          padding: '15px 20px',
          marginTop: '20px',
          fontSize: '14px',
          color: '#92400e',
        }}>
          💡 <strong>טיפ:</strong> הוספת מספר טלפון תאפשר לך לקבל הזמנות לפרויקטים ולבצע שיחות בתוך האפליקציה
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
