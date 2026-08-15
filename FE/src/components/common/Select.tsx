import { useState, useRef, useEffect } from 'react'

export interface SelectOption {
  value: string
  label: string
}

interface Props {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  style?: React.CSSProperties
}

export function Select({ value, onChange, options, style }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.value === value)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-2)',
          border: open ? '1px solid var(--blue)' : '1px solid var(--border-strong)',
          color: 'var(--text)',
          fontSize: '13px',
          fontFamily: 'inherit',
          cursor: 'pointer',
          transition: 'border-color .15s',
          textAlign: 'left',
        }}
      >
        <span>{selected?.label}</span>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{
            flexShrink: 0,
            color: 'var(--text-mute)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform .2s',
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: 'var(--panel)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-sm)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
            zIndex: 200,
            overflow: 'hidden',
          }}
        >
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false) }}
              style={{
                width: '100%',
                display: 'block',
                padding: '10px 14px',
                textAlign: 'left',
                fontSize: '13px',
                fontFamily: 'inherit',
                cursor: 'pointer',
                transition: 'background .12s, color .12s',
                background: opt.value === value ? 'var(--blue-soft)' : 'transparent',
                color: opt.value === value ? 'var(--blue-bright)' : 'var(--text)',
                borderBottom: '1px solid var(--border)',
              }}
              onMouseEnter={e => {
                if (opt.value !== value) {
                  e.currentTarget.style.background = 'var(--panel-hover)'
                  e.currentTarget.style.color = 'var(--text)'
                }
              }}
              onMouseLeave={e => {
                if (opt.value !== value) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--text)'
                }
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
