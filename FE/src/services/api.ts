import { getDummyStock, getDummyForecast, getDummyTarget, getDummyKeyLevels, getDummySentiment, getDummySynthesis, getDummyNews, RANKING_HIGHLIGHTS, RANKING_ROWS, INDICES } from '@/data/dummy'
import type { Stock, ForecastData, TargetData, SentimentItem, SynthesisData, NewsItem, KeyLevel, RankingHighlight, RankingRow, IndexData } from '@/types'

const BASE_URL = import.meta.env.VITE_API_URL ?? (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:5000` : 'http://localhost:5000')

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

// --- Admin API ---

export async function adminGetUsersApi() {
  const res = await fetch(`${BASE_URL}/api/admin/users`, { headers: getAuthHeaders() })
  if (!res.ok) throw new Error('Gagal mengambil daftar user')
  return res.json()
}

export async function adminCreateUserApi(data: { username: string; email: string; password: string; role: string }) {
  const res = await fetch(`${BASE_URL}/api/admin/users`, {
    method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Gagal membuat user')
  return json
}

export async function adminUpdateUserApi(id: number, data: { username?: string; email?: string; role?: string; isActive?: boolean; password?: string }) {
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
    method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ role }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Gagal update role')
  return json
}

export async function adminToggleStatusApi(id: number) {
  const res = await fetch(`${BASE_URL}/api/admin/users/${id}/status`, {
    method: 'PUT', headers: getAuthHeaders(),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Gagal update status')
  return json
}

export async function adminDeleteUserApi(id: number) {
  const res = await fetch(`${BASE_URL}/api/admin/users/${id}`, {
    method: 'DELETE', headers: getAuthHeaders(),
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

export async function submitSupportTicketApi(ticket: { name: string; email: string; subject: string; category: string; message: string }) {
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

// --- Evaluation Models Endpoint ---

export async function fetchEvaluationsApi() {
  try {
    const res = await fetch(`${BASE_URL}/api/evaluations`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// --- Market Data Endpoints ---

export async function fetchStock(ticker: string): Promise<Stock> {
  const dummy = getDummyStock(ticker)
  try {
    const res = await fetch(`${BASE_URL}/api/stock/${ticker}`)
    if (res.ok) {
      const data = await res.json()
      if (data && data.ticker) {
        return {
          ...dummy,
          ticker: data.ticker,
          name: data.name || dummy.name,
          price: data.price ? `Rp ${Number(data.price).toLocaleString('id-ID')}` : dummy.price,
          change: data.changePercent ? `${data.changePercent >= 0 ? '+' : ''}${data.changePercent}%` : dummy.change,
          dir: (data.changePercent ?? 0) >= 0 ? 'up' : 'down',
          ohlc: dummy.ohlc || [
            { label: 'Prev', value: '9.325' },
            { label: 'Vol', value: '12,4M' },
          ],
          ratios: dummy.ratios || [
            { label: 'Mkt Cap', value: '1.170 T' },
            { label: 'P/E', value: '24,5' },
            { label: 'EPS', value: '388' },
            { label: 'Div Yield', value: '1,2%' },
          ],
        }
      }
    }
  } catch {
    // Fallback to dummy
  }
  return dummy
}

export async function fetchForecast(ticker: string, range: string): Promise<ForecastData> {
  const dummy = getDummyForecast(ticker, range)
  try {
    const res = await fetch(`${BASE_URL}/api/forecast/${ticker}?range=${range}`)
    if (res.ok) {
      const data = await res.json()
      if (data && data.forecast) {
        return {
          ...dummy,
          actual: data.actual || dummy.actual,
          forecast: data.forecast || dummy.forecast,
          ciUpper: data.ciUpper || dummy.ciUpper,
          ciLower: data.ciLower || dummy.ciLower,
        }
      }
    }
  } catch {
    // Fallback to dummy
  }
  return dummy
}

export async function fetchTarget(ticker: string): Promise<TargetData> {
  const dummy = getDummyTarget(ticker)
  try {
    const res = await fetch(`${BASE_URL}/api/target/${ticker}`)
    if (res.ok) {
      const data = await res.json()
      if (data && data.targetPrice) {
        return {
          ...dummy,
          targetPrice: data.targetPrice || dummy.targetPrice,
          rec: data.rec || dummy.rec,
          upside: data.upside || dummy.upside,
          sliderPct: data.sliderPct ?? dummy.sliderPct,
          stopLoss: data.stopLoss || dummy.stopLoss,
          riskReward: data.riskReward || dummy.riskReward,
          confidence: data.confidence || dummy.confidence,
        }
      }
    }
  } catch {
    // Fallback
  }
  return dummy
}

export async function fetchKeyLevels(ticker: string): Promise<KeyLevel[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/keylevels/${ticker}`)
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: any) => ({
          label: item.label || item.type || 'Pivot',
          value: item.value || item.level || '9.450',
          tone: item.tone || (item.type?.startsWith('R') ? 'up' : item.type?.startsWith('S') ? 'down' : 'flat'),
        }))
      }
    }
  } catch {
    // Fallback
  }
  return getDummyKeyLevels(ticker)
}

