import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FilterIcon, DownloadIcon } from '@/components/common/icons'
import { useRankingRows } from '@/hooks/useMarkets'
import { useToast } from '@/components/common/Toast'
import type { RankingRow } from '@/types'

type RecFilter = 'ALL' | 'BUY' | 'HOLD' | 'SELL'

function exportCSV(rows: RankingRow[]) {
  const headers = ['Rank', 'Ticker', 'Company', 'Exp. Return', 'Confidence', 'Rec', 'Market Cap']
  const lines = [headers.join(','), ...rows.map(r => [r.rank, r.ticker, `"${r.company}"`, r.ret, r.conf, r.rec, r.cap].join(','))]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'atheric-ranking.csv'; a.click()
  URL.revokeObjectURL(url)
}

function getWatchlist(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem('watchlist') || '[]')
    return Array.isArray(list) ? list.filter((t): t is string => typeof t === 'string' && t.trim() !== '') : []
  } catch {
    return []
  }
}

function StarButton({ ticker }: { ticker: string }) {
  const [starred, setStarred] = useState(() => getWatchlist().includes(ticker))
  const [hovered, setHovered] = useState(false)
  const toast = useToast()

  // Sync when other components update localStorage
  useEffect(() => {
    function onStorage() { setStarred(getWatchlist().includes(ticker)) }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [ticker])

  function toggle(e: React.MouseEvent) {
    e.stopPropagation() // prevent row navigation
    const list = getWatchlist()
    let next: string[]
    if (list.includes(ticker)) {
      next = list.filter(t => t !== ticker)
      setStarred(false)
      toast.warning(`${ticker} dihapus dari watchlist`, 'Saham ini tidak lagi dipantau.')
    } else {
      next = [...list, ticker]
      setStarred(true)
      toast.success(`${ticker} ditambahkan ke watchlist`, 'Pantau pergerakan saham ini di halaman Watchlist.')
    }
    localStorage.setItem('watchlist', JSON.stringify(next))
    window.dispatchEvent(new Event('storage'))
  }

  return (
    <button
      onClick={toggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={starred ? `Hapus ${ticker} dari watchlist` : `Tambah ${ticker} ke watchlist`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '3px',
        borderRadius: '5px',
        color: starred ? 'var(--amber)' : hovered ? 'var(--text-dim)' : 'var(--text-mute)',
        transition: 'color .15s, transform .15s',
        transform: hovered ? 'scale(1.2)' : 'scale(1)',
        verticalAlign: 'middle',
        marginLeft: '6px',
        flexShrink: 0,
      }}
    >
      <svg
        width="14" height="14" viewBox="0 0 24 24"
        fill={starred ? 'currentColor' : 'none'}
        stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </button>
  )
}

export function RankingTable({ searchQuery }: { searchQuery?: string }) {
  const navigate = useNavigate()
  const toast = useToast()
  const { data: rows = [] } = useRankingRows()
  const [recFilter, setRecFilter] = useState<RecFilter>('ALL')
  const [showFilter, setShowFilter] = useState(false)

  const filtered = useMemo(() => {
    let r = rows
    if (recFilter !== 'ALL') r = r.filter(row => row.rec === recFilter)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      r = r.filter(row => row.ticker.toLowerCase().includes(q) || row.company.toLowerCase().includes(q))
    }
    return r
  }, [rows, recFilter, searchQuery])

  const COLUMNS = ['Rank', 'Ticker', 'Company', 'Exp. Return', 'Confidence', 'Rec', 'Market Cap']

  return (
    <section className="card table-card">
      <div className="table-head">
        <span className="card-title">Full Ranking Model</span>
        <div className="table-actions">
          <button className="ghost-btn" onClick={() => setShowFilter(f => !f)}>
            <FilterIcon/>Filter
          </button>
          <button className="ghost-btn" onClick={() => { exportCSV(filtered); toast.success('Export berhasil', `${filtered.length} emiten diekspor ke file CSV.`) }}>
            <DownloadIcon/>Export
          </button>
        </div>
      </div>
      {showFilter && (
        <div className="filter-bar">
          {(['ALL', 'BUY', 'HOLD', 'SELL'] as RecFilter[]).map(f => (
            <button key={f} className={`filter-chip chip-${f.toLowerCase()}${recFilter === f ? ' active' : ''}`} onClick={() => setRecFilter(f)}>{f}</button>
          ))}
        </div>
      )}
      {filtered.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '260px', textAlign: 'center', padding: '48px 24px' }}>
          <svg style={{ width: '40px', height: '40px', color: 'var(--text-mute)', marginBottom: '12px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.603 10.603Z" />
          </svg>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>Emiten Tidak Ditemukan</div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-dim)', maxWidth: '280px' }}>Tidak ada emiten yang cocok dengan kueri pencarian atau filter Anda.</div>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="rank-table">
            <thead>
              <tr>{COLUMNS.map((c, i) => <th key={c} className={['Exp. Return', 'Market Cap'].includes(c) ? 'num' : ''}>{c}{i === 0 ? ' ↓' : ''}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map(row => (
                <tr key={row.rank} onClick={() => navigate(`/stock/${row.ticker}`)} style={{ cursor: 'pointer' }}>
                  <td className="td-rank">{row.rank}</td>
                  <td className="td-ticker">{row.ticker}</td>
                  <td className="td-company">
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                      {row.company}
                      <StarButton ticker={row.ticker} />
                    </span>
                  </td>
                  <td className={`num ret ${row.dir}`}>{row.ret}</td>
                  <td>
                    <div className="conf-cell">
                      <span className="conf-text">{row.conf}</span>
                      <span className="conf-bar"><span style={{ width: `${row.confPct}%` }}/></span>
                    </div>
                  </td>
                  <td><span className={`pill ${row.rec.toLowerCase()}`}>{row.rec}</span></td>
                  <td className="num td-cap">{row.cap}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
