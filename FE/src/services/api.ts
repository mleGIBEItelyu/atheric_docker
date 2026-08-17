import {
  getDummyStock,
  getDummyForecast,
  getDummyTarget,
  getDummyKeyLevels,
  getDummySentiment,
  getDummySynthesis,
  getDummyNews,
  RANKING_HIGHLIGHTS,
  RANKING_ROWS,
  INDICES,
} from '@/data/dummy'
import type {
  Stock,
  ForecastData,
  TargetData,
  SentimentItem,
  SynthesisData,
  NewsItem,
  KeyLevel,
  RankingHighlight,
  RankingRow,
  IndexData,
} from '@/types'

const BASE_URL =
  import.meta.env.VITE_API_URL ??
  (typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:5000`
    : 'http://localhost:5000')

function getAuthHeaders(token?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  const activeToken = token || localStorage.getItem('atheric_token')
  if (activeToken && activeToken !== 'null' && activeToken !== 'undefined') {
    headers['Authorization'] = `Bearer ${activeToken}`
  }
  return headers
}

// --- Auth Endpoints ---

export async function loginApi(username: string, password: string) {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || 'Login gagal')
    }
    return data
  } catch (err: any) {
    console.warn('Backend login error:', err.message)
    throw err
  }
}

export async function registerApi(username: string, email: string, password: string) {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Registrasi gagal')
    return data
  } catch (err: any) {
    console.warn('Backend register error:', err.message)
    throw err
  }
}

export async function verifyCodeApi(email: string, code: string) {
  const res = await fetch(`${BASE_URL}/api/auth/verify-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Verifikasi gagal')
  return data
}

export async function resendCodeApi(email: string) {
  const res = await fetch(`${BASE_URL}/api/auth/resend-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Gagal mengirim ulang kode')
  return data
}

// --- Admin Endpoints ---

export async function adminGetUsersApi() {
  const res = await fetch(`${BASE_URL}/api/admin/users`, { headers: getAuthHeaders() })
  if (!res.ok) throw new Error('Gagal mengambil daftar user')
  return res.json()
}

export async function adminCreateUserApi(data: { username: string; email: string; password: string; role: string }) {
  const res = await fetch(`${BASE_URL}/api/admin/users`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Gagal membuat user')
  return json
}

export async function adminUpdateUserApi(
  id: number,
  data: { username?: string; email?: string; role?: string; isActive?: boolean; password?: string }
) {
  const res = await fetch(`${BASE_URL}/api/admin/users/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Gagal memperbarui data user')
  return json
}

export async function adminUpdateRoleApi(id: number, role: string) {
  const res = await fetch(`${BASE_URL}/api/admin/users/${id}/role`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ role }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Gagal update role')
  return json
}

export async function adminToggleStatusApi(id: number) {
  const res = await fetch(`${BASE_URL}/api/admin/users/${id}/status`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Gagal update status')
  return json
}

export async function adminDeleteUserApi(id: number) {
  const res = await fetch(`${BASE_URL}/api/admin/users/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Gagal hapus user')
  return json
}

export async function adminGetActivityLogsApi() {
  try {
    const res = await fetch(`${BASE_URL}/api/admin/activity-logs`, {
      headers: getAuthHeaders(),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Gagal mengambil log aktivitas')
    return Array.isArray(json) ? json : []
  } catch (err: any) {
    console.warn('Failed to fetch activity logs:', err)
    throw new Error(err.message || 'Gagal mengambil log aktivitas')
  }
}

export async function getMeApi(token?: string) {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: getAuthHeaders(token),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// --- Watchlist Endpoints ---

export async function fetchWatchlistApi() {
  try {
    const res = await fetch(`${BASE_URL}/api/watchlist`, {
      headers: getAuthHeaders(),
    })
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

export async function toggleWatchlistApi(ticker: string) {
  try {
    const res = await fetch(`${BASE_URL}/api/watchlist/toggle`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ticker }),
    })
    return await res.json()
  } catch (err) {
    console.warn('Failed to toggle watchlist on BE:', err)
    return null
  }
}

// --- Support Ticket Endpoint ---

export async function submitSupportTicketApi(ticket: {
  name: string
  email: string
  subject: string
  category: string
  message: string
}) {
  try {
    const res = await fetch(`${BASE_URL}/api/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ticket),
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || 'Gagal mengirim tiket')
    }
    return data
  } catch (err: any) {
    console.warn('Backend ticket submission failed:', err.message)
    throw err
  }
}

