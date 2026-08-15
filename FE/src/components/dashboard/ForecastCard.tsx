import { useState } from 'react'
import { ForecastChart } from './ForecastChart'
import { InfoTip } from '@/components/common/InfoTip'
import { useForecast, useKeyLevels } from '@/hooks/useStock'

interface Props { ticker: string }

export function ForecastCard({ ticker }: Props) {
  const [range, setRange] = useState('3M')
  const { data: forecast } = useForecast(ticker, range)
  const { data: keyLevels = [] } = useKeyLevels(ticker)

  if (!forecast) return <section className="card forecast-card"><div className="skeleton" style={{ height: 420 }} /></section>

  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })

  return (
    <section className="card forecast-card">
      <div className="forecast-head">
        <div className="forecast-title">{forecast.title || 'Proyeksi Harga Generative LLM'}</div>
        <div className="legend">
          <span className="legend-item"><span className="legend-line" />&nbsp;Actual</span>
          <span className="legend-item"><span className="legend-line dashed" />&nbsp;Forecast</span>
          <span className="legend-item"><span className="legend-swatch" />&nbsp;90% CI
            <InfoTip label="90% CI" text="The model expects the price to land inside this band about 9 times out of 10." />
          </span>
        </div>
        <div className="range-toggle">
          {(forecast.ranges || ['1M', '3M', '6M', '1Y']).map(r => (
            <button key={r} className={`range-btn${r === range ? ' active' : ''}`} onClick={() => setRange(r)}>{r}</button>
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
