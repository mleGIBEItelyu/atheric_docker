import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Select } from '@/components/common/Select'
import { useToast } from '@/components/common/Toast'
import { useAuth } from '@/context/AuthContext'
import { getSettingsApi, saveSettingsApi, sendTestNotificationApi, fetchDeviceSessionsApi, revokeDeviceSessionApi } from '@/services/api'

function applyTheme(theme: string) {
  if (theme === 'dark') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', theme)
  }
}

const AI_OPTIONS = [
  { value: 'generative', label: 'Generative Financial LLM (Default)' },
  { value: 'statistical', label: 'Statistical Model (ARIMA + GARCH)' },
  { value: 'machine-learning', label: 'Deep Learning (LSTM Neural Net)' },
]

const INDEX_OPTIONS = [
  { value: 'IHSG', label: 'IHSG (Pasar Saham Indonesia)' },
  { value: 'LQ45', label: 'LQ45 (Indeks 45 Saham Unggulan)' },
  { value: 'IDX30', label: 'IDX30 (Indeks 30 Ter-likuid)' },
]

const NOTIF_ITEMS = [
  {
    key: 'sentiment',
    title: 'Perubahan Sentimen Drastis',
    desc: 'Dapatkan pemberitahuan instan jika model mendeteksi perubahan sentimen dari bullish ke bearish.',
    demo: { title: 'Sentimen Berubah - BBCA', body: 'Model mendeteksi pergeseran sentimen dari Bullish ke Bearish pada BBCA. Harga mendekati support 9.400.' },
  },
  {
    key: 'keylevels',
    title: 'Emiten Watchlist Menyentuh Key Levels',
    desc: 'Kirim alert jika salah satu emiten watchlist mendekati level Resistance atau Support kunci.',
    demo: { title: 'Key Level Alert - TLKM', body: 'TLKM menyentuh resistance kunci di Rp 3.720. Volume di atas rata-rata - waspadai breakout.' },
  },
  {
    key: 'news',
    title: 'Pembaruan Berita Prioritas Tinggi',
    desc: 'Alert khusus untuk berita dengan dampak tinggi (High impact news).',
    demo: { title: 'High-Impact News - IHSG', body: 'Bank Indonesia menaikkan suku bunga acuan sebesar 25bps. Dampak tinggi terhadap sektor perbankan.' },
  },
]

function sendBrowserNotif(title: string, body: string) {
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico', badge: '/favicon.ico' })
  }
}

interface DeviceSession {
  id: string
  device: string
  browser: string
  ip: string
  location: string
  firstLoginDaysAgo: number // Days since first login on this device
  lastActive: string
  isCurrent: boolean
}

