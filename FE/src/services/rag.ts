import { fetchStock, fetchTarget, fetchSentiment, fetchNews, fetchIndices, fetchRankingRows } from '@/services/api'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

export const hasGeminiKey = () => true

export interface ChatMessage {
  role: 'user' | 'model'
  text: string
}

interface GeminiContent {
  role: 'user' | 'model'
  parts: { text: string }[]
}

export async function buildStockContext(ticker: string): Promise<string> {
  const clean = ticker.toUpperCase()
  try {
    const [stock, target, sentiments, news] = await Promise.all([
      fetchStock(clean),
      fetchTarget(clean),
      fetchSentiment(clean),
      fetchNews(clean),
    ])

    const topNews = news && news[0] ? `Berita: ${news[0].headline} [${news[0].tone}]` : ''
    const sent = sentiments ? sentiments.map(s => `${s.label}:${s.verdict}(${s.value})`).join(' ') : ''

    return [
      `${clean}|${stock.price}|${stock.change}|${stock.dir === 'up' ? '▲' : '▼'}`,
      stock.ratios ? stock.ratios.map(r => `${r.label}:${r.value}`).join(' ') : '',
      `Target:${target.targetPrice || target.price} Rec:${target.rec} Stop:${target.stopLoss || '—'} Conf:${target.confidence || '—'}`,
      sent,
      topNews,
    ]
      .filter(Boolean)
      .join('\n')
  } catch {
    return `${clean} | Data sedang disinkronisasikan dari model pasar`
  }
}

export async function buildGlobalContext(): Promise<string> {
  try {
    const [indices, rankingRows] = await Promise.all([
      fetchIndices(),
      fetchRankingRows(),
    ])

    const lines: string[] = [
      `=== KONDISI PASAR GLOBAL & IHSG ===`,
      '',
      `[INDEKS UTAMA]`,
      ...indices.map(idx => `${idx.label}: ${idx.value} (${idx.dir === 'up' ? '▲' : '▼'})`),
      '',
      `[TABEL RANKING MODEL AI]`,
      ...rankingRows.slice(0, 10).map(
        r => `#${r.rank} ${r.ticker} (${r.company}) | Skor: ${r.score} | Rec: ${r.rec} | Conf: ${r.conf}`
      ),
      '',
    ]

    return lines.join('\n')
  } catch {
    return '=== KONDISI PASAR TERKINI ===\nData pasar real-time sedang disinkronisasikan dari server.'
  }
}

const SYSTEM_PROMPT = `Kamu analis saham IDX profesional berbasis model AI kuantitatif. Jawab HANYA berdasarkan data pasar yang diberikan. Bahasa Indonesia. WAJIB ringkas, padat, dan to the point.

FORMAT:
1. Status & Rekomendasi (Harga, Sinyal, Target)
2. Alasan Kuantitatif & Berita Utama
3. Manajemen Risiko & Stop Loss`

async function callGemini(
  contents: GeminiContent[],
  temperature = 0.7,
  maxTokens = 350,
  retries = 1
): Promise<string> {
  const url = `${API_BASE}/api/ai/generate`

  const body = {
    contents,
    systemPrompt: SYSTEM_PROMPT,
    temperature,
    maxTokens,
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (res.status === 429 && retries > 0) {
    await new Promise(r => setTimeout(r, 6000))
    return callGemini(contents, temperature, maxTokens, 0)
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    const msg = err?.error ?? res.statusText
    if (res.status === 429) throw new Error('Batas quota API tercapai. Coba sesaat lagi.')
    throw new Error(`AI Backend error ${res.status}: ${msg}`)
  }

  const json = await res.json()
  const text: string = json?.text ?? ''
  if (!text) throw new Error('Model AI tidak mengembalikan respons teks.')
  return text
}

export async function generateSynthesis(ticker: string): Promise<string[]> {
  const context = await buildStockContext(ticker)
  const prompt = `Konteks Pasar Terkini:\n${context}\n\nBuat ringkasan sintesis kuantitatif 2 paragraf padat tentang prospek saham ${ticker}.`
  const text = await callGemini([{ role: 'user', parts: [{ text: prompt }] }], 0.6, 300)
  return text.split('\n\n').filter(p => p.trim() !== '')
}

export async function chatWithRAG(messages: ChatMessage[], activeTicker?: string): Promise<string> {
  const context = activeTicker ? await buildStockContext(activeTicker) : await buildGlobalContext()
  
  const contents: GeminiContent[] = [
    {
      role: 'user',
      parts: [{ text: `Konteks Pasar Terkini:\n${context}` }],
    },
    ...messages.map(m => ({
      role: m.role,
      parts: [{ text: m.text }],
    })),
  ]

  return callGemini(contents)
}
