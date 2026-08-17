import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SearchIcon } from '@/components/common/icons'
import { useIndices, useRankingRows } from '@/hooks/useMarkets'

interface Props { 
  onSearch?: (q: string) => void;
  onMenuClick: () => void;
}

export function Topbar({ onSearch, onMenuClick }: Props) {
  const navigate = useNavigate()
  const { data: indices = [] } = useIndices()
  const { data: rankingRows = [] } = useRankingRows()

  const [query, setQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  const searchRef = useRef<HTMLDivElement>(null)

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const rawVal = e.target.value
    setQuery(rawVal)
    const sanitizedVal = rawVal.replace(/[<>'"&]/g, '').trim().slice(0, 50)
    onSearch?.(sanitizedVal)
    setShowDropdown(true)
  }

  const searchResults = query.trim() ? rankingRows.filter(r => {
    const cleanQuery = query.replace(/[<>'"&]/g, '').trim().toLowerCase()
    return r.ticker.toLowerCase().includes(cleanQuery) ||
      r.company.toLowerCase().includes(cleanQuery)
  }) : []

  useEffect(() => {
    function clickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', clickOutside)
    return () => document.removeEventListener('mousedown', clickOutside)
  }, [])

  function selectStock(ticker: string) {
    navigate(`/stock/${ticker}`)
    setQuery('')
    setShowDropdown(false)
  }

  return (
    <header className="topbar">
      {/* Hamburger button */}
      <button
        onClick={onMenuClick}
        className="menu-btn"
        aria-label="Open menu"
      >
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Search */}
      <div className="search" style={{ position: 'relative' }} ref={searchRef}>
        <SearchIcon />
        <input
          placeholder="Cari saham (BBCA, GOTO)..."
          value={query}
          onChange={handleSearch}
          onFocus={() => setShowDropdown(true)}
        />
        {showDropdown && searchResults.length > 0 && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
            background: 'var(--panel)', border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius)', boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
            zIndex: 200, maxHeight: '220px', overflowY: 'auto',
          }}>
            {searchResults.map(res => (
              <div
                key={res.ticker}
                style={{
                  padding: '10px 14px', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  borderBottom: '1px solid var(--border)',
                  transition: 'background .12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--panel-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
                onClick={() => selectStock(res.ticker)}
              >
                <div>
                  <span style={{ fontWeight: 800, color: 'var(--text)' }}>{res.ticker}</span>
                  <span style={{ marginLeft: '8px', fontSize: '11.5px', color: 'var(--text-dim)' }}>{res.company}</span>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: res.dir === 'up' ? 'var(--green)' : 'var(--red)' }}>
                  {res.ret}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Indices */}
      <div className="indices">
        {indices.map(idx => (
          <span key={idx.label} className={`index ${idx.dir}`}>
            <span className="index-label">{idx.label}</span>
            <span className="index-value live-tick">{idx.value}</span>
          </span>
        ))}
      </div>
    </header>
  )
}
