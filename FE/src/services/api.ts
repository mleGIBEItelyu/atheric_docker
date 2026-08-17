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

// --- Stock Data & AI Forecasting Endpoints ---

export async function fetchStock(ticker = 'BBCA'): Promise<Stock> {
  try {
    const res = await fetch(`${BASE_URL}/api/stock/${ticker}`, {
      headers: getAuthHeaders(),
    })
    if (res.ok) {
      return await res.json()
    }
  } catch (err) {
    console.warn(`Failed to fetch stock ${ticker} from backend, using fallback:`, err)
  }
  return getDummyStock(ticker)
}

export async function fetchForecast(ticker = 'BBCA', range = '3M'): Promise<ForecastData> {
  try {
    const res = await fetch(`${BASE_URL}/api/forecast/${ticker}?range=${range}`, {
      headers: getAuthHeaders(),
    })
    if (res.ok) {
      return await res.json()
    }
  } catch (err) {
    console.warn(`Failed to fetch forecast for ${ticker} from backend, using fallback:`, err)
  }
  return getDummyForecast(ticker, range)
}

export async function fetchTarget(ticker = 'BBCA'): Promise<TargetData> {
  try {
    const res = await fetch(`${BASE_URL}/api/target/${ticker}`, {
      headers: getAuthHeaders(),
    })
    if (res.ok) {
      return await res.json()
    }
  } catch (err) {
    console.warn(`Failed to fetch target for ${ticker} from backend, using fallback:`, err)
  }
  return getDummyTarget(ticker)
}

export async function fetchKeyLevels(ticker = 'BBCA'): Promise<KeyLevel[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/keylevels/${ticker}`, {
      headers: getAuthHeaders(),
    })
    if (res.ok) {
      return await res.json()
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
      return await res.json()
    }
  } catch (err) {
    console.warn(`Failed to fetch sentiment for ${ticker} from backend, using fallback:`, err)
  }
  return getDummySentiment(ticker)
}

export async function fetchSynthesis(ticker = 'BBCA'): Promise<SynthesisData> {
  try {
    const res = await fetch(`${BASE_URL}/api/synthesis/${ticker}`, {
      headers: getAuthHeaders(),
    })
    if (res.ok) {
      return await res.json()
    }
  } catch (err) {
    console.warn(`Failed to fetch synthesis for ${ticker} from backend, using fallback:`, err)
  }
  return getDummySynthesis(ticker)
}

export async function fetchNews(ticker = 'BBCA'): Promise<NewsItem[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/news?ticker=${ticker}`, {
      headers: getAuthHeaders(),
    })
    if (res.ok) {
      const data = await res.json()
      return data.news || data
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
      return await res.json()
    }
  } catch (err) {
    console.warn('Failed to fetch ranking highlights from backend, using fallback:', err)
  }
  return RANKING_HIGHLIGHTS
}

export async function fetchRankingRows(): Promise<RankingRow[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/stocks`, {
      headers: getAuthHeaders(),
    })
    if (res.ok) {
      return await res.json()
    }
  } catch (err) {
    console.warn('Failed to fetch stocks from backend, using fallback:', err)
  }
  return RANKING_ROWS
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
