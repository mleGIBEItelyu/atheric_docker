import { useState, useMemo } from 'react'

interface MonthEval {
  month: string         // "Jan 2025"
  period: string        // e.g. "Des 2024 → Jan 2025"
  model: string
  total: number         // total prediksi
  correct: number       // benar dalam arah
  inRange: number       // masuk confidence interval
  avgError: string      // MAPE rata-rata
  bestTicker: string
  worstTicker: string
  details: {
    ticker: string
    predicted: string
    actual: string
    dir: 'up' | 'down'
    correct: boolean
    inRange: boolean
    error: string       // % error
  }[]
  strengths: string[]
  weaknesses: string[]
  note: string
}

const EVAL_DATA: MonthEval[] = [
  {
    month: 'Jul 2025',
    period: 'Jun 2025 → Jul 2025',
    model: 'Generative Financial LLM',
    total: 30, correct: 22, inRange: 18, avgError: '4,2%',
    bestTicker: 'BBCA', worstTicker: 'GOTO',
    strengths: [
      'Akurasi arah (bullish/bearish) mencapai 73,3% - di atas rata-rata historis 68%',
      'Prediksi sektor perbankan sangat tepat: BBCA, BBRI, BMRI semua benar',
      'Confidence interval 90% valid untuk 60% saham yang diprediksi',
    ],
    weaknesses: [
      'Sektor teknologi sangat meleset - GOTO dan BUKA error di atas 15%',
      'Tidak menangkap shock sentimen eksternal (kebijakan suku bunga darurat BI)',
      'Overestimate volatilitas saham mid-cap selama 2 minggu pertama bulan',
    ],
    note: 'Bulan terkuat sejak Q1 2025. Fundamental-driven stocks berperforma sangat baik.',
    details: [
      { ticker: 'BBCA', predicted: 'Rp 10.500', actual: 'Rp 10.450', dir: 'up', correct: true, inRange: true, error: '0,5%' },
      { ticker: 'BBRI', predicted: 'Rp 5.200', actual: 'Rp 5.100', dir: 'up', correct: true, inRange: true, error: '1,9%' },
      { ticker: 'TLKM', predicted: 'Rp 3.800', actual: 'Rp 3.720', dir: 'up', correct: true, inRange: true, error: '2,1%' },
      { ticker: 'ASII', predicted: 'Rp 6.100', actual: 'Rp 5.900', dir: 'up', correct: true, inRange: true, error: '3,4%' },
      { ticker: 'GOTO', predicted: 'Rp 80', actual: 'Rp 64', dir: 'down', correct: true, inRange: false, error: '20,0%' },
      { ticker: 'UNVR', predicted: 'Rp 2.600', actual: 'Rp 2.450', dir: 'down', correct: false, inRange: false, error: '5,8%' },
      { ticker: 'BMRI', predicted: 'Rp 6.800', actual: 'Rp 6.750', dir: 'up', correct: true, inRange: true, error: '0,7%' },
      { ticker: 'ICBP', predicted: 'Rp 11.200', actual: 'Rp 10.900', dir: 'up', correct: true, inRange: false, error: '2,8%' },
    ],
  },
  {
    month: 'Jun 2025',
    period: 'Mei 2025 → Jun 2025',
    model: 'Generative Financial LLM',
    total: 30, correct: 18, inRange: 14, avgError: '6,8%',
    bestTicker: 'TLKM', worstTicker: 'UNVR',
    strengths: [
      'Sektor telekomunikasi diprediksi dengan presisi tinggi (error < 2%)',
      'Deteksi tren bearish IHSG pada minggu ke-3 akurat lebih awal 4 hari',
      'Recall pada saham BUY recommendation 80% - tidak banyak yang terlewat',
    ],
    weaknesses: [
      'Consumer goods sector meleset signifikan akibat data inflasi yang mengejutkan',
      'Model terlalu optimis pada recovery mid-cap pasca koreksi Mei',
      'Akurasi range CI turun ke 46,7% - lebih rendah dari bulan sebelumnya',
      'Tidak memperhitungkan efek spillover dari market AS yang volatile',
    ],
    note: 'Koreksi tajam mid-month menurunkan akurasi secara keseluruhan.',
    details: [
      { ticker: 'BBCA', predicted: 'Rp 10.200', actual: 'Rp 10.050', dir: 'up', correct: true, inRange: true, error: '1,5%' },
      { ticker: 'BBRI', predicted: 'Rp 5.400', actual: 'Rp 4.950', dir: 'up', correct: false, inRange: false, error: '8,3%' },
      { ticker: 'TLKM', predicted: 'Rp 3.700', actual: 'Rp 3.680', dir: 'down', correct: true, inRange: true, error: '0,5%' },
      { ticker: 'ASII', predicted: 'Rp 6.400', actual: 'Rp 5.750', dir: 'up', correct: false, inRange: false, error: '10,2%' },
      { ticker: 'GOTO', predicted: 'Rp 72', actual: 'Rp 68', dir: 'down', correct: true, inRange: true, error: '5,6%' },
      { ticker: 'UNVR', predicted: 'Rp 2.800', actual: 'Rp 2.200', dir: 'up', correct: false, inRange: false, error: '21,4%' },
      { ticker: 'BMRI', predicted: 'Rp 6.500', actual: 'Rp 6.200', dir: 'up', correct: true, inRange: false, error: '4,6%' },
      { ticker: 'ICBP', predicted: 'Rp 10.900', actual: 'Rp 10.600', dir: 'down', correct: true, inRange: true, error: '2,7%' },
    ],
  },
  {
    month: 'Mei 2025',
    period: 'Apr 2025 → Mei 2025',
    model: 'Statistical (ARIMA + GARCH)',
    total: 30, correct: 20, inRange: 19, avgError: '5,1%',
    bestTicker: 'BMRI', worstTicker: 'ASII',
    strengths: [
      'GARCH sangat akurat dalam memprediksi volatilitas harian BMRI dan BBCA',
      'Confidence interval coverage rate tertinggi (63,3%) dalam 6 bulan terakhir',
      'Stabil pada kondisi normal tanpa kejutan eksternal - baseline sangat kuat',
    ],
    weaknesses: [
      'ARIMA gagal menangkap structural break akibat rilis laporan keuangan ASII',
      'Tidak memiliki mekanisme pembaruan real-time terhadap data sentimen baru',
      'Prediksi GOTO konsisten underestimate karena volatilitas non-Gaussian',
    ],
    note: 'Model ARIMA+GARCH mengungguli LLM pada bulan dengan volatilitas rendah.',
    details: [
      { ticker: 'BBCA', predicted: 'Rp 10.100', actual: 'Rp 10.150', dir: 'up', correct: true, inRange: true, error: '0,5%' },
      { ticker: 'BBRI', predicted: 'Rp 5.100', actual: 'Rp 5.050', dir: 'up', correct: true, inRange: true, error: '1,0%' },
      { ticker: 'TLKM', predicted: 'Rp 3.650', actual: 'Rp 3.700', dir: 'up', correct: true, inRange: true, error: '1,4%' },
      { ticker: 'ASII', predicted: 'Rp 6.200', actual: 'Rp 5.400', dir: 'up', correct: false, inRange: false, error: '12,9%' },
      { ticker: 'GOTO', predicted: 'Rp 65', actual: 'Rp 58', dir: 'down', correct: true, inRange: false, error: '10,8%' },
      { ticker: 'UNVR', predicted: 'Rp 2.500', actual: 'Rp 2.480', dir: 'down', correct: true, inRange: true, error: '0,8%' },
      { ticker: 'BMRI', predicted: 'Rp 6.200', actual: 'Rp 6.180', dir: 'up', correct: true, inRange: true, error: '0,3%' },
      { ticker: 'ICBP', predicted: 'Rp 10.700', actual: 'Rp 10.500', dir: 'up', correct: true, inRange: true, error: '1,9%' },
    ],
  },
  {
    month: 'Apr 2025',
    period: 'Mar 2025 → Apr 2025',
    model: 'Deep Learning (LSTM)',
    total: 30, correct: 16, inRange: 12, avgError: '8,3%',
    bestTicker: 'BBCA', worstTicker: 'GOTO',
    strengths: [
      'Mendeteksi pola non-linear harga BBCA dengan baik memanfaatkan data 5 tahun',
      'Secara konsisten lebih baik dari baseline pada saham dengan high-autocorrelation',
    ],
    weaknesses: [
      'Akurasi arah hanya 53,3% - hampir setara coin flip pada bulan ini',
      'LSTM overfitting terhadap pola Q4 2024 yang tidak relevan di Q2 2025',
      'Training lag menyebabkan respons terlambat terhadap koreksi pasar April',
      'Interpretabilitas rendah - tidak dapat dijelaskan kenapa prediksi tertentu meleset',
      'Komputasi mahal, update model tertunda 18 jam dari target SLA',
    ],
    note: 'Bulan terlemah LSTM - kondisi pasar abnormal di luar distribusi training.',
    details: [
      { ticker: 'BBCA', predicted: 'Rp 9.900', actual: 'Rp 10.050', dir: 'up', correct: true, inRange: true, error: '1,5%' },
      { ticker: 'BBRI', predicted: 'Rp 5.300', actual: 'Rp 4.800', dir: 'up', correct: false, inRange: false, error: '9,4%' },
      { ticker: 'TLKM', predicted: 'Rp 3.900', actual: 'Rp 3.550', dir: 'up', correct: false, inRange: false, error: '8,9%' },
      { ticker: 'ASII', predicted: 'Rp 6.500', actual: 'Rp 5.600', dir: 'up', correct: false, inRange: false, error: '13,8%' },
      { ticker: 'GOTO', predicted: 'Rp 90', actual: 'Rp 62', dir: 'up', correct: false, inRange: false, error: '31,1%' },
      { ticker: 'UNVR', predicted: 'Rp 2.700', actual: 'Rp 2.500', dir: 'down', correct: true, inRange: false, error: '7,4%' },
      { ticker: 'BMRI', predicted: 'Rp 6.300', actual: 'Rp 6.100', dir: 'up', correct: true, inRange: true, error: '3,2%' },
      { ticker: 'ICBP', predicted: 'Rp 10.500', actual: 'Rp 10.300', dir: 'up', correct: true, inRange: false, error: '1,9%' },
    ],
  },
]

