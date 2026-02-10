import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { showSuccess, showError } from '@/app/utils/toast'

interface AddCustomCategoryModalProps {
  projectId: string
  onClose: () => void
  onAdded: (category: { id: string; name: string; icon: string }) => void
}

const EMOJI_OPTIONS = [
  '📦', '🏗️', '🔌', '🚰', '🎨', '🔧', '⚡', '🪟', 
  '🚪', '🔨', '🪛', '📐', '🧱', '🪵', '⛏️', '🏭',
  '🛠️', '⚙️', '🔩', '📏', '✂️', '🖌️', '🧰', '🪜'
]

export default function AddCustomCategoryModal({ 
  projectId, 
  onClose, 
  onAdded 
}: AddCustomCategoryModalProps) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('📦')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      showError('נא להזין שם קטגוריה')
      return
    }

    setSaving(true)
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('custom_categories')
        .insert({
          project_id: projectId,
          name: name.trim(),
          icon
        })
        .select()
        .single()

      if (error) throw error

      showSuccess('✅ קטגוריה נוספה בהצלחה!')
      onAdded({
        id: data.id,
        name: data.name,
        icon: data.icon
      })
      onClose()
    } catch (error: any) {
      console.error('Error adding custom category:', error)
      if (error.code === '23505') {
        showError('קטגוריה עם שם זה כבר קיימת')
      } else {
        showError('שגיאה בהוספת קטגוריה')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '16px',
        fontFamily: 'Heebo, sans-serif',
        direction: 'rtl',
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 25px 70px rgba(0,0,0,0.5)',
          maxWidth: '28rem',
          width: '100%',
          padding: '24px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          marginBottom: '24px' 
        }}>
          <h2 style={{ 
            fontSize: '24px', 
            fontWeight: '700', 
            color: '#1e293b',
            margin: 0,
          }}>
            ➕ הוסף קטגוריה חדשה
          </h2>
          <button
            onClick={onClose}
            style={{
              fontSize: '24px',
              color: '#64748b',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Name Input */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '600', 
              color: '#64748b', 
              marginBottom: '8px' 
            }}>
              שם הקטגוריה
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="לדוגמה: ריצוף, חשמל, צביעה..."
              autoFocus
              maxLength={50}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #E5E7EB',
                borderRadius: '12px',
                fontSize: '15px',
                fontFamily: 'Heebo, sans-serif',
              }}
            />
          </div>

          {/* Icon Picker */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '600', 
              color: '#64748b', 
              marginBottom: '8px' 
            }}>
              בחר אייקון
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(8, 1fr)',
              gap: '8px',
              padding: '16px',
              backgroundColor: '#F8FAFC',
              borderRadius: '12px',
              maxHeight: '200px',
              overflowY: 'auto',
            }}>
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  style={{
                    fontSize: '24px',
                    padding: '8px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: icon === emoji ? '#6366F1' : 'white',
                    transform: icon === emoji ? 'scale(1.1)' : 'scale(1)',
                    transition: 'all 0.2s',
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div style={{
            padding: '16px',
            backgroundColor: '#F8FAFC',
            borderRadius: '12px',
            marginBottom: '20px',
          }}>
            <p style={{ 
              fontSize: '12px', 
              color: '#64748b', 
              marginBottom: '8px',
              margin: 0,
            }}>
              תצוגה מקדימה:
            </p>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              marginTop: '8px',
            }}>
              <span style={{ fontSize: '32px' }}>{icon}</span>
              <span style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#1e293b' 
              }}>
                {name || 'שם הקטגוריה'}
              </span>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                flex: 1,
                padding: '12px 24px',
                backgroundColor: 'white',
                border: '2px solid #E5E7EB',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: '600',
                color: '#64748b',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontFamily: 'Heebo, sans-serif',
              }}
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              style={{
                flex: 1,
                padding: '12px 24px',
                backgroundColor: '#6366F1',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: '600',
                color: 'white',
                cursor: (saving || !name.trim()) ? 'not-allowed' : 'pointer',
                opacity: (saving || !name.trim()) ? 0.5 : 1,
                fontFamily: 'Heebo, sans-serif',
              }}
            >
              {saving ? 'שומר...' : 'הוסף קטגוריה'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
