import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'

export function LoginModal() {
  const { isLoginModalOpen, setIsLoginModalOpen, login, register } = useAuth()
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!isLoginModalOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmedUsername = username.trim()
    const trimmedPassword = password.trim()
    const trimmedEmail = email.trim()

    if (!trimmedUsername || !trimmedPassword) {
      setError('Semua kolom wajib diisi.')
      return
    }

    if (tab === 'register') {
      if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(trimmedUsername)) {
        setError('Username harus 3-30 karakter (hanya huruf, angka, titik, strip, underscore).')
        return
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        setError('Format email tidak valid.')
        return
      }
      if (trimmedPassword.length < 6 || trimmedPassword.length > 128) {
        setError('Password harus antara 6 dan 128 karakter.')
        return
      }
    }

    setLoading(true)

    if (tab === 'login') {
      const res = await login(trimmedUsername, trimmedPassword)
      if (!res.success) {
        setError(res.error || 'Login gagal')
      }
    } else {
      const res = await register(trimmedUsername, trimmedEmail, trimmedPassword)
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
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '10px 40px 10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-strong)',
                  color: 'var(--text)',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                aria-label="Toggle password visibility"
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {showPass ? (
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.858A9.954 9.954 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m-4.592-4.592a3 3 0 11-4.243-4.243m4.242 4.242L3 3l18 18" />
                  </svg>
                ) : (
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
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