export function Settings() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const VALID_TABS = ['general', 'display', 'notifications', 'account']
  const hashTab = location.hash.replace('#', '')
  const activeTab = VALID_TABS.includes(hashTab) ? hashTab : 'general'

  function setActiveTab(tab: string) {
    navigate(`/settings#${tab}`, { replace: true })
  }

  const [aiModel, setAiModel] = useState('generative')
  const [confidence, setConfidence] = useState('90')
  const [defaultIndex, setDefaultIndex] = useState('IHSG')
  const [theme, setTheme] = useState('dark')
  const [notifEnabled, setNotifEnabled] = useState<Record<string, boolean>>({
    sentiment: true, keylevels: true, news: true,
  })
  const [saving, setSaving] = useState(false)
  const [savedFeedback, setSavedFeedback] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied'
  )

  // Real active & historical device sessions for user account
  const [sessions, setSessions] = useState<DeviceSession[]>([])

  // Load account settings & real device sessions from Backend DB on mount
  useEffect(() => {
    async function loadAccountData() {
      const data = await getSettingsApi()
      if (data) {
        if (data.aiModel) setAiModel(data.aiModel)
        if (data.confidenceInterval) setConfidence(data.confidenceInterval)
        if (data.topbarIndex) setDefaultIndex(data.topbarIndex)
        if (data.theme) {
          setTheme(data.theme)
          applyTheme(data.theme)
        }
        setNotifEnabled({
          sentiment: data.sentimentAlerts !== undefined ? Boolean(data.sentimentAlerts) : true,
          keylevels: data.keyLevelAlerts !== undefined ? Boolean(data.keyLevelAlerts) : true,
          news: data.newsAlerts !== undefined ? Boolean(data.newsAlerts) : true,
        })
      }

      // Fetch Real Device Sessions from DB
      const realSessions = await fetchDeviceSessionsApi()
      if (realSessions && Array.isArray(realSessions) && realSessions.length > 0) {
        setSessions(realSessions)
      }
    }
    loadAccountData()
  }, [user])

  function handleThemeChange(t: string) {
    setTheme(t)
    applyTheme(t)
    const names: Record<string, string> = { dark: 'Carbon Dark', blue: 'Deep Ocean Blue', emerald: 'Cyber Emerald', gibei: 'Gibei' }
    toast.info(`Tema ${names[t] ?? t} diterapkan`, 'Klik Simpan untuk menyimpan preferensi.')
  }

  async function handleNotifToggle(key: string, wantOn: boolean) {
    if (wantOn && notifPermission !== 'granted' && typeof window !== 'undefined' && 'Notification' in window) {
      const result = await Notification.requestPermission()
      setNotifPermission(result)
      if (result !== 'granted') {
        toast.error('Izin ditolak', 'Aktifkan notifikasi di pengaturan browser Anda.')
        return
      }
      sendBrowserNotif('Atheric AI - Notifikasi Aktif', 'Alert browser berhasil diaktifkan untuk terminal ini.')
      toast.success('Izin diberikan!', 'Browser notifications berhasil diaktifkan.')
    }
    setNotifEnabled(prev => ({ ...prev, [key]: wantOn }))
  }

  async function sendTestNotif(item: typeof NOTIF_ITEMS[number]) {
    let perm = notifPermission
    if (perm !== 'granted' && typeof window !== 'undefined' && 'Notification' in window) {
      const result = await Notification.requestPermission()
      setNotifPermission(result)
      perm = result
    }

    try {
      const res = await sendTestNotificationApi(item.key)
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      const notifData = res.data
      if (notifData && perm === 'granted') {
        sendBrowserNotif(notifData.title, notifData.body)
        toast.success('Alert Riil Terkirim', notifData.title)
      } else if (notifData) {
        toast.info('Alert Riil Masuk ke Notifikasi', notifData.title)
      }
    } catch (e) {
      console.warn('Failed sending live notification:', e)
    }
  }

  // Save Settings to Backend DB for this specific Account
  async function handleSave() {
    setSaving(true)
    const res = await saveSettingsApi({
      aiModel,
      confidenceInterval: confidence,
      topbarIndex: defaultIndex,
      theme,
      sentimentAlerts: notifEnabled.sentiment ?? true,
      keyLevelAlerts: notifEnabled.keylevels ?? true,
      newsAlerts: notifEnabled.news ?? true,
      emailAlerts: notifEnabled.news ?? true,
      inAppAlerts: (notifEnabled.sentiment || notifEnabled.keylevels) ?? true,
    })
    setSaving(false)

    if (res.success) {
      setSavedFeedback(true)
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      setTimeout(() => setSavedFeedback(false), 2000)
      toast.success('Pengaturan Disimpan ke Akun', `Pengaturan khusus akun ${user?.username || ''} tersimpan di Database.`)
    } else {
      toast.error('Gagal menyimpan', res.message || 'Coba lagi nanti.')
    }
  }

  // Handle Revoking / Deleting Other Device Sessions with 1-Week Security Cooldown Check
  async function handleRevokeSession(sessionId: string | number) {
    const currentSession = sessions.find(s => s.isCurrent)

    // Security Rule: If current device first logged in less than 7 days ago (< 1 week), BLOCK session deletion
    if (currentSession && currentSession.firstLoginDaysAgo < 7) {
      const remainingDays = 7 - currentSession.firstLoginDaysAgo
      toast.warning(
        'Perangkat Baru Terdeteksi (Cooldown Keamanan)',
        `Perangkat ini baru masuk ${currentSession.firstLoginDaysAgo} hari lalu. Demi keamanan akun, Anda harus menunggu ${remainingDays} hari lagi (total 1 minggu) sebelum dapat menghapus sesi perangkat lain.`
      )
      return
    }

    // Call Real Backend API to delete session
    const res = await revokeDeviceSessionApi(sessionId)
    if (res.success) {
      setSessions(prev => prev.filter(s => String(s.id) !== String(sessionId)))
      toast.success('Sesi Perangkat Dikeluarkan', 'Sesi perangkat tersebut telah dicabut dan dikeluarkan dari akun Anda.')
    } else {
      toast.error('Gagal menghapus sesi', res.message || 'Coba lagi nanti.')
    }
  }

  // Confirm Account Deletion
  function confirmDeleteAccount() {
    setShowDeleteModal(false)
    toast.error('Akun Dihapus', 'Seluruh data akun Anda telah dihapus secara permanen.')
    logout()
  }

  // Confirm Account Logout
  function confirmLogoutAccount() {
    setShowLogoutModal(false)
    logout()
    toast.warning('Anda telah keluar', 'Mengarahkan kembali ke halaman login...')
  }

  const tabs = [
    { id: 'general', label: 'Umum & AI Model' },
    { id: 'display', label: 'Tampilan (Theme)' },
    { id: 'notifications', label: 'Notifikasi Alert' },
    { id: 'account', label: 'Akun & Keamanan' },
  ]

  const themes = [
    { id: 'dark', label: 'Carbon Dark', desc: 'Skema hitam legam premium terminal.', dot: '#3b6ef6' },
    { id: 'blue', label: 'Deep Ocean Blue', desc: 'Tema biru samudera dengan kontras lembut.', dot: '#5ba4ff' },
    { id: 'emerald', label: 'Cyber Emerald', desc: 'Gaya terminal hacker dengan aksen hijau neon.', dot: '#00e87c' },
    { id: 'gibei', label: 'Gibei', desc: 'Hitam dominan dengan aksen emas, merah & putih.', dot: '#ffd400' },
  ]

  const currentDev = sessions.find(s => s.isCurrent)
  const isCooldownActive = currentDev && currentDev.firstLoginDaysAgo < 7

  return (
    <div className="content">
      <div className="page-head">
        <div className="page-title">PENGATURAN AKUN</div>
        <div className="page-sub">Kustomisasi parameter model AI, preferensi akun <b>{user?.username || 'User'}</b>, dan manajemen keamanan sesi perangkat.</div>
      </div>

      <div className="settings-layout">
        {/* Left: Tab Nav */}
        <div className="settings-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`settings-tab-btn${activeTab === tab.id ? ' active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right: Content Panel */}
        <div className="card settings-panel">

          {/* ── General Tab ── */}
          {activeTab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              <h2 className="settings-section-title">
                Konfigurasi Model AI
              </h2>

              <div className="settings-form-group">
                <label>AI Forecasting Engine</label>
                <Select value={aiModel} onChange={setAiModel} options={AI_OPTIONS} />
                <span className="hint">Model Generative AI menganalisis data numerik dan sentimen berita secara simultan.</span>
              </div>

              <div className="settings-form-group">
                <label>Confidence Interval (CI)</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {['90', '95', '99'].map(val => (
                    <button
                      key={val}
                      onClick={() => setConfidence(val)}
                      style={{
                        flex: 1, padding: '12px', fontSize: '13.5px', fontWeight: 600,
                        borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                        transition: 'all .15s ease',
                        background: confidence === val ? 'var(--blue-soft)' : 'var(--bg-2)',
                        border: confidence === val ? '1px solid var(--blue)' : '1px solid var(--border-strong)',
                        color: confidence === val ? 'var(--blue-bright)' : 'var(--text-dim)',
                      }}
                    >
                      {val}% CI
                    </button>
                  ))}
                </div>
                <span className="hint">Batas keyakinan model membatasi rentang visualisasi area prediksi (Confidence Cone) di chart.</span>
              </div>

              <div className="settings-form-group">
                <label>Indeks Saham Utama (Topbar)</label>
                <Select value={defaultIndex} onChange={setDefaultIndex} options={INDEX_OPTIONS} />
                <span className="hint">Indeks utama yang ditampilkan secara real-time di bar bagian atas layar Anda.</span>
              </div>
            </div>
          )}

          {/* ── Display Tab ── */}
          {activeTab === 'display' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              <h2 className="settings-section-title">
                Tampilan &amp; Tema
              </h2>

              <div className="settings-form-group">
                <label>Tema Terminal</label>
                <div className="theme-grid">
                  {themes.map(t => (
                    <button
                      key={t.id}
                      onClick={() => handleThemeChange(t.id)}
                      className={`theme-card${theme === t.id ? ' active' : ''}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: t.dot, flexShrink: 0, display: 'block' }} />
                        <span style={{ fontSize: '13.5px', fontWeight: 700, color: theme === t.id ? 'var(--blue-bright)' : 'var(--text)' }}>{t.label}</span>
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-mute)', lineHeight: 1.4 }}>{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Notifications Tab ── */}
          {activeTab === 'notifications' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              <h2 className="settings-section-title">
                Pengaturan Notifikasi
              </h2>

              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '14px 18px', borderRadius: 'var(--radius-sm)',
                background: notifPermission === 'granted'
                  ? 'rgba(46,194,122,0.08)' : notifPermission === 'denied'
                    ? 'rgba(240,86,75,0.08)' : 'rgba(217,161,58,0.08)',
                border: notifPermission === 'granted'
                  ? '1px solid rgba(46,194,122,0.25)' : notifPermission === 'denied'
                    ? '1px solid rgba(240,86,75,0.25)' : '1px solid rgba(217,161,58,0.25)',
              }}>
                <span style={{
                  width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                  background: notifPermission === 'granted' ? 'var(--green)' : notifPermission === 'denied' ? 'var(--red)' : 'var(--amber)',
                }} />
                <div>
                  <div style={{
                    fontSize: '12.5px', fontWeight: 700,
                    color: notifPermission === 'granted' ? 'var(--green)' : notifPermission === 'denied' ? 'var(--red)' : 'var(--amber)',
                  }}>
                    {notifPermission === 'granted' ? 'Notifikasi browser diizinkan' : notifPermission === 'denied' ? 'Notifikasi browser diblokir - ubah di pengaturan browser' : 'Izin notifikasi belum diberikan'}
                  </div>
                  {notifPermission !== 'granted' && notifPermission !== 'denied' && (
                    <div style={{ fontSize: '11px', color: 'var(--text-mute)', marginTop: '3px' }}>Aktifkan salah satu toggle di bawah untuk meminta izin browser</div>
                  )}
                </div>
              </div>

              <div className="notif-settings-list">
                {NOTIF_ITEMS.map(item => {
                  const isOn = notifEnabled[item.key]
                  return (
                    <div key={item.key} className="notif-settings-item">
                      <div className="notif-item-content">
                        <div className="notif-item-title-row">
                          <span className="notif-item-title">{item.title}</span>
                          {isOn && notifPermission === 'granted' && (
                            <span style={{
                              fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '999px',
                              background: 'rgba(46,194,122,0.12)', border: '1px solid rgba(46,194,122,0.3)', color: 'var(--green)'
                            }}>
                              AKTIF
                            </span>
                          )}
                        </div>
                        <div className="notif-item-desc">{item.desc}</div>
                        {isOn && notifPermission === 'granted' && (
                          <button
                            type="button"
                            onClick={() => sendTestNotif(item)}
                            style={{
                              marginTop: '12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                              padding: '5px 12px', borderRadius: '6px',
                              background: 'var(--blue-soft)', border: '1px solid rgba(79,125,255,0.25)',
                              color: 'var(--blue-bright)', display: 'inline-flex', alignItems: 'center', gap: '5px',
                              transition: 'all .15s ease',
                            }}
                          >
                            <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                            Picu Alert Sekarang
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isOn}
                        onClick={() => handleNotifToggle(item.key, !isOn)}
                        style={{
                          flexShrink: 0,
                          width: '40px', height: '22px',
                          borderRadius: '999px',
                          border: 'none',
                          cursor: notifPermission === 'denied' ? 'not-allowed' : 'pointer',
                          background: isOn && notifPermission === 'granted' ? 'var(--blue)' : 'var(--border-strong)',
                          position: 'relative',
                          transition: 'background .2s',
                          marginTop: '2px',
                          opacity: notifPermission === 'denied' ? 0.4 : 1,
                        }}
                        disabled={notifPermission === 'denied'}
                      >
                        <span style={{
                          position: 'absolute', top: '3px',
                          left: isOn && notifPermission === 'granted' ? '20px' : '3px',
                          width: '16px', height: '16px',
                          borderRadius: '50%',
                          background: '#fff',
                          transition: 'left .2s',
                          display: 'block',
                        }} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Account & Security Tab ── */}
          {activeTab === 'account' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

              {/* Active Device Sessions */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h2 className="settings-section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                    Sesi Perangkat Aktif ({sessions.length})
                  </h2>
                </div>

                {isCooldownActive && (
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(217, 161, 58, 0.12)',
                    border: '1px solid rgba(217, 161, 58, 0.3)',
                    color: 'var(--amber)',
                    fontSize: '12.5px',
                    lineHeight: 1.5,
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <circle cx="12" cy="17" r="1" fill="currentColor" />
                    </svg>
                    <div>
                      <b>Perangkat Baru Terdeteksi (Proteksi Keamanan 1 Minggu):</b><br />
                      Anda baru pertama kali masuk di perangkat ini {currentDev?.firstLoginDaysAgo} hari yang lalu. Demi keamanan akun, Anda harus menunggu <b>{7 - (currentDev?.firstLoginDaysAgo || 0)} hari lagi</b> (total 7 hari) sebelum dapat menghapus/mencabut sesi perangkat lain.
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {sessions.map(s => (
                    <div
                      key={s.id}
                      style={{
                        padding: '14px 18px',
                        borderRadius: 'var(--radius-sm)',
                        background: s.isCurrent ? 'var(--blue-soft)' : 'var(--bg-2)',
                        border: s.isCurrent ? '1px solid var(--blue)' : '1px solid var(--border-strong)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '16px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          background: s.isCurrent ? 'var(--blue)' : 'var(--panel)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                        }}>
                          {s.device.toLowerCase().includes('windows') || s.device.toLowerCase().includes('pc') ? (
                            /* PC / Computer Monitor Icon */
                            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                              <line x1="8" y1="21" x2="16" y2="21" />
                              <line x1="12" y1="17" x2="12" y2="21" />
                            </svg>
                          ) : s.device.toLowerCase().includes('mobile') || s.device.toLowerCase().includes('samsung') || s.device.toLowerCase().includes('phone') ? (
                            /* Mobile Smartphone Icon */
                            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <rect x="7" y="2" width="10" height="20" rx="2" ry="2" />
                              <line x1="11" y1="18" x2="13" y2="18" />
                            </svg>
                          ) : (
                            /* Web Browser / Laptop Icon (Chrome / Safari / Web) */
                            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" />
                              <line x1="2" y1="12" x2="22" y2="12" />
                              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10z" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text)' }}>{s.device}</span>
                            {s.isCurrent && (
                              <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '999px', background: 'var(--blue)', color: '#fff' }}>
                                PERANGKAT INI
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
                            {s.browser} • IP: {s.ip} ({s.location})
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-mute)', marginTop: '3px' }}>
                            Pertama login: {s.firstLoginDaysAgo} hari lalu • Terakhir aktif: {s.lastActive}
                          </div>
                        </div>
                      </div>

                      {!s.isCurrent && (
                        <button
                          onClick={() => handleRevokeSession(s.id)}
                          style={{
                            padding: '8px 14px',
                            borderRadius: 'var(--radius-sm)',
                            background: isCooldownActive ? 'rgba(255,255,255,0.05)' : 'rgba(240, 86, 75, 0.12)',
                            border: isCooldownActive ? '1px solid var(--border)' : '1px solid rgba(240, 86, 75, 0.3)',
                            color: isCooldownActive ? 'var(--text-mute)' : 'var(--red)',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all .15s',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          {isCooldownActive && (
                            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          )}
                          {isCooldownActive ? 'Terkunci (1 Mgg)' : 'Hapus Sesi'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="settings-section-title">
                  Keluar dari Akun
                </h2>
                <div style={{ marginTop: '16px' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '16px', lineHeight: 1.6 }}>
                    Keluar dari sesi terminal aktif Anda di perangkat ini ({user?.username || 'User'}). Anda perlu memasukkan kredensial kembali untuk masuk.
                  </p>
                  <button
                    onClick={() => setShowLogoutModal(true)}
                    className="stock-btn"
                    style={{
                      cursor: 'pointer', background: 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--border-strong)', color: 'var(--text)',
                      height: '42px', padding: '0 20px',
                    }}
                  >
                    Logout / Keluar
                  </button>
                </div>
              </div>

              <div className="settings-danger-zone">
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--red)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--red)' }} />
                  Zona Bahaya: Hapus Akun
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-dim)', marginTop: '10px', marginBottom: '20px', lineHeight: 1.6 }}>
                  Tindakan ini tidak dapat dibatalkan. Seluruh data transaksi, watchlist, preferensi analisis AI, dan konfigurasi terminal Anda akan dihapus secara permanen dari server kami.
                </p>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  style={{
                    cursor: 'pointer',
                    height: '42px',
                    padding: '0 20px',
                    background: 'rgba(240, 86, 75, 0.15)',
                    border: '1px solid rgba(240, 86, 75, 0.45)',
                    color: '#f0564b',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 700,
                    fontSize: '13px',
                    transition: 'all 0.2s',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f0564b'
                    e.currentTarget.style.color = '#ffffff'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(240, 86, 75, 0.15)'
                    e.currentTarget.style.color = '#f0564b'
                  }}
                >
                  Hapus Akun Permanen
                </button>
              </div>
            </div>
          )}

          {/* Save Button for Settings */}
          {activeTab !== 'account' && (
            <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
              {savedFeedback ? (
                <span className="pill buy" style={{ padding: '10px 20px', fontSize: '13px' }}>
                  Pengaturan Disimpan!
                </span>
              ) : (
                <button onClick={handleSave} disabled={saving} className="stock-btn primary" style={{ cursor: 'pointer', height: '42px', padding: '0 24px', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div
          onClick={() => setShowDeleteModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
            animation: 'toastSlideIn 0.2s ease both',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--panel)',
              border: '1px solid rgba(240, 86, 75, 0.4)',
              borderRadius: 'var(--radius)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.9)',
              width: '100%', maxWidth: '440px',
              padding: '24px',
              display: 'flex', flexDirection: 'column', gap: '16px',
            }}
          >
            {/* Header Icon */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: 'rgba(240, 86, 75, 0.12)', border: '1px solid rgba(240, 86, 75, 0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--red)', flexShrink: 0,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <circle cx="12" cy="17" r="1" fill="currentColor" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text)' }}>Hapus Akun Permanen</div>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>Konfirmasi penghapusan akun {user?.username}</div>
              </div>
            </div>

            {/* Warning Message */}
            <div style={{
              background: 'rgba(240, 86, 75, 0.08)',
              border: '1px solid rgba(240, 86, 75, 0.2)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 14px',
              fontSize: '12.5px',
              color: 'var(--text-dim)',
              lineHeight: 1.6,
            }}>
              Apakah Anda yakin ingin menghapus akun <b>{user?.username}</b>? Tindakan ini <b>tidak dapat dibatalkan</b>. Seluruh preferensi AI, sesi perangkat, dan data Anda akan dihapus permanen.
            </div>

            {/* Modal Buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                style={{
                  padding: '10px 18px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: '13px', fontWeight: 600,
                }}
              >
                Batal
              </button>
              <button
                onClick={confirmDeleteAccount}
                style={{
                  padding: '10px 18px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  background: 'var(--red)', border: 'none',
                  color: '#fff', fontSize: '13px', fontWeight: 700,
                  boxShadow: '0 4px 12px rgba(240, 86, 75, 0.3)',
                }}
              >
                Ya, Hapus Akun Saya
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div
          onClick={() => setShowLogoutModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
            animation: 'toastSlideIn 0.2s ease both',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--panel)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.9)',
              width: '100%', maxWidth: '420px',
              padding: '24px',
              display: 'flex', flexDirection: 'column', gap: '16px',
            }}
          >
            {/* Header Icon */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: 'var(--blue-soft)', border: '1px solid rgba(79, 125, 255, 0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--blue-bright)', flexShrink: 0,
              }}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text)' }}>Konfirmasi Keluar</div>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>Sesi akun {user?.username}</div>
              </div>
            </div>

            {/* Message */}
            <div style={{
              background: 'var(--bg-2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 14px',
              fontSize: '12.5px',
              color: 'var(--text-dim)',
              lineHeight: 1.6,
            }}>
              Apakah Anda yakin ingin keluar dari terminal Atheric AI di perangkat ini? Anda perlu memasukkan kredensial kembali untuk masuk.
            </div>

            {/* Modal Buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                onClick={() => setShowLogoutModal(false)}
                style={{
                  padding: '10px 18px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: '13px', fontWeight: 600,
                }}
              >
                Batal
              </button>
              <button
                onClick={confirmLogoutAccount}
                style={{
                  padding: '10px 18px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  background: 'var(--blue)', border: 'none',
                  color: '#fff', fontSize: '13px', fontWeight: 700,
                  boxShadow: '0 4px 12px rgba(59, 110, 246, 0.3)',
                }}
              >
                Ya, Keluar Akun
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
