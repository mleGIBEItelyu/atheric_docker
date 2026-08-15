import { useState, useRef, useEffect } from 'react'
import html2canvas from 'html2canvas'
import { useToast } from '@/components/common/Toast'

interface Props {
  ticker: string
  stockName: string
  price: string
  change: string
  dir: 'up' | 'down'
  onClose: () => void
}

const SOCIALS = [
  {
    id: 'twitter',
    label: 'X / Twitter',
    color: '#000',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    getUrl: (text: string, url: string) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    color: '#25D366',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
    getUrl: (text: string, url: string) =>
      `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`,
  },
  {
    id: 'telegram',
    label: 'Telegram',
    color: '#26A5E4',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    ),
    getUrl: (text: string, url: string) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    color: '#0A66C2',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
    getUrl: (text: string, url: string) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}`,
  },
]

export function ShareModal({ ticker, stockName, price, change, dir, onClose }: Props) {
  const toast = useToast()
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [capturing, setCapturing] = useState(true)
  const [imageBlob, setImageBlob] = useState<Blob | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  const pageUrl = window.location.href
  const shareText = `${ticker} - ${stockName}\nHarga: ${price} (${dir === 'up' ? '+' : '-'}${change})\n\nDianalisis oleh Atheric AI Terminal`

  // Capture screenshot on mount of ONLY the stock analysis panel (excluding sidebar & modals)
  useEffect(() => {
    const target = document.querySelector('#stock-analysis-panel') || document.querySelector('.content') || document.querySelector('main')
    if (!target) { setCapturing(false); return }

    html2canvas(target as HTMLElement, {
      backgroundColor: getComputedStyle(document.documentElement)
        .getPropertyValue('--bg').trim() || '#111111',
      scale: 2,
      useCORS: true,
      logging: false,
      ignoreElements: (el) => el.classList.contains('share-modal-overlay') || el.classList.contains('sidebar'),
    }).then(canvas => {
      canvas.toBlob(blob => {
        if (blob) {
          setImageBlob(blob)
          setScreenshot(canvas.toDataURL('image/png'))
        }
        setCapturing(false)
      }, 'image/png')
    }).catch(() => setCapturing(false))
  }, [])

  // Close on backdrop click
  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose()
  }

  // Close on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  function downloadImage() {
    if (!screenshot) return
    const a = document.createElement('a')
    a.href = screenshot
    a.download = `atheric-${ticker}-${Date.now()}.png`
    a.click()
    toast.success('Gambar diunduh', `${ticker} screenshot berhasil disimpan.`)
  }

  async function nativeShare() {
    if (!imageBlob) { toast.error('Screenshot belum siap', 'Tunggu sebentar.'); return }
    const file = new File([imageBlob], `atheric-${ticker}.png`, { type: 'image/png' })
    if (navigator.share && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ title: `${ticker} - Atheric AI`, text: shareText, files: [file] })
        toast.success('Berhasil dibagikan!', '')
      } catch { /* user cancelled */ }
    } else {
      navigator.clipboard.writeText(`${shareText}\n\n${pageUrl}`)
      toast.info('Link disalin ke clipboard', pageUrl)
    }
  }

  function openSocial(social: typeof SOCIALS[number]) {
    window.open(social.getUrl(shareText, pageUrl), '_blank', 'noopener,noreferrer,width=600,height=500')
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleBackdrop}
      className="share-modal-overlay"
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        animation: 'toastSlideIn 0.2s ease both',
      }}
    >
      <div style={{
        background: 'var(--panel)', border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius)', boxShadow: '0 32px 80px rgba(0,0,0,0.8)',
        width: '100%', maxWidth: '640px',
        display: 'flex', flexDirection: 'column', gap: '0',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
        }}>
          <div>
            <div style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--text)' }}>Bagikan Analisis Saham</div>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>{ticker} - {stockName}</div>
          </div>
          <button
            onClick={onClose}
            style={{ fontSize: '22px', color: 'var(--text-mute)', lineHeight: 1, padding: '2px 6px', cursor: 'pointer', borderRadius: '6px', background: 'none', border: 'none' }}
          >×</button>
        </div>

        {/* Screenshot preview */}
        <div style={{
          margin: '16px 20px', borderRadius: '10px', overflow: 'hidden',
          border: '1px solid var(--border-strong)', background: 'var(--bg-2)',
          minHeight: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)',
        }}>
          {capturing ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '40px', color: 'var(--text-dim)' }}>
              <svg style={{ width: '32px', height: '32px', animation: 'spin 1s linear infinite' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Mengambil screenshot panel saham {ticker}...</span>
            </div>
          ) : screenshot ? (
            <div style={{ width: '100%', maxHeight: '340px', overflowY: 'auto', background: '#111' }}>
              <img src={screenshot} alt={`Screenshot ${ticker}`} style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain' }} />
            </div>
          ) : (
            <div style={{ padding: '32px', color: 'var(--text-mute)', fontSize: '12.5px', textAlign: 'center' }}>
              Screenshot tidak tersedia. Gunakan tombol di bawah untuk share link.
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Primary action row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button
              onClick={downloadImage}
              disabled={!screenshot}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '12px 14px', borderRadius: 'var(--radius-sm)', cursor: screenshot ? 'pointer' : 'not-allowed',
                background: 'var(--blue)', color: '#fff', fontWeight: 700, fontSize: '13px',
                opacity: screenshot ? 1 : 0.5, transition: 'background .15s, filter .15s', border: 'none',
              }}
              onMouseEnter={e => screenshot && (e.currentTarget.style.filter = 'brightness(1.15)')}
              onMouseLeave={e => (e.currentTarget.style.filter = '')}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Unduh Gambar PNG (HD)
            </button>
            <button
              onClick={nativeShare}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '12px 14px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                background: 'var(--panel-2)', color: 'var(--text)', fontWeight: 700, fontSize: '13px',
                border: '1px solid var(--border-strong)', transition: 'background .15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--panel-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--panel-2)')}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
              </svg>
              {typeof navigator.share !== 'undefined' ? 'Bagikan ke App' : 'Salin Link'}
            </button>
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-mute)', fontWeight: 700, letterSpacing: '0.05em' }}>BAGIKAN KE MEDIA SOSIAL</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          </div>

          {/* Social platform grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {SOCIALS.map(s => (
              <button
                key={s.id}
                onClick={() => openSocial(s)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                  padding: '12px 8px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  background: 'var(--panel-2)', border: '1px solid var(--border)',
                  color: 'var(--text-dim)', fontSize: '11.5px', fontWeight: 700,
                  transition: 'all .15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--panel-hover)'
                  e.currentTarget.style.borderColor = s.color
                  e.currentTarget.style.color = s.color
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--panel-2)'
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.color = 'var(--text-dim)'
                }}
              >
                <span style={{ color: s.color }}>{s.icon}</span>
                {s.label}
              </button>
            ))}
          </div>

          {/* Share text preview */}
          <div style={{
            background: 'var(--bg-2)', border: '1px solid var(--border)',
            borderRadius: '8px', padding: '10px 14px',
            fontSize: '11.5px', color: 'var(--text-dim)', lineHeight: 1.6,
            fontFamily: 'monospace',
            whiteSpace: 'pre-line',
          }}>
            {shareText}
          </div>
        </div>
      </div>
    </div>
  )
}
