import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { StockHeader } from '@/components/dashboard/StockHeader'
import { ForecastCard } from '@/components/dashboard/ForecastCard'
import { TargetCard } from '@/components/dashboard/TargetCard'
import { SentimentCard } from '@/components/dashboard/SentimentCard'
import { SynthesisCard } from '@/components/dashboard/SynthesisCard'
import { NewsFeed } from '@/components/dashboard/NewsFeed'

export function Dashboard() {
  const { ticker = 'BBCA' } = useParams<{ ticker?: string }>()
  const upperTicker = ticker.toUpperCase()
  const [range, setRange] = useState('1M')

  return (
    <div className="content" id="stock-analysis-panel">
      <div style={{ marginBottom: '16px' }}>
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12.5px',
            fontWeight: 600,
            color: 'var(--blue)',
            textDecoration: 'none',
            padding: '6px 12px',
            borderRadius: 'var(--radius)',
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--blue)'
            e.currentTarget.style.background = 'var(--panel-hover)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.background = 'var(--panel)'
          }}
        >
          ← Kembali ke Ranking Model
        </Link>
      </div>
      <StockHeader ticker={upperTicker} />
      <div className="dash-grid">
        <div className="dash-col">
          <ForecastCard ticker={upperTicker} range={range} onRangeChange={setRange} />
        </div>
        <div className="dash-col">
          <TargetCard ticker={upperTicker} range={range} />
          <SentimentCard ticker={upperTicker} />
        </div>
        <div className="dash-bottom">
          <SynthesisCard ticker={upperTicker} />
          <NewsFeed ticker={upperTicker} />
        </div>
      </div>
    </div>
  )
}
