interface Props { value: number; color?: string }

export function Gauge({ value, color = '#3b6ef6' }: Props) {
  const r = 54, c = 2 * Math.PI * r
  const dash = (value / 100) * c
  return (
    <div className="gauge">
      <svg viewBox="0 0 130 130">
        <circle cx="65" cy="65" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="9"/>
        <circle cx="65" cy="65" r={r} fill="none" stroke={color} strokeWidth="9"
          strokeLinecap="round" strokeDasharray={`${dash.toFixed(1)} ${c.toFixed(1)}`}
          transform="rotate(-90 65 65)"/>
      </svg>
      <div className="gauge-value">{value}</div>
    </div>
  )
}
