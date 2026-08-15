import type { ForecastData, KeyLevel } from '@/types'

const W = 1000, L = 85, R = 150

function chartX(f: ForecastData, i: number) {
  return L + ((W - L - R) * i) / (f.actual.length + f.forecast.length - 1)
}

interface Props { forecast: ForecastData; keyLevels: KeyLevel[] }

export function ForecastChart({ forecast: f, keyLevels }: Props) {
  const H = 380, padT = 18, padB = 30
  const ih = H - padT - padB
  const off = f.actual.length - 1
  const yAt = (v: number) => padT + (ih - 60) * (1 - (v - f.yMin) / (f.yMax - f.yMin))
  const xAt = (i: number) => chartX(f, i)
  const splitX = xAt(off)

  const bw = Math.max(6, ((W - L - R) / (f.actual.length + f.forecast.length - 1)) * 0.5)

  const linePath = (vals: number[], offset: number) =>
    vals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i + offset).toFixed(1)} ${yAt(v).toFixed(1)}`).join(' ')

  const ciArea =
    f.ciUpper.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i + off).toFixed(1)} ${yAt(v).toFixed(1)}`).join(' ') +
    ' ' +
    f.ciLower.slice().reverse().map((v, i) => `L ${xAt(f.ciLower.length - 1 - i + off).toFixed(1)} ${yAt(v).toFixed(1)}`).join(' ') +
    ' Z'

  const money = (v: number) => 'Rp ' + v.toLocaleString('id-ID')
  const klColor: Record<string, string> = { up: 'var(--green)', flat: 'var(--text-dim)', down: 'var(--red)' }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" overflow="visible" role="img" aria-label={f.title}>
      <defs>
        <linearGradient id="ciGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--cyan)" stopOpacity="0.12" />
          <stop offset="100%" stopColor="var(--cyan)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines and Y axis */}
      {f.yTicks.map(t => (
        <g key={t}>
          <line x1={L} y1={yAt(t)} x2={W - R} y2={yAt(t)} className="grid-line" />
          <text x={L - 12} y={yAt(t) + 4} className="axis-y">{money(t)}</text>
        </g>
      ))}

      {/* X axis labels */}
      {f.xLabels.map((lab, i) => {
        const x = L + ((W - L - R) * i) / (f.xLabels.length - 1)
        return (
          <text key={lab} x={x} y={H - 9} className={`axis-x${lab === 'Today' ? ' axis-x--today' : ''}`} textAnchor="middle">{lab}</text>
        )
      })}

      {/* Volume bars (integrated backdrop) */}
      {f.volume && (() => {
        const maxVol = Math.max(...f.volume.map(v => v.v), 1)
        const volMaxH = 35 // Max height for volume bars inside the main chart
        return (
          <g>
            <text x={L - 12} y={H - padB - 36} className="axis-y" style={{ opacity: 0.4 }}>Vol</text>
            {f.volume.map((bar, i) => {
              const h = (bar.v / maxVol) * volMaxH
              const x = xAt(i) - bw / 2
              const y = (H - padB) - h
              return (
                <rect
                  key={i}
                  x={x}
                  y={y}
                  width={bw}
                  height={h}
                  rx={1}
                  className={`vol-bar vol-${bar.dir}`}
                  style={{ opacity: 0.08, pointerEvents: 'none' }}
                />
              )
            })}
          </g>
        )
      })()}

      {/* CI cone */}
      <path d={ciArea} fill="url(#ciGrad)" />

      {/* Split line */}
      <line x1={splitX} y1={padT} x2={splitX} y2={H - padB} className="split-line" />
      <text x={splitX} y={padT - 5} className="split-label" textAnchor="middle">Forecast Start</text>

      {/* Key Level lines */}
      {(keyLevels || []).map((item, idx) => {
        const valStr = item.value || (item as any).level || ''
        const labelStr = item.label || (item as any).type || 'Pivot'
        const toneStr = item.tone || 'flat'
        const priceNum = toneStr === 'flat' || !valStr
          ? (f.actual && f.actual.length > 0 ? f.actual[f.actual.length - 1] : 9500)
          : (parseFloat(valStr.replace(/[^\d]/g, '')) || 9500)
        const y = yAt(priceNum)
        const col = klColor[toneStr] || 'var(--text-dim)'
        return (
          <g key={labelStr + idx}>
            <line x1={L} y1={y} x2={W - R} y2={y} stroke={col} strokeWidth={1} strokeDasharray="3 5" opacity={0.25} />
            <circle cx={W - R} cy={y} r={3} fill={col} />
            <text x={W - R + 10} y={y + 4} className={`kl-label kl-${toneStr}`}>{labelStr} {valStr}</text>
          </g>
        )
      })}

      {/* Actual price line */}
      <path d={linePath(f.actual, 0)} fill="none" stroke="var(--blue)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />

      {/* Forecast line */}
      <path d={linePath(f.forecast, off)} fill="none" stroke="var(--cyan)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 4" />

      {/* Dot at last actual (forecast start) */}
      <circle cx={xAt(off)} cy={yAt(f.actual[off])} r={4} fill="var(--cyan)" />

      {/* Dot + label at last forecast point */}
      {(() => {
        const lastIdx = off + f.forecast.length - 1
        const fx = xAt(lastIdx)
        const fy = yAt(f.forecast[f.forecast.length - 1])
        return (
          <g>
            <circle cx={fx} cy={fy} r={4} fill="var(--cyan)" stroke="rgba(10,14,23,0.8)" strokeWidth={1.5} />
            <text x={fx - 10} y={fy - 10} fill="var(--cyan)" fontSize={12} fontWeight={600} textAnchor="end" style={{ fontVariantNumeric: 'tabular-nums' }}>
              Forecast {money(f.forecast[f.forecast.length - 1])}
            </text>
          </g>
        )
      })()}
    </svg>
  )
}
