import { useState } from 'react'
import { ForecastChart } from './ForecastChart'
import { InfoTip } from '@/components/common/InfoTip'
import { useForecast, useKeyLevels } from '@/hooks/useStock'

interface Props {
  ticker: string
  range?: string
  onRangeChange?: (range: string) => void
}

export function ForecastCard({ ticker, range: controlledRange, onRangeChange }: Props) {
  const [internalRange, setInternalRange] = useState('1M')
  const range = controlledRange ?? internalRange
  const handleRangeChange = (newRange: string) => {
    if (onRangeChange) {
      onRangeChange(newRange)
    } else {
      setInternalRange(newRange)
    }
  }

  const { data: forecast } = useForecast(ticker, range)
  const { data: keyLevels = [] } = useKeyLevels(ticker)

  if (!forecast) return <section className="card forecast-card"><div className="skeleton" style={{ height: 420 }} /></section>

  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  const cleanTitle = 'Proyeksi Harga AI'

  return (
    <section className="card forecast-card">
      <div className="forecast-head">
        <div className="forecast-title">{cleanTitle}</div>
        <div className="legend">
          <span className="legend-item"><span className="legend-line" />&nbsp;Actual</span>
          <span className="legend-item"><span className="legend-line dashed" />&nbsp;Forecast</span>
          <span className="legend-item"><span className="legend-swatch" />&nbsp;90% CI
            <InfoTip label="90% CI" text="Model mengekspektasikan harga berada di dalam rentang ini dengan tingkat keyakinan 90%." />
          </span>
        </div>
        <div className="range-toggle" style={{ display: 'flex', gap: '4px' }}>
          {[
            { key: '1M', label: '1M' },
            { key: '3M', label: '3M' },
          ].map(r => (
            <button
              key={r.key}
              className={`range-btn${r.key === range ? ' active' : ''}`}
              onClick={() => handleRangeChange(r.key)}
              title={`Proyeksi ${r.key === '1M' ? '1 Bulan' : '3 Bulan'} ke depan`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-meta">
        {forecast.caption && <span className="chart-caption">{forecast.caption}</span>}
        <span className="panel-updated" style={{ marginLeft: 'auto' }}>Updated {now}</span>
      </div>
      <div className="chart-wrap"><ForecastChart forecast={forecast} keyLevels={keyLevels} /></div>
    </section>
  )
}
