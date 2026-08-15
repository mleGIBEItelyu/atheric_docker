import { createContext, useContext, useState, useCallback, useRef } from 'react'
import type { ReactNode } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
}

interface ToastContextValue {
  toast: (opts: Omit<Toast, 'id'>) => void
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    clearTimeout(timers.current[id])
    delete timers.current[id]
  }, [])

  const toast = useCallback((opts: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev.slice(-4), { ...opts, id }]) // max 5 stacked
    timers.current[id] = setTimeout(() => remove(id), 3500)
  }, [remove])

  const success = useCallback((title: string, message?: string) => toast({ type: 'success', title, message }), [toast])
  const error   = useCallback((title: string, message?: string) => toast({ type: 'error',   title, message }), [toast])
  const info    = useCallback((title: string, message?: string) => toast({ type: 'info',    title, message }), [toast])
  const warning = useCallback((title: string, message?: string) => toast({ type: 'warning', title, message }), [toast])

  return (
    <ToastContext.Provider value={{ toast, success, error, info, warning }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={remove} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

/* ── Toast Container ── */
function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '16px',
      display: 'flex', flexDirection: 'column', gap: '10px',
      zIndex: 9999, pointerEvents: 'none',
      left: 'auto',
      maxWidth: '360px',
      width: 'calc(100vw - 32px)',
    }}>
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  )
}

/* ── Clean SVG Icon System ── */
function ToastIcon({ type }: { type: ToastType }) {
  switch (type) {
    case 'success':
      return (
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )
    case 'error':
      return (
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )
    case 'warning':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <circle cx="12" cy="17" r="1" fill="currentColor" />
        </svg>
      )
    case 'info':
    default:
      return (
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
  }
}

const COLORS: Record<ToastType, { accent: string; bg: string; border: string }> = {
  success: { accent: 'var(--green)',       bg: 'rgba(46,194,122,0.10)',  border: 'rgba(46,194,122,0.25)' },
  error:   { accent: 'var(--red)',          bg: 'rgba(240,86,75,0.10)',   border: 'rgba(240,86,75,0.25)'  },
  info:    { accent: 'var(--blue-bright)',  bg: 'var(--blue-soft)',       border: 'rgba(79,125,255,0.25)' },
  warning: { accent: 'var(--amber)',        bg: 'rgba(217,161,58,0.10)',  border: 'rgba(217,161,58,0.25)' },
}

function ToastItem({ toast: t, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const c = COLORS[t.type]
  return (
    <div
      className="toast-enter"
      style={{
        pointerEvents: 'all',
        display: 'flex', alignItems: 'flex-start', gap: '12px',
        minWidth: '280px', maxWidth: '360px',
        padding: '13px 16px',
        borderRadius: 'var(--radius)',
        background: 'var(--panel)',
        border: `1px solid ${c.border}`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        animation: 'toastSlideIn 0.28s cubic-bezier(0.34,1.56,0.64,1) both',
        cursor: 'pointer',
      }}
      onClick={() => onRemove(t.id)}
    >
      {/* Icon */}
      <span style={{
        width: '24px', height: '24px', borderRadius: '50%',
        background: c.bg, border: `1px solid ${c.border}`,
        display: 'grid', placeItems: 'center',
        fontSize: '12px', fontWeight: 800, color: c.accent,
        flexShrink: 0,
      }}>
        <ToastIcon type={t.type} />
      </span>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>{t.title}</div>
        {t.message && (
          <div style={{ fontSize: '11.5px', color: 'var(--text-dim)', marginTop: '3px', lineHeight: 1.4 }}>{t.message}</div>
        )}
      </div>

      {/* Progress bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '2px', borderRadius: '0 0 var(--radius) var(--radius)',
        background: c.border, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', background: c.accent,
          animation: 'toastProgress 3.5s linear forwards',
        }} />
      </div>
    </div>
  )
}
