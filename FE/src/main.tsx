import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App } from './App'
import { ToastProvider } from '@/components/common/Toast'
import './styles/globals.css'

// ── Apply saved theme immediately before first render (prevents flicker) ──
;(function applyStoredTheme() {
  try {
    const raw = localStorage.getItem('terminal_settings')
    if (!raw) return
    const { theme } = JSON.parse(raw) as { theme?: string }
    if (theme && theme !== 'dark') {
      document.documentElement.setAttribute('data-theme', theme)
    }
  } catch {
    // ignore parse errors
  }
})()

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <App/>
        </ToastProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
)