function AccuracyGauge({ pct, size = 96 }: { pct: number; size?: number }) {
  const r = 38
  const circ = 2 * Math.PI * r
  const fill = circ * (pct / 100)
  const color = pct >= 70 ? 'var(--green)' : pct >= 55 ? 'var(--amber)' : 'var(--red)'
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--border-strong)" strokeWidth="9"/>
      <circle
        cx="50" cy="50" r={r} fill="none"
        stroke={color} strokeWidth="9"
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text
        x="50" y="55"
        textAnchor="middle" dominantBaseline="middle"
        fill="var(--text)" fontSize="18" fontWeight="800"
        style={{ transform: 'rotate(90deg) translateX(-0px)', transformOrigin: '50% 50%' }}
      >
      </text>
    </svg>
  )
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ flex: 1, height: '6px', borderRadius: '999px', background: 'var(--border-strong)', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '999px', transition: 'width .5s ease' }} />
    </div>
  )
}

export function Evaluasi() {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [detailOpen, setDetailOpen] = useState(false)
  const data = EVAL_DATA[selectedIdx]

  const dirPct = Math.round((data.correct / data.total) * 100)
  const rangePct = Math.round((data.inRange / data.total) * 100)
  const wrongDir = data.total - data.correct
  const outRange = data.total - data.inRange

  // Compare with previous month
  const prev = EVAL_DATA[selectedIdx + 1]
  const prevDirPct = prev ? Math.round((prev.correct / prev.total) * 100) : null
  const delta = prevDirPct !== null ? dirPct - prevDirPct : null

  // Trend data for sparkline
  const trendData = useMemo(() =>
    EVAL_DATA.slice().reverse().map(d => Math.round((d.correct / d.total) * 100)),
    []
  )

  const gaugeColor = dirPct >= 70 ? 'var(--green)' : dirPct >= 55 ? 'var(--amber)' : 'var(--red)'
  const rangeColor = rangePct >= 65 ? 'var(--green)' : rangePct >= 50 ? 'var(--amber)' : 'var(--red)'

  return (
    <div className="content">
      {/* Header */}
      <div className="page-head">
        <div className="page-title">EVALUASI MODEL</div>
        <div className="page-sub">
          Perbandingan akurasi prediksi per bulan - arah harga, coverage confidence interval, dan analisis kelebihan/kekurangan masing-masing model AI.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Month Selector */}
        <div className="card" style={{ padding: '6px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {EVAL_DATA.map((d, i) => (
            <button
              key={d.month}
              onClick={() => setSelectedIdx(i)}
              style={{
                padding: '8px 18px', borderRadius: 'var(--radius-sm)',
                fontWeight: 700, fontSize: '12.5px', cursor: 'pointer', transition: 'all .15s',
                background: selectedIdx === i ? 'var(--blue)' : 'none',
                color: selectedIdx === i ? '#fff' : 'var(--text-dim)',
                border: 'none',
              }}
            >
              {d.month}
            </button>
          ))}
        </div>

        {/* ── Overview Row ── */}
        <div className="eval-overview">

          {/* Accuracy card */}
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
            <div style={{ position: 'relative', width: '96px', height: '96px', flexShrink: 0 }}>
              <AccuracyGauge pct={dirPct} />
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: '22px', fontWeight: 900, color: gaugeColor, lineHeight: 1 }}>{dirPct}%</span>
                <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-mute)', textTransform: 'uppercase', marginTop: '2px' }}>Akurasi</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Akurasi Arah</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text)', lineHeight: 1 }}>{data.correct}/{data.total}</div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-dim)', marginTop: '4px' }}>
                {wrongDir} prediksi meleset
              </div>
              {delta !== null && (
                <div style={{
                  marginTop: '8px', fontSize: '11px', fontWeight: 700,
                  color: delta >= 0 ? 'var(--green)' : 'var(--red)',
                  display: 'flex', alignItems: 'center', gap: '4px',
                }}>
                  {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}% vs {prev.month}
                </div>
              )}
            </div>
          </div>

          {/* CI Coverage */}
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
            <div style={{ position: 'relative', width: '96px', height: '96px', flexShrink: 0 }}>
              <AccuracyGauge pct={rangePct} />
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: '22px', fontWeight: 900, color: rangeColor, lineHeight: 1 }}>{rangePct}%</span>
                <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-mute)', textTransform: 'uppercase', marginTop: '2px' }}>CI Cover</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Coverage 90% CI</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text)', lineHeight: 1 }}>{data.inRange}/{data.total}</div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-dim)', marginTop: '4px' }}>
                {outRange} di luar rentang CI
              </div>
              <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-mute)' }}>Target ideal ≥ 65%</div>
            </div>
          </div>

          {/* MAPE + best/worst */}
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rata-rata Error (MAPE)</div>
            <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--blue-bright)', lineHeight: 1 }}>{data.avgError}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-dim)' }}>Terbaik</span>
                <span style={{ fontWeight: 800, color: 'var(--green)' }}>{data.bestTicker}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-dim)' }}>Terburuk</span>
                <span style={{ fontWeight: 800, color: 'var(--red)' }}>{data.worstTicker}</span>
              </div>
            </div>
          </div>

          {/* Trend mini card */}
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tren Akurasi (4 Bulan)</div>
            <svg viewBox={`0 0 ${(trendData.length - 1) * 40} 60`} style={{ width: '100%', height: '60px' }}>
              <polyline
                points={trendData.map((v, i) => `${i * 40},${60 - (v / 100) * 56}`).join(' ')}
                fill="none" stroke="var(--blue)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              />
              {trendData.map((v, i) => (
                <circle key={i} cx={i * 40} cy={60 - (v / 100) * 56} r="3.5" fill="var(--blue)" />
              ))}
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {trendData.map((v, i) => (
                <span key={i} style={{ fontSize: '10px', color: i === trendData.length - 1 ? 'var(--blue-bright)' : 'var(--text-mute)', fontWeight: 700 }}>{v}%</span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Model Info + Period ── */}
        <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              padding: '4px 10px', borderRadius: '6px', fontSize: '10.5px', fontWeight: 700,
              background: 'var(--blue-soft)', border: '1px solid rgba(79,125,255,0.25)', color: 'var(--blue-bright)',
            }}>
              {data.model}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Periode: <strong style={{ color: 'var(--text)' }}>{data.period}</strong></span>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontStyle: 'italic', maxWidth: '400px', textAlign: 'right' }}>"{data.note}"</span>
        </div>

        {/* ── Strengths & Weaknesses ── */}
        <div className="eval-sw-grid">
          {/* Kelebihan */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>Kelebihan Bulan Ini</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data.strengths.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{
                    width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(46,194,122,0.12)', border: '1px solid rgba(46,194,122,0.3)',
                    display: 'grid', placeItems: 'center', fontSize: '10px', color: 'var(--green)', fontWeight: 800,
                  }}>
                    <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span style={{ fontSize: '12.5px', color: 'var(--text-dim)', lineHeight: 1.5 }}>{s}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Kekurangan */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--red)', flexShrink: 0 }} />
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>Kekurangan & Catatan</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data.weaknesses.map((w, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{
                    width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(240,86,75,0.12)', border: '1px solid rgba(240,86,75,0.3)',
                    display: 'grid', placeItems: 'center', fontSize: '10px', color: 'var(--red)', fontWeight: 800,
                  }}>
                    <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </span>
                  <span style={{ fontSize: '12.5px', color: 'var(--text-dim)', lineHeight: 1.5 }}>{w}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Per-Ticker Breakdown ── */}
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px', borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>Detail Per Emiten - {data.month}</span>
            <button
              onClick={() => setDetailOpen(o => !o)}
              style={{
                fontSize: '12px', fontWeight: 600, color: 'var(--blue-bright)', cursor: 'pointer',
                padding: '5px 12px', borderRadius: '6px', background: 'var(--blue-soft)', border: 'none',
              }}
            >
              {detailOpen ? 'Sembunyikan' : 'Tampilkan Semua'}
            </button>
          </div>

          {/* Summary bar rows */}
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(detailOpen ? data.details : data.details.slice(0, 4)).map(row => (
              <div key={row.ticker} className="eval-detail-row">
                <span style={{ fontWeight: 800, fontSize: '12px', color: 'var(--text)', width: '46px', flexShrink: 0 }}>{row.ticker}</span>
                <div className="eval-detail-badges">
                  <span style={{
                    fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
                    background: row.correct ? 'rgba(46,194,122,0.12)' : 'rgba(240,86,75,0.12)',
                    border: `1px solid ${row.correct ? 'rgba(46,194,122,0.3)' : 'rgba(240,86,75,0.3)'}`,
                    color: row.correct ? 'var(--green)' : 'var(--red)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}>
                    {row.correct ? 'BENAR' : 'SALAH'}
                  </span>
                  <span style={{
                    fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
                    background: row.inRange ? 'rgba(79,125,255,0.10)' : 'rgba(217,161,58,0.10)',
                    border: `1px solid ${row.inRange ? 'rgba(79,125,255,0.25)' : 'rgba(217,161,58,0.25)'}`,
                    color: row.inRange ? 'var(--blue-bright)' : 'var(--amber)',
                  }}>
                    {row.inRange ? 'Dalam CI' : 'Di luar CI'}
                  </span>
                </div>
                <Bar
                  pct={100 - Math.min(parseFloat(row.error), 100)}
                  color={parseFloat(row.error) < 5 ? 'var(--green)' : parseFloat(row.error) < 12 ? 'var(--amber)' : 'var(--red)'}
                />
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', width: '38px', textAlign: 'right', flexShrink: 0 }}>
                  {row.error}
                </span>
                <span className="eval-detail-actual">
                  Aktual: <strong style={{ color: 'var(--text)' }}>{row.actual}</strong>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Monthly Comparison Table ── */}
        {prevDirPct !== null && (
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
              Perbandingan: {data.month} vs {prev.month}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                <thead>
                  <tr>
                    {['Metrik', data.month, prev.month, 'Selisih'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Akurasi Arah', cur: `${dirPct}%`, prv: `${prevDirPct}%`, d: delta ?? 0, isUp: (delta ?? 0) >= 0 },
                    { label: 'Coverage 90% CI', cur: `${rangePct}%`, prv: `${Math.round((prev.inRange / prev.total) * 100)}%`, d: rangePct - Math.round((prev.inRange / prev.total) * 100), isUp: rangePct >= Math.round((prev.inRange / prev.total) * 100) },
                    { label: 'Rata-rata Error (MAPE)', cur: data.avgError, prv: prev.avgError, d: parseFloat(prev.avgError) - parseFloat(data.avgError), isUp: parseFloat(data.avgError) < parseFloat(prev.avgError) },
                    { label: 'Prediksi Benar', cur: `${data.correct}/${data.total}`, prv: `${prev.correct}/${prev.total}`, d: data.correct - prev.correct, isUp: data.correct >= prev.correct },
                  ].map(row => (
                    <tr key={row.label} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px', fontSize: '12.5px', color: 'var(--text-dim)', fontWeight: 600 }}>{row.label}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 800, color: 'var(--text)' }}>{row.cur}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-dim)' }}>{row.prv}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontSize: '12px', fontWeight: 700,
                          color: row.isUp ? 'var(--green)' : 'var(--red)',
                        }}>
                          {row.isUp ? '▲' : '▼'} {Math.abs(row.d).toFixed(row.d % 1 !== 0 ? 1 : 0)}{typeof row.d === 'number' && row.label.includes('%') ? '' : ''}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
