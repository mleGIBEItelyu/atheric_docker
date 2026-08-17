import { useState, useEffect } from 'react'
import { InfoTip } from '@/components/common/InfoTip'
import { useStock } from '@/hooks/useStock'
import { GLOSSARY } from '@/data/constants'
import { PlusIcon } from '@/components/common/icons'
import { useToast } from '@/components/common/Toast'
import { ShareModal } from '@/components/common/ShareModal'

interface Props { ticker: string }

export function StockHeader({ ticker }: Props) {
  const { data: stock } = useStock(ticker)
  const [isWatchlisted, setIsWatchlisted] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const toast = useToast()

  // Sync watchlist status with localStorage
  useEffect(() => {
    try {
      const list = JSON.parse(localStorage.getItem('watchlist') || '[]')
      const cleanList = Array.isArray(list) ? list.filter((t): t is string => typeof t === 'string' && t.trim() !== '') : []
      setIsWatchlisted(cleanList.includes(ticker))
    } catch {
      setIsWatchlisted(false)
    }
  }, [ticker])

  function toggleWatchlist() {
    const list = JSON.parse(localStorage.getItem('watchlist') || '[]') as string[]
    let newList: string[]
    if (list.includes(ticker)) {
      newList = list.filter(t => t !== ticker)
      setIsWatchlisted(false)
      toast.warning(`${ticker} dihapus dari watchlist`, 'Saham ini tidak lagi dipantau.')
    } else {
      newList = [...list, ticker]
      setIsWatchlisted(true)
      toast.success(`${ticker} ditambahkan ke watchlist`, 'Pantau pergerakan saham ini di halaman Watchlist.')
    }
    localStorage.setItem('watchlist', JSON.stringify(newList))
    window.dispatchEvent(new Event('storage'))
  }

  if (!stock) return <div className="stock-head"><div className="skeleton" style={{height: 60, width: '100%'}}/></div>

  return (
    <div className="stock-head">
      <div className="stock-id">
        <div className="stock-row">
          <span className="stock-ticker">{stock.ticker}</span>
          <span className="stock-name">{stock.name}</span>
        </div>
      </div>
      <div className="stock-actions">
        <button 
          className={`stock-btn ${isWatchlisted ? 'primary' : ''}`} 
          onClick={toggleWatchlist}
          aria-label={isWatchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}
        >
          <PlusIcon />
          <span>{isWatchlisted ? 'Watchlisted' : 'Watchlist'}</span>
        </button>
        <button className="stock-btn" onClick={() => setShowShare(true)}>
          <span>Share</span>
        </button>
      </div>
      <div className="stock-stats">
        {(stock.ohlc || []).map(st => (
          <div key={st.label} className="stat">
            <div className="stat-label">{st.label}</div>
            <div className="stat-value">{st.value}</div>
          </div>
        ))}
        <div className="stat-divider"/>
        {(stock.ratios || []).map(st => (
          <div key={st.label} className="stat">
            <div className="stat-label">
              {st.label}
              <InfoTip label={st.label} text={GLOSSARY[st.label] ?? ''}/>
            </div>
            <div className="stat-value">{st.value}</div>
          </div>
        ))}
      </div>
      <div className="stock-price-block">
        <span className="stock-price">{stock.price}</span>
        <span className={`stock-change ${stock.dir}`}>{stock.dir === 'up' ? '▲' : '▼'} {stock.change}</span>
      </div>

      {showShare && (
        <ShareModal
          ticker={stock.ticker}
          stockName={stock.name}
          price={stock.price}
          change={stock.change}
          dir={stock.dir}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  )
}
