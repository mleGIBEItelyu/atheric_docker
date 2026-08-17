import { useState, useEffect } from 'react'

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [showReconnected, setShowReconnected] = useState(false)

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true)
      setShowReconnected(true)
      const timer = setTimeout(() => setShowReconnected(false), 3000)
      return () => clearTimeout(timer)
    }

    function handleOffline() {
      setIsOnline(false)
      setShowReconnected(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline && !showReconnected) return null

  if (showReconnected) {
    return (
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 9999,
        background: 'rgba(34, 197, 94, 0.95)',
        backdropFilter: 'blur(8px)',
        color: '#fff',
        padding: '8px 16px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: 700,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        animation: 'fadeIn 0.3s ease',
      }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff' }} />
        Koneksi Kembali Online • Data Tersinkron
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 9999,
      background: 'rgba(234, 179, 8, 0.95)',
      backdropFilter: 'blur(8px)',
      color: '#1e293b',
      padding: '8px 16px',
      borderRadius: '999px',
      fontSize: '12px',
      fontWeight: 700,
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      animation: 'fadeIn 0.3s ease',
    }}>
      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ca8a04', animation: 'pulse 1.5s infinite' }} />
      Mode Offline • Menampilkan Data Cache Cepat
    </div>
  )
}