export async function fetchSentiment(ticker: string): Promise<SentimentItem[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/sentiment/${ticker}`)
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) return data
    }
  } catch {
    // Fallback
  }
  return getDummySentiment(ticker)
}

export async function fetchSynthesis(ticker: string): Promise<SynthesisData> {
  const dummy = getDummySynthesis(ticker)
  try {
    const res = await fetch(`${BASE_URL}/api/synthesis/${ticker}`)
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        return { ...dummy, bullets: data }
      }
    }
  } catch {
    // Fallback
  }
  return dummy
}

export async function fetchNews(ticker: string): Promise<NewsItem[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/stocks/${ticker}/news`)
    if (res.ok) {
      const data = await res.json()
      const list = Array.isArray(data) ? data : (data && Array.isArray(data.news)) ? data.news : []
      if (list.length > 0) {
        return list.map((item: any) => ({
          headline: item.title || item.headline || '',
          source: item.source || 'Market News',
          time: item.time || '10:00',
          tag: item.impact || 'Medium',
          tone: (item.impact && item.impact.includes('+')) ? ('green' as const) : (item.impact && item.impact.includes('-')) ? ('red' as const) : ('amber' as const),
          url: item.url || '#',
        }))
      }
    }
  } catch {
    // Fallback
  }
  return getDummyNews(ticker)
}

export async function fetchIndices(): Promise<IndexData[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/indices`)
    if (res.ok) return await res.json()
  } catch {
    // Fallback
  }
  return INDICES
}

export async function fetchRankingHighlights(): Promise<RankingHighlight[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/ranking/highlights`)
    if (res.ok) return await res.json()
  } catch {
    // Fallback
  }
  return RANKING_HIGHLIGHTS
}

export async function fetchRankingRows(): Promise<RankingRow[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/stocks`)
    if (res.ok) {
      const stocks = await res.json()
      if (Array.isArray(stocks) && stocks.length > 0) {
        return stocks.map((s: any, idx: number) => ({
          rank: idx + 1,
          ticker: s.ticker,
          company: s.name,
          score: `${Math.round(s.confidenceLevel || 85)}%`,
          ret: `${s.changePercent >= 0 ? '+' : ''}${s.changePercent}%`,
          dir: s.changePercent >= 0 ? ('up' as const) : ('down' as const),
          conf: s.signal === 'BUY' ? 'Tinggi' : 'Sedang',
          confPct: Math.round(s.confidenceLevel || 85),
          rec: s.signal || 'HOLD',
          cap: 'Large Cap',
        }))
      }
    }
  } catch {
    // Fallback
  }
  return RANKING_ROWS
}

export async function fetchNewsApi(ticker?: string): Promise<NewsItem[]> {
  try {
    const url = ticker ? `${BASE_URL}/api/stocks/${ticker}/news` : `${BASE_URL}/api/news`
    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json()
      const list = Array.isArray(data) ? data : (data && Array.isArray(data.news)) ? data.news : []
      if (list.length > 0) {
        return list.map((item: any) => ({
          title: item.title || item.headline || '',
          source: item.source || 'Market News',
          time: item.time || '10:00',
          impact: item.impact || 'Medium',
          url: item.url || '#',
        }))
      }
    }
  } catch (err) {
    console.warn('Backend news fetch failed:', err)
  }
  return getDummyNews(ticker || 'BBCA')
}

export interface UserSettingsPayload {
  aiModel: string
  confidenceInterval: string
  topbarIndex: string
  theme: string
  emailAlerts: boolean
  inAppAlerts: boolean
}

export async function getSettingsApi(): Promise<UserSettingsPayload | null> {
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

export async function saveSettingsApi(settings: UserSettingsPayload): Promise<{ success: boolean; message?: string }> {
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