// --- Offline & Low-Bandwidth Local Persistence Helper ---

function saveToLocalCache(key: string, data: any) {
  try {
    localStorage.setItem(`ath_cache_${key}`, JSON.stringify({
      data,
      savedAt: Date.now(),
    }))
  } catch {
    // ignore quota errors
  }
}

function loadFromLocalCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`ath_cache_${key}`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed.data as T
  } catch {
    return null
  }
}

// --- Stock Data & AI Forecasting Endpoints ---

export async function fetchStock(ticker = 'BBCA'): Promise<Stock> {
  const fallback = getDummyStock(ticker)
  const cacheKey = `stock_${ticker}`
  try {
    const res = await fetch(`${BASE_URL}/api/stock/${ticker}`, {
      headers: getAuthHeaders(),
    })
    if (res.ok) {
      const data = await res.json()
      if (data && data.ticker) {
        const result: Stock = {
          ticker: data.ticker,
          initial: data.ticker.slice(0, 2),
          name: data.name || fallback.name,
          price: data.price ? `Rp ${data.price.toLocaleString('id-ID')}` : fallback.price,
          change: data.changePercent !== undefined ? `${data.changePercent >= 0 ? '+' : ''}${data.changePercent}%` : fallback.change,
          dir: (data.changePercent !== undefined ? data.changePercent >= 0 : data.change >= 0) ? 'up' : 'down',
          ohlc: fallback.ohlc,
          ratios: fallback.ratios,
        }
        saveToLocalCache(cacheKey, result)
        return result
      }
    }
  } catch (err) {
    console.warn(`[Network Low/Offline] Loading stock ${ticker} from local cache:`, err)
  }
  const cached = loadFromLocalCache<Stock>(cacheKey)
  return cached || fallback
}

export async function fetchForecast(ticker = 'BBCA', range = '3M'): Promise<ForecastData> {
  const fallback = getDummyForecast(ticker, range)
  const cacheKey = `forecast_${ticker}_${range}`
  try {
    const res = await fetch(`${BASE_URL}/api/forecast/${ticker}?range=${range}`, {
      headers: getAuthHeaders(),
    })
    if (res.ok) {
      const data = await res.json()
      if (data && Array.isArray(data.forecast) && data.forecast.length > 0) {
        const allVals = [...(data.actual || []), ...data.forecast, ...(data.ciUpper || []), ...(data.ciLower || [])]
        const yMin = allVals.length > 0 ? Math.floor(Math.min(...allVals) * 0.95 / 100) * 100 : fallback.yMin
        const yMax = allVals.length > 0 ? Math.ceil(Math.max(...allVals) * 1.05 / 100) * 100 : fallback.yMax
        const step = Math.round((yMax - yMin) / 4)
        const yTicks = [yMin, yMin + step, yMin + step * 2, yMin + step * 3, yMax]

        const result: ForecastData = {
          title: data.model || 'Proyeksi Harga Generative Financial AI',
          caption: data.signal ? `Sinyal Model: ${data.signal} • Horizon ${data.horizonDays || 20} Hari Trading` : fallback.caption,
          ranges: fallback.ranges,
          activeRange: range,
          yMin,
          yMax,
          yTicks,
          xLabels: fallback.xLabels,
          actual: data.actual || fallback.actual,
          forecast: data.forecast,
          ciUpper: data.ciUpper || fallback.ciUpper,
          ciLower: data.ciLower || fallback.ciLower,
          volume: fallback.volume,
        }
        saveToLocalCache(cacheKey, result)
        return result
      }
    }
  } catch (err) {
    console.warn(`[Network Low/Offline] Loading forecast for ${ticker} from local cache:`, err)
  }
  const cached = loadFromLocalCache<ForecastData>(cacheKey)
  return cached || fallback
}

