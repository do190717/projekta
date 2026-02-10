'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'

// ====== WhatsApp Section Component ======
function WhatsAppSection({ supabase, userId }: { supabase: any; userId: string }) {
  const [waPhone, setWaPhone] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [phoneInput, setPhoneInput] = useState('')
  const [codeInput, setCodeInput] = useState('')
  const [step, setStep] = useState<'idle' | 'enter_phone' | 'enter_code' | 'verified'>('idle')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [devCode, setDevCode] = useState('') // ⚠️ For development only

  useEffect(() => {
    fetchWaPhone()
  }, [])

  const fetchWaPhone = async () => {
    const { data } = await supabase
      .from('v2_wa_user_phones')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (data) {
      setWaPhone(data)
      if (data.is_verified) {
        setStep('verified')
      } else if (data.verification_code) {
        setStep('enter_code')
        setPhoneInput(data.phone_number)
      } else {
        setStep('idle')
      }
    } else {
      setStep('idle')
    }
    setLoading(false)
  }

  const formatPhoneForDisplay = (phone: string) => {
    if (!phone) return ''
    // +972501234567 → 050-123-4567
    if (phone.startsWith('+972')) {
      const local = '0' + phone.slice(4)
      return local.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')
    }
    return phone
  }

  const normalizePhone = (input: string): string => {
    // Remove spaces, dashes
    let clean = input.replace(/[\s\-()]/g, '')
    // Convert 05x to +9725x
    if (clean.startsWith('05')) {
      clean = '+972' + clean.slice(1)
    }
    // If starts with 972, add +
    if (clean.startsWith('972')) {
      clean = '+' + clean
    }
    return clean
  }

  const requestVerification = async () => {
    setError('')
    const normalized = normalizePhone(phoneInput)
    
    if (!normalized.match(/^\+[1-9]\d{7,14}$/)) {
      setError('מספר טלפון לא תקין. דוגמה: 050-1234567')
      return
    }

    setSending(true)
    const { data, error: rpcError } = await supabase.rpc('v2_wa_request_verification', {
      p_phone_number: normalized
    })

    setSending(false)

    if (rpcError) {
      setError('שגיאה בשליחת הקוד')
      return
    }

    if (!data.success) {
      if (data.error === 'phone_taken') {
        setError('מספר הטלפון הזה כבר רשום למשתמש אחר')
      } else if (data.error === 'invalid_phone_format') {
        setError('פורמט מספר לא תקין')
      } else {
        setError('שגיאה: ' + data.error)
      }
      return
    }

    // ⚠️ DEV ONLY — in production the code is sent via WhatsApp
    if (data.code) {
      setDevCode(data.code)
    }

    setPhoneInput(normalized)
    setStep('enter_code')
  }

  const verifyCode = async () => {
    setError('')
    if (codeInput.length !== 4) {
      setError('הקוד חייב להיות 4 ספרות')
      return
    }

    setSending(true)
    const { data, error: rpcError } = await supabase.rpc('v2_wa_verify_code', {
      p_code: codeInput
    })

    setSending(false)

    if (rpcError) {
      setError('שגיאה באימות')
      return
    }

    if (!data.success) {
      if (data.error === 'invalid_code') {
        setError('קוד שגוי, נסה שוב')
      } else if (data.error === 'code_expired') {
        setError('הקוד פג תוקף, שלח קוד חדש')
      } else if (data.error === 'too_many_attempts') {
        setError('יותר מדי ניסיונות, שלח קוד חדש')
      } else {
        setError('שגיאה: ' + data.error)
      }
      return
    }

    setDevCode('')
    setStep('verified')
    fetchWaPhone()
  }

  const disconnect = async () => {
    if (!confirm('להסיר את חיבור ה-WhatsApp?')) return
    
    setSending(true)
    await supabase.rpc('v2_wa_disconnect')
    setSending(false)
    
    setWaPhone(null)
    setPhoneInput('')
    setCodeInput('')
    setDevCode('')
    setStep('idle')
  }

  if (loading) return null

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: '25px 30px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      marginTop: '20px',
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '10px', 
        marginBottom: '20px' 
      }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '10px',
          backgroundColor: '#25D366', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontSize: '20px',
        }}>
          💬
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '17px', color: '#333' }}>
            חיבור WhatsApp
          </h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#888' }}>
            קבל עדכוני פרויקט ישירות בוואטסאפ
          </p>
        </div>
        {step === 'verified' && (
          <div style={{
            marginRight: 'auto',
            backgroundColor: '#DCFCE7',
            color: '#16A34A',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: '600',
          }}>
            ✓ מחובר
          </div>
        )}
      </div>

      {/* === STEP: IDLE — show connect button === */}
      {step === 'idle' && (
        <div>
          <p style={{ fontSize: '14px', color: '#666', margin: '0 0 15px', lineHeight: '1.6' }}>
            חבר את מספר הוואטסאפ שלך כדי לקבל הודעות מפרויקטים ישירות בוואטסאפ.
            תוכל לענות מוואטסאפ וההודעה תופיע בצ'אט הפרויקט.
          </p>
          <button
            onClick={() => setStep('enter_phone')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#25D366',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            📱 חבר WhatsApp
          </button>
        </div>
      )}

      {/* === STEP: ENTER PHONE === */}
      {step === 'enter_phone' && (
        <div>
          <label style={{
            display: 'block', marginBottom: '8px',
            fontWeight: '500', color: '#333', fontSize: '14px',
          }}>
            מספר הטלפון שלך בוואטסאפ
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="tel"
              value={phoneInput}
              onChange={(e) => { setPhoneInput(e.target.value); setError('') }}
              placeholder="050-1234567"
              style={{
                flex: 1,
                padding: '12px 15px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '16px',
                direction: 'ltr',
                textAlign: 'right',
              }}
              onKeyDown={(e) => e.key === 'Enter' && requestVerification()}
            />
            <button
              onClick={requestVerification}
              disabled={sending || !phoneInput}
              style={{
                padding: '12px 20px',
                backgroundColor: sending ? '#9CA3AF' : '#25D366',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: sending ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {sending ? 'שולח...' : 'שלח קוד'}
            </button>
          </div>
          <button
            onClick={() => { setStep('idle'); setError(''); setPhoneInput('') }}
            style={{
              marginTop: '10px', background: 'none', border: 'none',
              color: '#888', fontSize: '13px', cursor: 'pointer',
            }}
          >
            ← ביטול
          </button>
          {error && (
            <p style={{ color: '#DC2626', fontSize: '13px', marginTop: '8px' }}>{error}</p>
          )}
        </div>
      )}

      {/* === STEP: ENTER CODE === */}
      {step === 'enter_code' && (
        <div>
          <p style={{ fontSize: '14px', color: '#666', margin: '0 0 12px' }}>
            שלחנו קוד אימות למספר {formatPhoneForDisplay(phoneInput)}
          </p>
          
          {/* ⚠️ DEV ONLY — show code for testing */}
          {devCode && (
            <div style={{
              backgroundColor: '#FEF3C7', border: '1px solid #F59E0B',
              borderRadius: '8px', padding: '10px 15px', marginBottom: '12px',
              fontSize: '13px', color: '#92400E',
            }}>
              ⚠️ מצב פיתוח — הקוד שלך: <strong style={{ fontSize: '18px' }}>{devCode}</strong>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={codeInput}
              onChange={(e) => { 
                const v = e.target.value.replace(/\D/g, '').slice(0, 4)
                setCodeInput(v) 
                setError('')
              }}
              placeholder="_ _ _ _"
              style={{
                width: '140px',
                padding: '12px 15px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '24px',
                textAlign: 'center',
                letterSpacing: '8px',
                fontWeight: '700',
                direction: 'ltr',
              }}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && verifyCode()}
            />
            <button
              onClick={verifyCode}
              disabled={sending || codeInput.length !== 4}
              style={{
                padding: '12px 20px',
                backgroundColor: (sending || codeInput.length !== 4) ? '#9CA3AF' : '#25D366',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: (sending || codeInput.length !== 4) ? 'not-allowed' : 'pointer',
              }}
            >
              {sending ? 'מאמת...' : 'אמת'}
            </button>
          </div>
          <div style={{ marginTop: '10px', display: 'flex', gap: '15px' }}>
            <button
              onClick={requestVerification}
              disabled={sending}
              style={{
                background: 'none', border: 'none',
                color: '#2563EB', fontSize: '13px', cursor: 'pointer',
              }}
            >
              שלח קוד חדש
            </button>
            <button
              onClick={() => { 
                setStep('enter_phone'); setError(''); 
                setCodeInput(''); setDevCode('') 
              }}
              style={{
                background: 'none', border: 'none',
                color: '#888', fontSize: '13px', cursor: 'pointer',
              }}
            >
              שנה מספר
            </button>
          </div>
          {error && (
            <p style={{ color: '#DC2626', fontSize: '13px', marginTop: '8px' }}>{error}</p>
          )}
        </div>
      )}

      {/* === STEP: VERIFIED === */}
      {step === 'verified' && waPhone && (
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            backgroundColor: '#F0FDF4', borderRadius: '10px',
            padding: '15px',
          }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%',
              backgroundColor: '#25D366', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '20px',
            }}>
              ✓
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: '600', color: '#333', fontSize: '15px' }}>
                {formatPhoneForDisplay(waPhone.phone_number)}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#16A34A' }}>
                מחובר ומאומת • הודעות פרויקט יגיעו לוואטסאפ
              </p>
            </div>
          </div>
          <button
            onClick={disconnect}
            disabled={sending}
            style={{
              marginTop: '12px',
              background: 'none', border: 'none',
              color: '#DC2626', fontSize: '13px', cursor: 'pointer',
            }}
          >
            🔌 נתק WhatsApp
          </button>
        </div>
      )}
    </div>
  )
}


// ====== Main Profile Page ======
export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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
        .update({
          full_name: fullName,
          phone: phone,
        })
        .eq('id', user.id)

      if (error) throw error

      toast.success('הפרופיל נשמר בהצלחה!')
    } catch (error) {
      console.error('Error saving profile:', error)
      toast.error('שגיאה בשמירת הפרופיל')
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
        {/* === Profile Card === */}
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

        {/* === WhatsApp Section === */}
        {user && (
          <WhatsAppSection supabase={supabase} userId={user.id} />
        )}

        {/* Info card */}
        <div style={{
          backgroundColor: '#fef3c7',
          borderRadius: '12px',
          padding: '15px 20px',
          marginTop: '20px',
          fontSize: '14px',
          color: '#92400e',
        }}>
          💡 <strong>טיפ:</strong> חיבור WhatsApp יאפשר לך לקבל ולשלוח הודעות פרויקט ישירות מוואטסאפ. ה-AI ינתח את כל ההודעות ויזהה משימות והחלטות.
        </div>
      </div>
    </div>
  )
}
