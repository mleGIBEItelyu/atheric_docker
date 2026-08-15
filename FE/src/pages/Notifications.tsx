import { useState } from 'react'
import { useToast } from '@/components/common/Toast'

interface NotificationItem {
  id: string
  title: string
  body: string
  time: string
  category: 'alert' | 'sentiment' | 'system'
  impact: 'High' | 'Medium' | 'Info'
  read: boolean
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1',
    title: 'Sentimen Berubah ke Bullish - BBCA',
    body: 'Model Generative Financial LLM mendeteksi akumulasi institusi pada saham BBCA. Proyeksi harga bergerak menuju resistance Rp 10.500.',
    time: '10 menit yang lalu',
    category: 'sentiment',
    impact: 'High',
    read: false,
  },
  {
    id: 'n2',
    title: 'Key Level Alert - TLKM Menyentuh Support',
    body: 'TLKM menyentuh level support kritis di Rp 3.720. Volatilitas meningkat di atas rata-rata 20 hari.',
    time: '1 jam yang lalu',
    category: 'alert',
    impact: 'High',
    read: false,
  },
  {
    id: 'n3',
    title: 'Keamanan Akun: Sesi Login Perangkat Baru',
    body: 'Terdeteksi sesi login baru dari Windows Terminal (IP 180.252.19.42). Kebijakan proteksi cooldown 1 minggu telah aktif.',
    time: '3 jam yang lalu',
    category: 'system',
    impact: 'Medium',
    read: true,
  },
  {
    id: 'n4',
    title: 'High-Impact News: BI Rate Tetap 6.00%',
    body: 'Bank Indonesia memutuskan untuk mempertahankan suku bunga acuan 6.00%. Sektor perbankan diproyeksikan tetap konsisten.',
    time: 'Kemarin, 16:45',
    category: 'sentiment',
    impact: 'High',
    read: true,
  },
  {
    id: 'n5',
    title: 'Pembaruan Model Generative Financial LLM v2.4',
    body: 'Akurasi ruang prediksi confidence interval (CI 90%) meningkat +4.2% untuk emiten perbankan & energi.',
    time: '2 hari lalu',
    category: 'system',
    impact: 'Info',
    read: true,
  },
]

export function Notifications() {
  const toast = useToast()
  const [items, setItems] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS)
  const [filter, setFilter] = useState<'all' | 'alert' | 'sentiment' | 'system'>('all')

  const filteredItems = filter === 'all' ? items : items.filter(i => i.category === filter)
  const unreadCount = items.filter(i => !i.read).length

  function markAllRead() {
    setItems(prev => prev.map(i => ({ ...i, read: true })))
    toast.success('Ditandai Dibaca', 'Seluruh notifikasi telah ditandai sebagai dibaca.')
  }

  function clearNotifications() {
    setItems([])
    toast.info('Riwayat Dikosongkan', 'Seluruh riwayat notifikasi berhasil dihapus.')
  }

  function toggleRead(id: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, read: !i.read } : i))
  }

  return (
    <div className="content">
      {/* Header */}
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            RIWAYAT NOTIFIKASI
            {unreadCount > 0 && (
              <span style={{ fontSize: '12px', fontWeight: 800, padding: '3px 9px', borderRadius: '999px', background: 'var(--blue)', color: '#fff' }}>
                {unreadCount} Baru
              </span>
            )}
          </div>
          <div className="page-sub">Daftar lengkap riwayat alert sentimen saham, perubahan key levels, dan log keamanan akun Anda.</div>
        </div>

        {/* Top actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="stock-btn"
              style={{
                fontSize: '12.5px', cursor: 'pointer', height: '38px', padding: '0 14px',
                background: 'var(--blue-soft)', border: '1px solid rgba(79,125,255,0.3)', color: 'var(--blue-bright)',
                display: 'inline-flex', alignItems: 'center', gap: '6px',
              }}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Tandai Semua Dibaca
            </button>
          )}
          {items.length > 0 && (
            <button
              onClick={clearNotifications}
              className="stock-btn"
              style={{
                fontSize: '12.5px', cursor: 'pointer', height: '38px', padding: '0 14px',
                background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--text-dim)',
              }}
            >
              Kosongkan Riwayat
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {[
          { id: 'all', label: `Semua (${items.length})` },
          { id: 'sentiment', label: 'Sentimen AI' },
          { id: 'alert', label: 'Alert Saham' },
          { id: 'system', label: 'Sistem & Keamanan' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all .15s ease',
              background: filter === tab.id ? 'var(--blue-soft)' : 'var(--panel)',
              border: filter === tab.id ? '1px solid var(--blue)' : '1px solid var(--border)',
              color: filter === tab.id ? 'var(--blue-bright)' : 'var(--text-dim)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredItems.length === 0 ? (
          <div className="card" style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-mute)' }}>
            <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 12px', opacity: 0.5 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>Tidak ada notifikasi</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>Seluruh riwayat pemberitahuan dalam kategori ini telah dibaca atau dikosongkan.</div>
          </div>
        ) : (
          filteredItems.map(item => (
            <div
              key={item.id}
              onClick={() => toggleRead(item.id)}
              className="card"
              style={{
                padding: '16px 20px',
                cursor: 'pointer',
                background: item.read ? 'var(--panel)' : 'rgba(79, 125, 255, 0.04)',
                border: item.read ? '1px solid var(--border)' : '1px solid rgba(79, 125, 255, 0.3)',
                borderRadius: 'var(--radius)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '16px',
                transition: 'all .15s ease',
              }}
            >
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', flex: 1 }}>
                {/* Category Icon */}
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: item.category === 'sentiment'
                    ? 'rgba(46,194,122,0.12)' : item.category === 'alert'
                      ? 'rgba(240,86,75,0.12)' : 'var(--blue-soft)',
                  border: `1px solid ${item.category === 'sentiment'
                    ? 'rgba(46,194,122,0.3)' : item.category === 'alert'
                      ? 'rgba(240,86,75,0.3)' : 'rgba(79,125,255,0.3)'}`,
                  color: item.category === 'sentiment'
                    ? 'var(--green)' : item.category === 'alert'
                      ? 'var(--red)' : 'var(--blue-bright)',
                }}>
                  {item.category === 'sentiment' ? (
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  ) : item.category === 'alert' ? (
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  )}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {!item.read && (
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--blue)', flexShrink: 0 }} />
                    )}
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{item.title}</div>
                    <span style={{
                      fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px',
                      background: item.impact === 'High' ? 'rgba(240,86,75,0.12)' : 'var(--blue-soft)',
                      color: item.impact === 'High' ? 'var(--red)' : 'var(--blue-bright)',
                      border: `1px solid ${item.impact === 'High' ? 'rgba(240,86,75,0.3)' : 'rgba(79,125,255,0.3)'}`,
                    }}>
                      {item.impact} Impact
                    </span>
                  </div>

                  <div style={{ fontSize: '12.5px', color: 'var(--text-dim)', marginTop: '6px', lineHeight: 1.5 }}>
                    {item.body}
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--text-mute)', marginTop: '8px' }}>
                    {item.time}
                  </div>
                </div>
              </div>

              {/* Status toggle button */}
              <button
                onClick={(e) => { e.stopPropagation(); toggleRead(item.id) }}
                style={{
                  fontSize: '11px',
                  color: 'var(--text-mute)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '4px',
                }}
              >
                {item.read ? 'Tandai Belum Dibaca' : 'Tandai Dibaca'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
