import { Link } from 'react-router-dom'
import { ArrowRightIcon, UpIcon, DownIcon } from '@/components/common/icons'
import { useRankingHighlights } from '@/hooks/useMarkets'

export function HighlightGrid() {
  const { data: highlights = [] } = useRankingHighlights()
  return (
    <div className="highlight-grid">
      {highlights.map(h => (
        <Link key={h.ticker} to={`/stock/${h.ticker}`} className="card highlight-card" style={{ display: 'block', cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}>
          <div className="hl-top">
            <div className="hl-left">
              <div className="hl-ticker-row">
                <span className="hl-ticker">{h.ticker}</span>
                <span className="hl-rank">RANK {h.rank}</span>
              </div>
              <span className="hl-name">{h.name}</span>
            </div>
            <div className="hl-score"><div className="hl-rank-num">{h.rank}</div></div>
          </div>
          <div className="hl-bottom">
            <div>
              <span className="hl-ret-label">EXP. RETURN (30D)</span>
              <span className={`hl-ret ${h.dir}`}>{h.dir === 'up' ? <UpIcon/> : <DownIcon/>}{h.ret}</span>
            </div>
            <span className="hl-arrow"><ArrowRightIcon/></span>
          </div>
        </Link>
      ))}
    </div>
  )
}
