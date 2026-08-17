import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useToast } from '@/components/common/Toast'
import { useAuth } from '@/context/AuthContext'
import { fetchWatchlistApi, toggleWatchlistApi } from '@/services/api'
import { useStock } from '@/hooks/useStock'

function WatchlistItemCard({ ticker, onRemove }: { ticker: string; onRemove: (t: string, e: React.MouseEvent) => void }) {
  const navigate = useNavigate()
  const { data: stock } = useStock(ticker)

  return (
    <div
      onClick={() => navigate(`/stock/${ticker}`)}
      className="card"
      style={{
        padding: '18px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '24px',
        transition: 'background .15s, border-color .15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = '')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)' }}>{ticker}</span>
            <span className="pill hold" style={{ fontSize: '10px', padding: '2px 7px' }}>
              {stock?.initial || ticker.slice(0, 2)}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
            {stock?.name || ticker}
          </div>
        </div>
        <button
          onClick={e => onRemove(ticker, e)}
          style={{ background: 'none', border: 'none', color: 'var(--text-mute)', cursor: 'pointer', padding: '4px' }}
          title="Hapus dari watchlist"
        >
          ✕
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Harga Terkini
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', marginTop: '2px' }}>
            {stock?.price || '—'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Perubahan
          </div>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 800,
              color: stock?.dir === 'up' ? 'var(--green)' : stock?.dir === 'down' ? 'var(--red)' : 'var(--text-dim)',
              marginTop: '2px',
            }}
          >
            {stock?.change || '—'}
          </div>
        </div>
      </div>
    </div>
  )
}

export function Watchlist() {
  const toast = useToast()
  const { isAuthenticated } = useAuth()
  const [watchlist, setWatchlist] = useState<string[]>([])

  useEffect(() => {
    async function loadWatchlist() {
      if (isAuthenticated) {
        try {
          const remoteList = await fetchWatchlistApi()
          if (Array.isArray(remoteList) && remoteList.length > 0) {
            const tickers = remoteList.map((item: any) => item.ticker)
            setWatchlist(tickers)
            return
          }
        } catch {
          // fallback to localStorage
        }
      }

      try {
        const list = JSON.parse(localStorage.getItem('watchlist') || '[]')
        if (Array.isArray(list)) {
          const cleanList = list.filter((t): t is string => typeof t === 'string' && t.trim() !== '')
          setWatchlist(cleanList)
        } else {
          setWatchlist([])
        }
      } catch {
        setWatchlist([])
      }
    }
    loadWatchlist()
    window.addEventListener('storage', loadWatchlist)
    return () => window.removeEventListener('storage', loadWatchlist)
  }, [isAuthenticated])

  async function handleRemove(ticker: string, e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()

    if (isAuthenticated) {
      await toggleWatchlistApi(ticker)
    }

    const newList = watchlist.filter(t => t !== ticker)
    localStorage.setItem('watchlist', JSON.stringify(newList))
    setWatchlist(newList)
    window.dispatchEvent(new Event('storage'))
    toast.warning(`${ticker} dihapus`, 'Saham ini tidak lagi ada di daftar pantau Anda.')
  }

  return (
    <div className="content">
      <div className="page-head">
        <div className="page-title">DAFTAR PANTAU</div>
        <div className="page-sub">Pantau harga, imbal hasil, dan analisis AI emiten favorit Anda dalam satu tempat.</div>
      </div>

      {watchlist.length === 0 ? (
        <div
          className="card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '64px 24px',
            textAlign: 'center',
            minHeight: '320px',
          }}
        >
          <svg
            style={{ width: '48px', height: '48px', color: 'var(--text-mute)', marginBottom: '16px' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
            />
          </svg>
          <div className="card-title" style={{ marginBottom: '6px' }}>
            Daftar Pantau Kosong
          </div>
          <p className="page-sub" style={{ marginTop: 0, fontSize: '12px', maxWidth: '280px', marginBottom: '24px' }}>
            Anda belum menambahkan saham apapun ke daftar pantau Anda.
          </p>
          <Link to="/" className="stock-btn primary">
            Temukan Saham di Ranking Model
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
          {watchlist.map(ticker => (
            <WatchlistItemCard key={ticker} ticker={ticker} onRemove={handleRemove} />
          ))}
        </div>
      )}
    </div>
  )
}
