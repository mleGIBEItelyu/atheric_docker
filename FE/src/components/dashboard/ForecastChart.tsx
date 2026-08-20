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

  const bw = Math.max(14, ((W - L - R) / (totalPoints - 1)) * 0.38)

  // 3 actual historical points (index 0, 1, 2)
  const rawActual = f.actual && f.actual.length > 0 ? f.actual : [6250, 6300, 6400]
  const actualVals = rawActual.length >= 3 ? rawActual.slice(-3) : [rawActual[0], rawActual[0], rawActual[rawActual.length - 1]]
  const startPrice = actualVals[actualVals.length - 1]

  // Forecast points: 3 points for 1M (index 2, 3, 4), 4 points for 3M (index 2, 3, 4, 5)
  const numForecastPoints = is3M ? 4 : 3
  const rawForecast = f.forecast && f.forecast.length > 0 ? f.forecast : [startPrice, Math.round(startPrice * 1.04), Math.round(startPrice * 1.08)]
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

  // Parse Key Levels and filter only relevant ones close to current stock price (< 25% drift)
  const validKeyLevels = (keyLevels || []).map(item => {
    const valStr = item.value || (item as any).level || ''
    const labelStr = item.label || (item as any).type || 'Pivot'
    const toneStr = item.tone || 'flat'
    const rawNum = parseFloat(valStr.replace(/[^\d]/g, ''))
    const priceNum = !isNaN(rawNum) && rawNum > 0 ? rawNum : startPrice
    return { label: labelStr, value: valStr || `Rp ${Math.round(priceNum).toLocaleString('id-ID')}`, tone: toneStr, price: priceNum }
  }).filter(item => Math.abs(item.price - startPrice) / Math.max(1, startPrice) <= 0.25)

  // Compute absolute dynamic Y-range covering ALL active points
  const allPlottedVals = [
    ...actualVals,
    ...forecastVals,
    ...ciUp,
    ...ciLo,
    ...validKeyLevels.map(k => k.price),
  ].filter(v => typeof v === 'number' && !isNaN(v) && v > 0)

  const rawMin = allPlottedVals.length > 0 ? Math.min(...allPlottedVals) : (f.yMin || 5000)
  const rawMax = allPlottedVals.length > 0 ? Math.max(...allPlottedVals) : (f.yMax || 10000)
  const rangeSpan = Math.max(50, rawMax - rawMin)

  const effectiveYMin = Math.max(0, Math.floor((rawMin - rangeSpan * 0.12) / 50) * 50)
  const effectiveYMax = Math.ceil((rawMax + rangeSpan * 0.12) / 50) * 50
  const ySpan = Math.max(1, effectiveYMax - effectiveYMin)

  const stepVal = Math.round(ySpan / 4)
  const dynamicYTicks = [
    effectiveYMin,
    effectiveYMin + stepVal,
    effectiveYMin + stepVal * 2,
    effectiveYMin + stepVal * 3,
    effectiveYMax
  ]

  // Safe clamping Y-coordinate mapping within visible chart box
  const yAt = (v: number) => {
    const clampedV = Math.min(effectiveYMax, Math.max(effectiveYMin, v))
    const ratio = (clampedV - effectiveYMin) / ySpan
    return (padT + 12) + (ih - 50) * (1 - ratio)
  }

  const xAt = (i: number) => L + ((W - L - R) * i) / (totalPoints - 1)
  const splitX = xAt(splitIdx)

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

  const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
  const curMonth = new Date().getMonth()

  // Generate 5 (1M) or 6 (3M) abbreviated month names centered on current month (index 2)
  const xLabels = Array.from({ length: totalPoints }, (_, i) => {
    const mIdx = (curMonth + (i - splitIdx) + 120) % 12
    return MONTHS_ID[mIdx]
  })

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" overflow="hidden" role="img" aria-label={f.title} style={{ width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id="ciGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--cyan, #06b6d4)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--cyan, #06b6d4)" stopOpacity="0.02" />
        </linearGradient>
        <clipPath id="chartClip">
          <rect x={L} y={padT} width={W - L - R} height={H - padT - padB} />
        </clipPath>
      </defs>

      {/* Grid lines and Y axis */}
      {dynamicYTicks.map((t, idx) => (
        <g key={`ytick-${t}-${idx}`}>
          <line x1={L} y1={yAt(t)} x2={W - R} y2={yAt(t)} className="grid-line" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
          <text x={L - 14} y={yAt(t) + 4} className="axis-y" textAnchor="end" style={{ fill: '#cbd5e1', fontSize: '13px', fontWeight: 600 }}>
            {money(t)}
          </text>
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

      {/* 90% CI shaded cone (clipped inside chart area) */}
      <g clipPath="url(#chartClip)">
        <path d={ciArea} fill="url(#ciGrad)" />
      </g>

      {/* Split line precisely at 'Hari Ini' */}
      <line x1={splitX} y1={padT - 4} x2={splitX} y2={H - padB} className="split-line" stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
      <text x={splitX} y={padT - 8} className="split-label" textAnchor="middle" style={{ fill: '#cbd5e1', fontSize: '12px', fontWeight: 700 }}>
        Forecast Start
      </text>

      {/* Key Level lines (bounded within chart area) */}
      {validKeyLevels.map((item, idx) => {
        const y = yAt(item.price)
        const col = item.tone === 'up' ? '#22c55e' : (item.tone === 'down' ? '#ef4444' : '#ffffff')
        return (
          <g key={item.label + idx}>
            <line x1={L} y1={y} x2={W - R} y2={y} stroke={col} strokeWidth={1.2} strokeDasharray="3 5" opacity={0.35} />
            <circle cx={W - R} cy={y} r={3.5} fill={col} />
            <text x={W - R + 10} y={y + 4} className={`kl-label kl-${item.tone}`} style={{ fill: col, fontSize: '13px', fontWeight: 700 }}>
              {item.label} {item.value}
            </text>
          </g>
        )
      })}

      {/* Actual historical price line (blue) */}
      <g clipPath="url(#chartClip)">
        <path d={linePathActual} fill="none" stroke="var(--blue, #3b82f6)" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
        {/* Forecast price line (cyan dashed) */}
        <path d={linePathForecast} fill="none" stroke="var(--cyan, #06b6d4)" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 5" />
      </g>

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
