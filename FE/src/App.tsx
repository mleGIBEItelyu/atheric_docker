import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { LoginPage } from '@/components/auth/LoginPage'

import { Dashboard } from '@/pages/Dashboard'
import { Markets } from '@/pages/Markets'
import { Watchlist } from '@/pages/Watchlist'
import { Settings } from '@/pages/Settings'
import { Support } from '@/pages/Support'
import { Evaluasi } from '@/pages/Evaluasi'
import { Notifications } from '@/pages/Notifications'
import { AdminDashboard } from '@/pages/AdminDashboard'
import { usePushNotificationWatcher } from '@/hooks/usePushNotifications'

function PageLoadingFallback() {
  return (
    <div style={{
      padding: '60px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      color: 'var(--text-dim)',
      fontFamily: 'var(--font)',
    }}>
      <div style={{
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        border: '2.5px solid rgba(79, 125, 255, 0.2)',
        borderTopColor: 'var(--blue)',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ fontSize: '13px', fontWeight: 600 }}>Memuat Halaman...</div>
    </div>
  )
}

// Configure TanStack Query Client with optimal caching for monthly forecasts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 60 * 24, // Keep data fresh in cache for 24 hours
      gcTime: 1000 * 60 * 60 * 24 * 7,  // Keep inactive cache in memory for 7 days
      refetchOnWindowFocus: false,     // Prevent unnecessary refetches when switching browser tabs
      retry: 1,
    },
  },
})

function PrivateAppContent() {
  const { isAuthenticated, isLoading } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')

  // Watch for real notifications and trigger browser Push Notifications if permission is granted
  usePushNotificationWatcher()

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        width: '100vw',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        color: 'var(--text)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: '3px solid rgba(79, 125, 255, 0.2)',
          borderTopColor: 'var(--blue)',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-dim)' }}>
          Memverifikasi Sesi Private Atheric AI...
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginPage />
  }

  return (
    <Routes>
      <Route element={<AppLayout onSearch={setSearchQuery} />}>
        <Route path="/" element={<Markets searchQuery={searchQuery} />} />
        <Route path="/markets" element={<Markets searchQuery={searchQuery} />} />
        <Route path="/stock/:ticker" element={<Dashboard />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/evaluasi" element={<Evaluasi />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/support" element={<Support />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="*" element={<Markets searchQuery={searchQuery} />} />
      </Route>
    </Routes>
  )
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PrivateAppContent />
      </AuthProvider>
    </QueryClientProvider>
  )
}