export async function fetchTarget(ticker = 'BBCA'): Promise<TargetData> {
  const fallback = getDummyTarget(ticker)
  const cacheKey = `target_${ticker}`
  try {
    const res = await fetch(`${BASE_URL}/api/target/${ticker}`, {
      headers: getAuthHeaders(),
    })
    if (res.ok) {
      const data = await res.json()
      if (data && data.targetPrice) {
        const result: TargetData = {
          title: data.model || fallback.title,
          price: data.targetPrice,
          rec: data.rec || fallback.rec,
          upside: data.upside || fallback.upside,
          sliderPct: data.sliderPct || fallback.sliderPct,
          stats: fallback.stats,
          disclaimer: fallback.disclaimer,
          targetPrice: data.targetPrice,
          stopLoss: data.stopLoss,
          riskReward: data.riskReward,
          confidence: data.confidence,
        }
        saveToLocalCache(cacheKey, result)
        return result
      }
    }
  } catch (err) {
    console.warn(`[Network Low/Offline] Loading target for ${ticker} from local cache:`, err)
  }
  const cached = loadFromLocalCache<TargetData>(cacheKey)
  return cached || fallback
}

export async function fetchKeyLevels(ticker = 'BBCA'): Promise<KeyLevel[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/keylevels/${ticker}`, {
      headers: getAuthHeaders(),
    })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: any) => ({
          label: item.type || item.label,
          value: item.level || item.value,
          tone: (item.type === 'R1' || item.type === 'R2') ? 'up' : (item.type === 'S1' || item.type === 'S2') ? 'down' : 'flat',
        }))
      }
    }
  } catch (err) {
    console.warn(`Failed to fetch key levels for ${ticker} from backend, using fallback:`, err)
  }
  return getDummyKeyLevels(ticker)
}

export async function fetchSentiment(ticker = 'BBCA'): Promise<SentimentItem[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/sentiment/${ticker}`, {
      headers: getAuthHeaders(),
    })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        return data
      }
    }
  } catch (err) {
    console.warn(`Failed to fetch sentiment for ${ticker} from backend, using fallback:`, err)
  }
  return getDummySentiment(ticker)
}

export async function fetchSynthesis(ticker = 'BBCA'): Promise<SynthesisData> {
  const fallback = getDummySynthesis(ticker)
  try {
    const res = await fetch(`${BASE_URL}/api/synthesis/${ticker}`, {
      headers: getAuthHeaders(),
    })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        return {
          title: `Sintesis Kuantitatif Model AI (${ticker})`,
          paragraphs: data,
          bullets: fallback.bullets,
        }
      }
    }
  } catch (err) {
    console.warn(`Failed to fetch synthesis for ${ticker} from backend, using fallback:`, err)
  }
  return fallback
}

export async function fetchNews(ticker = 'BBCA'): Promise<NewsItem[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/news?ticker=${ticker}`, {
      headers: getAuthHeaders(),
    })
    if (res.ok) {
      const data = await res.json()
      const list = Array.isArray(data) ? data : data.news
      if (Array.isArray(list) && list.length > 0) {
        return list.map((item: any) => ({
          headline: item.title || item.headline,
          source: item.source || 'Market News',
          time: item.time || 'Hari ini',
          tag: item.impact || 'Netral',
          tone: (item.impact && item.impact.includes('+')) ? 'up' : (item.impact && item.impact.includes('-')) ? 'down' : 'flat',
        }))
      }
    }
  } catch (err) {
    console.warn(`Failed to fetch news for ${ticker} from backend, using fallback:`, err)
  }
  return getDummyNews(ticker)
}

export async function fetchRankingHighlights(): Promise<RankingHighlight[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/ranking/highlights`, {
      headers: getAuthHeaders(),
    })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        return data
      }
    }
  } catch (err) {
    console.warn('Failed to fetch ranking highlights from backend, using fallback:', err)
  }
  return RANKING_HIGHLIGHTS
}

