import { useState, useEffect, useRef } from 'react'
import { useSynthesis } from '@/hooks/useStock'
import { generateSynthesis, hasGeminiKey } from '@/services/rag'
import { SparkIcon } from '@/components/common/icons'

interface Props { ticker: string }

export function SynthesisCard({ ticker }: Props) {
  const { data: staticData } = useSynthesis(ticker)
  const [ragParagraphs, setRagParagraphs] = useState<string[] | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const generatedRef = useRef<string | null>(null)

  const hasKey = hasGeminiKey()

  const fetchSynthesis = (force = false) => {
    if (!hasKey) return
    setError(null)
    setIsGenerating(true)

    generateSynthesis(ticker, force)
      .then(result => setRagParagraphs(result))
      .catch(err => {
        const msg = err instanceof Error ? err.message : 'Terjadi kesalahan'
        setError(msg)
      })
      .finally(() => setIsGenerating(false))
  }

  useEffect(() => {
    if (generatedRef.current === ticker) return
    generatedRef.current = ticker
    fetchSynthesis(false)
  }, [ticker, hasKey])

  const paragraphs = ragParagraphs ?? staticData?.paragraphs ?? []
  const isRag = Boolean(ragParagraphs)

  return (
    <section className="card panel-card synth-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <span className="card-title" style={{ margin: 0 }}>AI Synthesis</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isGenerating ? (
            <span style={{
              fontSize: '10px', color: 'var(--text-mute)', display: 'flex', alignItems: 'center', gap: '5px',
            }}>
              <span style={{ width: '10px', height: '10px', border: '1.5px solid var(--border-strong)', borderTopColor: 'var(--blue)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
              Menganalisis...
            </span>
          ) : (
            <button
              onClick={() => fetchSynthesis(true)}
              title="Perbarui analisis harian (Force Refresh)"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border)',
                color: 'var(--text-mute)',
                cursor: 'pointer',
                padding: '2px 8px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '10.5px',
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              Refresh
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{
          padding: '10px 12px', borderRadius: 'var(--radius-sm)', marginBottom: '12px',
          background: 'rgba(240,86,75,0.08)', border: '1px solid rgba(240,86,75,0.2)',
          fontSize: '12px', color: 'var(--red)', lineHeight: 1.5,
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </div>
      )}

      {isGenerating && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[100, 88, 94, 72, 100, 82, 90, 65].map((w, i) => (
            <div key={i} style={{
              height: '12px', borderRadius: '6px', width: `${w}%`,
              background: 'var(--border-strong)',
              animation: 'skeletonPulse 1.4s ease-in-out infinite',
              animationDelay: `${i * 0.08}s`,
            }} />
          ))}
        </div>
      )}

      {!isGenerating && (
        <div className="synth-scroll">
          {paragraphs.map((p, i) => {
            const cleanText = p.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*/g, '').trim()
            return (
              <p key={`${ticker}-${i}`} className="synth-para" style={{
                animation: isRag ? `synthParaIn 0.4s ease ${i * 0.15}s both` : 'none',
                lineHeight: 1.65,
                color: 'var(--text-dim)',
                marginBottom: '10px',
              }}>
                {cleanText}
              </p>
            )
          })}
        </div>
      )}

      {!isGenerating && (
        <div style={{
          marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border)',
          fontSize: '10.5px', color: 'var(--text-mute)', display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <span style={{ width: '12px', height: '12px', flexShrink: 0, color: 'var(--blue-bright)' }}>
            <SparkIcon />
          </span>
          Analisis Harian Tersimpan di Database · Bukan saran investasi
        </div>
      )}
    </section>
  )
}
