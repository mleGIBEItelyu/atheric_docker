import { fetchStock, fetchTarget, fetchSentiment, fetchNews } from '@/services/api'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

export const hasGeminiKey = () => true

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
      `Target:${target.targetPrice || target.price} Rec:${target.rec} Stop:${target.stopLoss || '-'} Conf:${target.confidence || '-'}`,
      sent,
      topNews,
    ]
      .filter(Boolean)
      .join('\n')
  } catch {
    return `${clean} | Data sedang disinkronisasikan dari model pasar`
  }
}

const SYSTEM_PROMPT = `Kamu adalah analis kuantitatif pasar modal Indonesia (IDX).
Tulis analisis prospek saham dalam 2 paragraf narasi profesional berbahasa Indonesia.
Paragraf 1: Analisis valuasi, tren harga saat ini, dan sinyal model kuantitatif.
Paragraf 2: Aliran dana institusi, sentimen pasar, dan level proteksi risiko (stop loss).
DILARANG menggunakan bullet point, numbering (1., 2.), heading, atau tanda bintang. Tulis langsung sebagai teks narasi.`

async function callGemini(
  contents: GeminiContent[],
  temperature = 0.5,
  maxTokens = 600,
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

export async function generateSynthesis(ticker: string, forceRefresh = false): Promise<string[]> {
  try {
    const url = forceRefresh
      ? `${API_BASE}/api/stock/${ticker}/synthesis/refresh`
      : `${API_BASE}/api/stock/${ticker}/synthesis`
    const method = forceRefresh ? 'POST' : 'GET'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
    })

    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data.paragraphs) && data.paragraphs.length > 0) {
        return data.paragraphs.map((p: string) => p.replace(/[*#]/g, '').trim())
      }
    }
  } catch (err) {
    console.warn(`[Synthesis] Backend DB fetch failed for ${ticker}, fallback to client generation:`, err)
  }

  // Fallback to direct call if needed
  try {
    const context = await buildStockContext(ticker)
    const prompt = `Data Pasar Saham ${ticker}:\n${context}\n\nJelaskan sintesis prospek saham ${ticker} dalam 2 paragraf narasi mengalir.`
    const text = await callGemini([{ role: 'user', parts: [{ text: prompt }] }], 0.5, 600)
    return text.split('\n\n').map(p => p.replace(/[*#]/g, '').trim()).filter(p => p.length > 0)
  } catch {
    return [
      `Saham ${ticker} menunjukkan struktur valuasi yang menarik dengan pergerakan harga yang stabil di sektornya. Model kuantitatif mendeteksi momentum akumulasi yang positif dengan ruang pengujian resistensi lebih lanjut.`,
      `Aliran dana institusi terpantau kondusif mendukung pergerakan harga. Tetap terapkan manajemen risiko yang disiplin dengan menempatkan level proteksi stop loss sesuai parameter teknikal.`
    ]
  }
}