export async function fetchRankingRows(): Promise<RankingRow[]> {
  const cacheKey = 'ranking_rows_all'
  try {
    const res = await fetch(`${BASE_URL}/api/stocks`, {
      headers: getAuthHeaders(),
    })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        const rows: RankingRow[] = data.map((s: any, idx: number) => ({
          rank: idx + 1,
          ticker: s.ticker,
          company: s.name,
          score: s.confidenceLevel ? `${s.confidenceLevel.toFixed(1)}` : '90.0',
          ret: s.changePercent !== undefined ? `${s.changePercent >= 0 ? '+' : ''}${s.changePercent.toFixed(1)}%` : '+5.0%',
          dir: ((s.changePercent !== undefined ? s.changePercent >= 0 : s.change >= 0) ? 'up' : 'down') as 'up' | 'down',
          conf: (s.confidenceLevel || 80) >= 90 ? 'High' : (s.confidenceLevel || 80) >= 75 ? 'Med' : 'Low',
          confPct: Math.round(s.confidenceLevel || 80),
          rec: s.signal || 'BUY',
          cap: s.category === 'Banking' ? 'Rp 1.170T' : s.category === 'Telco' ? 'Rp 213T' : 'Rp 218T',
        }))
        saveToLocalCache(cacheKey, rows)
        return rows
      }
    }
  } catch (err) {
    console.warn('[Network Low/Offline] Loading ranking rows from local cache:', err)
  }
  const cached = loadFromLocalCache<RankingRow[]>(cacheKey)
  return cached || RANKING_ROWS
}

export async function fetchIndices(): Promise<IndexData[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/indices`, {
      headers: getAuthHeaders(),
    })
    if (res.ok) {
      return await res.json()
    }
  } catch (err) {
    console.warn('Failed to fetch indices from backend, using fallback:', err)
  }
  return INDICES
}

// --- User Settings Endpoints ---

export interface UserSettingsPayload {
  aiModel?: string
  confidenceInterval?: string
  horizonTradingDays?: string | number
  theme?: string
  topbarIndex?: string
  autoRefreshInterval?: number
  emailAlerts?: boolean
  inAppAlerts?: boolean
}

export async function fetchUserSettingsApi(): Promise<UserSettingsPayload | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/settings`, {
      headers: getAuthHeaders(),
    })
    if (res.ok) {
      return await res.json()
    }
  } catch (err) {
    console.warn('Failed to fetch settings from backend:', err)
  }
  return null
}

export const getSettingsApi = fetchUserSettingsApi

export async function saveSettingsApi(
  settings: UserSettingsPayload
): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/api/settings`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(settings),
    })
    const data = await res.json()
    if (res.ok) {
      return { success: true, message: data.message || 'Pengaturan berhasil disimpan' }
    }
    return { success: false, message: data.error || 'Gagal menyimpan pengaturan' }
  } catch (err: any) {
    return { success: false, message: err.message || 'Gagal terhubung ke server' }
  }
}

export async function fetchDeviceSessionsApi() {
  try {
    const res = await fetch(`${BASE_URL}/api/sessions`, {
      headers: getAuthHeaders(),
    })
    if (res.ok) {
      return await res.json()
    }
  } catch (err) {
    console.warn('Failed to fetch device sessions from BE:', err)
  }
  return null
}

export async function revokeDeviceSessionApi(sessionId: string | number) {
  try {
    const res = await fetch(`${BASE_URL}/api/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })
    const data = await res.json()
    if (res.ok) {
      return { success: true, message: data.message }
    }
    return { success: false, message: data.error || 'Gagal menghapus sesi' }
  } catch (err: any) {
    return { success: false, message: err.message || 'Gagal terhubung ke server' }
  }
}

export async function fetchEvaluationsApi() {
  try {
    const res = await fetch(`${BASE_URL}/api/evaluations`, {
      headers: getAuthHeaders(),
    })
    if (res.ok) {
      return await res.json()
    }
  } catch (err) {
    console.warn('Failed to fetch evaluations from BE:', err)
  }
  return null
}

export async function fetchGenesisSummaryApi() {
  try {
    const res = await fetch(`${BASE_URL}/api/genesis/summary`, {
      headers: getAuthHeaders(),
    })
    if (res.ok) {
      return await res.json()
    }
  } catch (err) {
    console.warn('Failed to fetch genesis summary from BE:', err)
  }
  return null
}
