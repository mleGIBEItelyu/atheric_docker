import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'

export function LoginModal() {
  const { isLoginModalOpen, setIsLoginModalOpen, login, register } = useAuth()
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!isLoginModalOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (tab === 'login') {
      const res = await login(username, password)
      if (!res.success) {
        setError(res.error || 'Login gagal')
      }
    } else {
      const res = await register(username, email, password)
      if (!res.success) {
        setError(res.error || 'Registrasi gagal')
      }
    }
    setLoading(false)
  }

  return (
    <div
      onClick={() => setIsLoginModalOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '420px',
          background: 'var(--panel)',
          border: '1px solid var(--border-strong)',
          borderRadius: '16px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6), 0 0 30px rgba(79,125,255,0.15)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid var(--border)', position: 'relative' }}>
          <button
            onClick={() => setIsLoginModalOpen(false)}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'none',
              border: 'none',
              color: 'var(--text-mute)',
              fontSize: '24px',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'linear-gradient(135deg, var(--blue), #80a4ff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, color: '#fff', fontSize: '16px'
            }}>
              A
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)' }}>
              Atheric <span style={{ color: 'var(--blue)' }}>AI</span>
            </div>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
            {tab === 'login' ? 'Masuk ke akun trading & analitik AI Anda' : 'Buat akun baru untuk akses fitur penuh'}
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)' }}>
          <button
            type="button"
            onClick={() => { setTab('login'); setError(null) }}
            style={{
              flex: 1,
              padding: '12px',
              background: 'none',
              border: 'none',
              borderBottom: tab === 'login' ? '2px solid var(--blue)' : '2px solid transparent',
              color: tab === 'login' ? 'var(--blue)' : 'var(--text-dim)',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all .15s',
            }}
          >
            Masuk (Login)
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setError(null) }}
            style={{
              flex: 1,
              padding: '12px',
              background: 'none',
              border: 'none',
              borderBottom: tab === 'register' ? '2px solid var(--blue)' : '2px solid transparent',
              color: tab === 'register' ? 'var(--blue)' : 'var(--text-dim)',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all .15s',
            }}
          >
            Daftar (Register)
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '13px',
            }}>
              {error}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '6px' }}>
              Username atau Email
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Contoh: gibei_trader"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-strong)',
                color: 'var(--text)',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          {tab === 'register' && (
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '6px' }}>
                Alamat Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nama@domain.com"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-strong)',
                  color: 'var(--text)',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '6px' }}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-strong)',
                color: 'var(--text)',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '8px',
              padding: '12px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, var(--blue), #2563eb)',
              color: '#fff',
              fontWeight: 800,
              fontSize: '14px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 15px rgba(79,125,255,0.4)',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Memproses...' : tab === 'login' ? 'Masuk Sekarang' : 'Daftar Akun Baru'}
          </button>
        </form>
      </div>
    </div >
  )
}
