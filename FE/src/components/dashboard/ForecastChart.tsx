import type { ForecastData, KeyLevel } from '@/types'

const W = 1000, L = 85, R = 155

export function ForecastChart({ forecast: f, keyLevels }: { forecast: ForecastData; keyLevels: KeyLevel[] }) {
  const H = 380, padT = 24, padB = 36
  const ih = H - padT - padB

  // Compact mobile-friendly timeline scope:
  // 1M: 5 points total (2 past months, Hari Ini, 2 future months)
  // 3M: 6 points total (2 past months, Hari Ini, 3 future months)
  const is3M = f.activeRange === '3M'
  const totalPoints = is3M ? 6 : 5
  const splitIdx = 2 // Index 2 is 'Hari Ini' / Forecast Start

  const yAt = (v: number) => padT + (ih - 45) * (1 - (v - f.yMin) / Math.max(1, f.yMax - f.yMin))
  const xAt = (i: number) => L + ((W - L - R) * i) / (totalPoints - 1)
  const splitX = xAt(splitIdx)

  const bw = Math.max(14, ((W - L - R) / (totalPoints - 1)) * 0.38)

  // 3 actual historical points (index 0, 1, 2)
  const rawActual = f.actual && f.actual.length > 0 ? f.actual : [10050, 10150, 10250]
  const actualVals = rawActual.length >= 3 ? rawActual.slice(-3) : [rawActual[0], rawActual[0], rawActual[rawActual.length - 1]]
  const startPrice = actualVals[actualVals.length - 1]

  // Forecast points: 3 points for 1M (index 2, 3, 4), 4 points for 3M (index 2, 3, 4, 5)
  const numForecastPoints = is3M ? 4 : 3
  const rawForecast = f.forecast && f.forecast.length > 0 ? f.forecast : [startPrice, 10600, 11121]
  const endTarget = rawForecast[rawForecast.length - 1]
  const delta = endTarget - startPrice

  const forecastVals: number[] = [startPrice]
  for (let i = 1; i < numForecastPoints; i++) {
    const fraction = i / (numForecastPoints - 1)
    const curve = Math.pow(fraction, 0.85)
    forecastVals.push(Math.round(startPrice + delta * curve))
  }

  // 90% CI cone matching forecast scope
  const ciSpread = is3M ? 0.075 : 0.045
  const ciUp = forecastVals.map((v, i) => i === 0 ? v : Math.round(v * (1 + ciSpread * (i / (numForecastPoints - 1)))))
  const ciLo = forecastVals.map((v, i) => i === 0 ? v : Math.round(v * (1 - ciSpread * (i / (numForecastPoints - 1)))))

  const linePathActual = actualVals
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`)
    .join(' ')

  const linePathForecast = forecastVals
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i + splitIdx).toFixed(1)} ${yAt(v).toFixed(1)}`)
    .join(' ')

  const ciArea =
    ciUp.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i + splitIdx).toFixed(1)} ${yAt(v).toFixed(1)}`).join(' ') +
    ' ' +
    ciLo.slice().reverse().map((v, i) => `L ${xAt(ciLo.length - 1 - i + splitIdx).toFixed(1)} ${yAt(v).toFixed(1)}`).join(' ') +
    ' Z'

  const money = (v: number) => 'Rp ' + Math.round(v).toLocaleString('id-ID')
  const klColor: Record<string, string> = { up: 'var(--green)', flat: 'var(--text-dim)', down: 'var(--red)' }

  const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
  const curMonth = new Date().getMonth()

  // Generate 5 (1M) or 6 (3M) abbreviated month names centered on current month (index 2)
  const xLabels = Array.from({ length: totalPoints }, (_, i) => {
    const mIdx = (curMonth + (i - splitIdx) + 120) % 12
    return MONTHS_ID[mIdx]
  })

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" overflow="visible" role="img" aria-label={f.title}>
      <defs>
        <linearGradient id="ciGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--cyan)" stopOpacity="0.16" />
          <stop offset="100%" stopColor="var(--cyan)" stopOpacity="0.03" />
        </linearGradient>
        <filter id="textGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000000" floodOpacity="0.85" />
        </filter>
      </defs>

      {/* Grid lines and Y axis */}
      {f.yTicks.map(t => (
        <g key={t}>
          <line x1={L} y1={yAt(t)} x2={W - R} y2={yAt(t)} className="grid-line" />
          <text x={L - 14} y={yAt(t) + 4} className="axis-y" textAnchor="end" style={{ fill: '#cbd5e1', fontSize: '13px', fontWeight: 600 }}>{money(t)}</text>
        </g>
      ))}

      {/* X axis labels */}
      {xLabels.map((lab, i) => {
        const x = xAt(i)
        const isToday = i === splitIdx
        return (
          <g key={`${lab}-${i}`}>
            <text
              x={x}
              y={H - 10}
              className={`axis-x${isToday ? ' axis-x--today' : ''}`}
              textAnchor="middle"
              style={{
                fill: isToday ? '#4f7dff' : '#cbd5e1',
                fontWeight: isToday ? 800 : 600,
                fontSize: isToday ? '14px' : '13px',
                letterSpacing: '0.01em',
              }}
            >
              {lab}
            </text>
            {isToday && (
              <circle cx={x} cy={H - 2} r={2.5} fill="#4f7dff" />
            )}
          </g>
        )
      })}

      {/* Volume bars (integrated backdrop) */}
      {f.volume && f.volume.length > 0 && (() => {
        const maxVol = Math.max(...f.volume.map(v => v.v), 1)
        const volMaxH = 35
        return (
          <g>
            <text x={L - 14} y={H - padB - 36} className="axis-y" textAnchor="end" style={{ opacity: 0.5, fill: '#cbd5e1' }}>Vol</text>
            {f.volume.slice(0, 10).map((bar, i) => {
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
                  rx={1.5}
                  className={`vol-bar vol-${bar.dir}`}
                  style={{ opacity: 0.15, pointerEvents: 'none' }}
                />
              )
            })}
          </g>
        )
      })()}

      {/* 90% CI shaded cone */}
      <path d={ciArea} fill="url(#ciGrad)" />

      {/* Split line precisely at 'Hari Ini' */}
      <line x1={splitX} y1={padT - 4} x2={splitX} y2={H - padB} className="split-line" stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
      <text x={splitX} y={padT - 10} className="split-label" textAnchor="middle" style={{ fill: '#cbd5e1', fontSize: '12px', fontWeight: 700 }}>
        Forecast Start
      </text>

      {/* Key Level lines */}
      {(keyLevels || []).map((item, idx) => {
        const valStr = item.value || (item as any).level || ''
        const labelStr = item.label || (item as any).type || 'Pivot'
        const toneStr = item.tone || 'flat'
        const priceNum = toneStr === 'flat' || !valStr
          ? (actualVals && actualVals.length > 0 ? actualVals[actualVals.length - 1] : 9500)
          : (parseFloat(valStr.replace(/[^\d]/g, '')) || 9500)
        const y = yAt(priceNum)
        const col = toneStr === 'up' ? '#22c55e' : (toneStr === 'down' ? '#ef4444' : '#ffffff')
        return (
          <g key={labelStr + idx}>
            <line x1={L} y1={y} x2={W - R} y2={y} stroke={col} strokeWidth={1.2} strokeDasharray="3 5" opacity={0.35} />
            <circle cx={W - R} cy={y} r={3.5} fill={col} />
            <text x={W - R + 10} y={y + 4} className={`kl-label kl-${toneStr}`} style={{ fill: col, fontSize: '13px', fontWeight: 700 }}>
              {labelStr} {valStr}
            </text>
          </g>
        )
      })}

      {/* Actual historical price line (blue) */}
      <path d={linePathActual} fill="none" stroke="var(--blue, #3b82f6)" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />

      {/* Forecast price line (cyan dashed) */}
      <path d={linePathForecast} fill="none" stroke="var(--cyan, #06b6d4)" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 5" />

      {/* Dot at Hari Ini (intersection of actual and forecast) */}
      <circle cx={splitX} cy={yAt(actualVals[actualVals.length - 1])} r={5} fill="var(--cyan, #06b6d4)" stroke="#0e131f" strokeWidth={2.5} />

      {/* Dot + label at last forecast point */}
      {(() => {
        const lastIdx = splitIdx + forecastVals.length - 1
        const fx = xAt(lastIdx)
        const fy = yAt(forecastVals[forecastVals.length - 1])
        const forecastText = `Forecast ${money(forecastVals[forecastVals.length - 1])}`
        return (
          <g>
            <circle cx={fx} cy={fy} r={5} fill="#06b6d4" stroke="#0e131f" strokeWidth={2.5} />
            <rect
              x={fx - 146}
              y={fy - 25}
              width={138}
              height={22}
              rx={5}
              fill="rgba(14, 19, 31, 0.88)"
              stroke="rgba(6, 182, 212, 0.5)"
              strokeWidth={1}
            />
            <text
              x={fx - 12}
              y={fy - 10}
              fill="#22d3ee"
              fontSize={13}
              fontWeight={700}
              textAnchor="end"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {forecastText}
            </text>
          </g>
        )
      })()}
    </svg>
  )
}
