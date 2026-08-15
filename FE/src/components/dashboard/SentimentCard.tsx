import { Gauge } from '@/components/common/Gauge'
import { useSentiment } from '@/hooks/useStock'

const TONE_COLOR: Record<string, string> = {
  green: '#34d399',
  cyan: '#28d2e6',
  amber: '#d9a13a',
  red: '#f0564b'
}

interface Props { ticker: string }

export function SentimentCard({ ticker }: Props) {
  const { data: items = [] } = useSentiment(ticker)
  return (
    <section className="card metric-card sentiment-card">
      <div className="metric-title">Sentiment</div>
      <div className="gauge-pair">
        {items.map(item => (
          <div key={item.label} className="gauge-cell">
            <Gauge value={item.value} color={TONE_COLOR[item.tone] || '#28d2e6'}/>
            <div className="gauge-cell-label">{item.label}</div>
            <div className="sent-scale">{item.value}/100 · <span className="sent-verdict">{item.verdict}</span></div>
            <div className="sent-source">{item.source}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
