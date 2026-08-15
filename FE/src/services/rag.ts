import {
  getDummyStock,
  getDummyForecast,
  getDummyTarget,
  getDummySentiment,
  getDummyNews,
  RANKING_ROWS,
  RANKING_HIGHLIGHTS,
  INDICES,
} from '@/data/dummy'

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

export function buildStockContext(ticker: string): string {
  const clean = ticker.toUpperCase()
  const stock = getDummyStock(clean)
  const target = getDummyTarget(clean)
  const sentiments = getDummySentiment(clean)
  const news = getDummyNews(clean)
  const rankRow = RANKING_ROWS.find(r => r.ticker === clean)

  const topNews = news[0] ? `Berita: ${news[0].headline} [${news[0].tone}]` : ''
  const sent = sentiments.map(s => `${s.label}:${s.verdict}(${s.value})`).join(' ')
  const rank = rankRow ? `Rank:#${rankRow.rank} Skor:${rankRow.score} ${rankRow.rec} Conf:${rankRow.confPct}%` : ''

  return [
    `${clean}|${stock.price}|${stock.change}|${stock.dir === 'up' ? '▲' : '▼'}`,
    stock.ratios.map(r => `${r.label}:${r.value}`).join(' '),
    `Target:${target.price} Rec:${target.rec} Stop:${target.stats[0]?.value} RR:${target.stats[1]?.value} Conf:${target.stats[2]?.value}`,
    sent,
    rank,
    topNews,
  ].filter(Boolean).join('\n')
}

export function buildGlobalContext(): string {
  const lines: string[] = [
    `=== KONDISI PASAR GLOBAL & IHSG ===`,
    '',
    `[INDEKS UTAMA]`,
    ...INDICES.map(idx => `${idx.label}: ${idx.value} (${idx.dir === 'up' ? '▲' : '▼'})`),
    '',
    `[TOP RANKING SAHAM (AI Score)]`,
    ...RANKING_HIGHLIGHTS.map(
      r => `#${r.rank} ${r.ticker} (${r.name}) — Skor: ${r.score}, Return: ${r.ret} (${r.dir === 'up' ? '▲' : '▼'})`
    ),
    '',
    `[TABEL RANKING LENGKAP]`,
    ...RANKING_ROWS.map(
      r =>
        `#${r.rank} ${r.ticker} | Skor: ${r.score} | Rec: ${r.rec} | Confidence: ${r.conf} ${r.confPct}% | Cap: ${r.cap}`
    ),
    '',
  ]

  return lines.join('\n')
}

export function buildMultiStockContext(tickers: string[]): string {
  return tickers.map(t => buildStockContext(t)).join('\n\n')
}

const SYSTEM_PROMPT = `Kamu analis saham IDX. Jawab HANYA dari data yang diberikan. Bahasa Indonesia. WAJIB max 3 baris. Tidak boleh lebih.

FORMAT WAJIB:
Baris 1: Status + sinyal utama (harga, arah, rekomendasi)
Baris 2: Alasan kunci (1 teknikal + 1 fundamental)
Baris 3: Target / risiko / peringatan - akhiri dengan [bukan saran investasi]

Jika tidak ada data: tulis "Data tidak tersedia" - jangan karang angka.`

async function callGemini(
  contents: GeminiContent[],
  temperature = 0.7,
  maxTokens = 200,
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
    if (res.status === 429) throw new Error('Quota habis. Coba beberapa menit lagi atau upgrade API key di backend.')
    throw new Error(`AI Backend error ${res.status}: ${msg}`)
  }

  const json = await res.json()
  const text: string = json?.text ?? ''
  if (!text) throw new Error('AI Backend tidak mengembalikan respons teks.')
  return text
}

export async function generateSynthesis(ticker: string): Promise<string[]> {
  const context = buildStockContext(ticker)

  const prompt = `Tulis synthesis ${ticker.toUpperCase()} — MAX 3 BARIS TOTAL, tidak boleh lebih.

DATA:
${context}

Output: 3 baris saja. Baris 1: sinyal harga & arah. Baris 2: alasan teknikal+fundamental. Baris 3: target+risiko+[bukan saran investasi].`

  const contents: GeminiContent[] = [
    { role: 'user', parts: [{ text: prompt }] },
  ]

  const raw = await callGemini(contents, 0.6, 300)

  const paragraphs = raw
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 20)

  return paragraphs.length > 0 ? paragraphs : [raw.trim()]
}

export async function chatWithRAG(
  messages: ChatMessage[],
  activeTicker?: string
): Promise<string> {
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.text ?? ''
  const mentionedTickers = detectTickers(lastUserMsg)

  let context = ''
  const tickersToLoad = new Set<string>()

  if (activeTicker) tickersToLoad.add(activeTicker.toUpperCase())
  mentionedTickers.forEach(t => tickersToLoad.add(t))

  if (tickersToLoad.size === 0) {
    context = buildGlobalContext()
  } else if (tickersToLoad.size === 1) {
    const ticker = [...tickersToLoad][0]
    context = buildStockContext(ticker)
  } else {
    context = buildGlobalContext() + '\n\n' + buildMultiStockContext([...tickersToLoad])
  }

  const firstUserIdx = messages.findIndex(m => m.role === 'user')
  const contentsRaw: ChatMessage[] = messages.map((m, i) => {
    if (i === firstUserIdx) {
      return {
        role: 'user',
        text: `[DATA PASAR TERSEDIA UNTUK REFERENSI]\n${context}\n\n[PERTANYAAN USER]\n${m.text}`,
      }
    }
    return m
  })

  const contents: GeminiContent[] = contentsRaw.map(m => ({
    role: m.role,
    parts: [{ text: m.text }],
  }))

  return callGemini(contents, 0.7, 200)
}

const KNOWN_TICKERS = ['BBCA', 'BBRI', 'TLKM', 'ASII', 'GOTO', 'BMRI', 'UNVR', 'ICBP', 'BUKA', 'LQ45', 'IHSG']

export function detectTickers(text: string): string[] {
  const upper = text.toUpperCase()
  const found: string[] = []

  KNOWN_TICKERS.forEach(ticker => {
    if (upper.includes(ticker)) found.push(ticker)
  })

  const matches = upper.match(/\b[A-Z]{4}\b/g) ?? []
  matches.forEach(m => {
    if (!found.includes(m) && !['YANG', 'ATAU', 'JIKA', 'DARI', 'PADA', 'AKAN', 'BISA', 'SAJA'].includes(m)) {
      found.push(m)
    }
  })

  return [...new Set(found)]
}
