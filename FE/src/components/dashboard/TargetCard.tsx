import { useTarget } from '@/hooks/useStock'

interface Props { ticker: string }

export function TargetCard({ ticker }: Props) {
  const { data: t } = useTarget(ticker)
  if (!t) return <section className="card target-card"><div className="skeleton" style={{height: 200}}/></section>

  return (
    <section className="card target-card">
      <div className="target-head">
        <span className="target-label">{t.title}</span>
        <span className={`target-rec rec-${t.rec.toLowerCase()}`}>{t.rec}</span>
      </div>
      <div className="target-price-row">
        <span className="target-price">{t.price}</span>
        <span className="target-upside">{t.upside}</span>
      </div>
      <div className="slider-track"><span className="slider-thumb" style={{ left: `${t.sliderPct}%` }}/></div>
      <div className="slider-ends"><span>Bear</span><span>Bull</span></div>
      <div className="target-stats">
        {t.stats.map(st => (
          <div key={st.label} className="target-stat">
            <span className="target-stat-label">{st.label}</span>
            <span className="target-stat-value">{st.value}</span>
          </div>
        ))}
      </div>
      <div className="target-disclaimer">{t.disclaimer}</div>
    </section>
  )
}
