import type { ForecastData } from '@/types'

const W = 1000, L = 56, R = 150

function chartX(f: ForecastData, i: number) {
  return L + ((W - L - R) * i) / (f.actual.length + f.forecast.length - 1)
}

export function VolumeChart({ forecast: f }: { forecast: ForecastData }) {
  const H = 96, padT = 16, padB = 14
  const max = Math.max(...f.volume.map(v => v.v))
  const bw = Math.max(6, ((W - L - R) / (f.actual.length + f.forecast.length - 1)) * 0.5)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Trading volume">
      <text x={L - 12} y={padT + 2} className="axis-y">Vol</text>
      {f.volume.map((bar, i) => {
        const h = (bar.v / max) * (H - padT - padB)
        const x = chartX(f, i) - bw / 2
        const y = H - padB - h
        return <rect key={i} x={x} y={y} width={bw} height={h} rx={1.5} className={`vol-bar vol-${bar.dir}`}/>
      })}
    </svg>
  )
}
