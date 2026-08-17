import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/common/Toast'
import {
  fetchNotificationsApi,
  markAllNotificationsReadApi,
  toggleNotificationReadApi,
  clearNotificationsApi,
  type NotificationItem
} from '@/services/api'

export function Notifications() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'all' | 'volume' | 'alert' | 'sentiment' | 'system'>('all')

  const { data: items = [], isLoading } = useQuery<NotificationItem[]>({
    queryKey: ['notifications'],
    queryFn: fetchNotificationsApi,
    staleTime: 10 * 1000,
    refetchInterval: 30 * 1000,
  })

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsReadApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('Ditandai Dibaca', 'Seluruh notifikasi telah ditandai sebagai dibaca.')
    },
  })

  const toggleReadMutation = useMutation({
    mutationFn: (id: string | number) => toggleNotificationReadApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const clearMutation = useMutation({
    mutationFn: clearNotificationsApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.info('Riwayat Dikosongkan', 'Seluruh riwayat notifikasi berhasil dihapus.')
    },
  })

  const filteredItems = filter === 'all' ? items : items.filter(i => i.category === filter)
  const unreadCount = items.filter(i => !i.read).length

  return (
    <div className="content">
      {/* Header */}
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            RIWAYAT NOTIFIKASI
            {unreadCount > 0 && (
              <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '999px', background: 'var(--blue)', color: '#fff' }}>
                {unreadCount} Baru
              </span>
            )}
          </div>
          <div className="page-sub">Daftar riwayat deteksi aktivitas akun, lonjakan volume, sentimen pasar, dan pembaruan model.</div>
        </div>

        {/* Top Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
              className="stock-btn primary"
              style={{ fontSize: '12px', height: '34px', padding: '0 12px', cursor: 'pointer' }}
            >
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Tandai Semua Dibaca
            </button>
          )}
          {items.length > 0 && (
            <button
              onClick={() => clearMutation.mutate()}
              disabled={clearMutation.isPending}
              className="stock-btn"
              style={{ fontSize: '12px', height: '34px', padding: '0 12px', cursor: 'pointer' }}
            >
              Kosongkan Riwayat
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs Chips */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: '4px',
      }}>
        {[
          { id: 'all', label: `Semua (${items.length})` },
          { id: 'volume', label: `Volume Spikes (${items.filter(i => i.category === 'volume').length})` },
          { id: 'sentiment', label: 'Sentimen AI' },
          { id: 'alert', label: 'Alert Saham' },
          { id: 'system', label: 'Sistem & Keamanan' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
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
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="card skeleton" style={{ height: '80px', width: '100%' }} />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="card" style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-mute)' }}>
            <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 12px', opacity: 0.5 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>Tidak ada notifikasi</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>Seluruh riwayat pemberitahuan dalam kategori ini telah dibaca atau dikosongkan.</div>
          </div>
        ) : (
          filteredItems.map(item => {
            const cleanTitle = item.title
              .replace(/genesis ai v2\.0\s*\(.*?\)/gi, 'Model AI v2.0')
              .replace(/genesis/gi, 'Model AI')
            const cleanBody = item.body
              .replace(/genesis/gi, 'Generative AI')

            return (
              <div
                key={item.id}
                onClick={() => toggleReadMutation.mutate(item.id)}
                className="card"
                style={{
                  padding: '16px',
                  cursor: 'pointer',
                  background: item.read ? 'var(--panel)' : 'rgba(79, 125, 255, 0.04)',
                  border: item.read ? '1px solid var(--border)' : '1px solid rgba(79, 125, 255, 0.3)',
                  borderRadius: 'var(--radius)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                  transition: 'all .15s ease',
                  boxSizing: 'border-box',
                  width: '100%',
                }}
              >
                {/* Category Icon */}
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: item.category === 'volume'
                    ? 'rgba(234,179,8,0.12)' : item.category === 'sentiment'
                      ? 'rgba(46,194,122,0.12)' : item.category === 'alert'
                        ? 'rgba(240,86,75,0.12)' : 'var(--blue-soft)',
                  border: `1px solid ${item.category === 'volume'
                    ? 'rgba(234,179,8,0.3)' : item.category === 'sentiment'
                      ? 'rgba(46,194,122,0.3)' : item.category === 'alert'
                        ? 'rgba(240,86,75,0.3)' : 'rgba(79,125,255,0.3)'}`,
                  color: item.category === 'volume'
                    ? '#eab308' : item.category === 'sentiment'
                      ? 'var(--green)' : item.category === 'alert'
                        ? 'var(--red)' : 'var(--blue-bright)',
                }}>
                  {item.category === 'volume' ? (
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6M9 19v-6m4 6v-10m4 10v-4" />
                    </svg>
                  ) : item.category === 'sentiment' ? (
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

                {/* Content Block */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Top line: Impact Tag + Time + Read status */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {!item.read && (
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--blue-bright)', flexShrink: 0 }} />
                      )}
                      <span style={{
                        fontSize: '9.5px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px',
                        background: item.impact === 'High' ? 'rgba(240,86,75,0.12)' : 'var(--blue-soft)',
                        color: item.impact === 'High' ? 'var(--red)' : 'var(--blue-bright)',
                        border: `1px solid ${item.impact === 'High' ? 'rgba(240,86,75,0.3)' : 'rgba(79,125,255,0.3)'}`,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}>
                        {item.impact}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-mute)' }}>
                        {item.time || 'Hari ini'}
                      </span>
                    </div>

                    <button
                      onClick={(e) => { e.stopPropagation(); toggleReadMutation.mutate(item.id) }}
                      style={{
                        fontSize: '11px',
                        color: item.read ? 'var(--text-mute)' : 'var(--blue-bright)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 600,
                      }}
                    >
                      {item.read ? 'Tandai Belum Dibaca' : 'Tandai Dibaca'}
                    </button>
                  </div>

                  {/* Title */}
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.4, marginBottom: '5px' }}>
                    {cleanTitle}
                  </div>

                  {/* Body */}
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)', lineHeight: 1.5 }}>
                    {cleanBody}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
