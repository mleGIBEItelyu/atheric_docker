import { useQuery } from '@tanstack/react-query'
import { fetchStock, fetchForecast, fetchTarget, fetchKeyLevels, fetchSentiment, fetchSynthesis, fetchNews } from '@/services/api'

// Query Key Factory Pattern for logical caching
export const stockKeys = {
  all: ['stocks'] as const,
  stock: (ticker: string) => [...stockKeys.all, 'detail', ticker] as const,
  forecast: (ticker: string, range: string) => [...stockKeys.all, 'forecast', ticker, range] as const,
  target: (ticker: string, range: string) => [...stockKeys.all, 'target', ticker, range] as const,
  keylevels: (ticker: string) => [...stockKeys.all, 'keylevels', ticker] as const,
  sentiment: (ticker: string) => [...stockKeys.all, 'sentiment', ticker] as const,
  synthesis: (ticker: string) => [...stockKeys.all, 'synthesis', ticker] as const,
  news: (ticker: string) => [...stockKeys.all, 'news', ticker] as const,
}

// Data Harga Saham Real-Time (Live Refresh Tiap 10 Detik)
export function useStock(ticker = 'BBCA') {
  return useQuery({
    queryKey: stockKeys.stock(ticker),
    queryFn: () => fetchStock(ticker),
    staleTime: 5 * 1000,
    refetchInterval: 10 * 1000, // Live auto-refresh setiap 10 detik
    refetchIntervalInBackground: false,
  })
}

// Proyeksi Harga Dinamis AI Harian
export function useForecast(ticker = 'BBCA', range = '3M') {
  return useQuery({
    queryKey: stockKeys.forecast(ticker, range),
    queryFn: () => fetchForecast(ticker, range),
    staleTime: 10 * 60 * 1000,
  })
}

// Target Harga & Rekomendasi Dinamis Harian
export function useTarget(ticker = 'BBCA', range = '1M') {
  return useQuery({
    queryKey: stockKeys.target(ticker, range),
    queryFn: () => fetchTarget(ticker, range),
    staleTime: 10 * 60 * 1000,
  })
}

// Key Levels Support & Resistance Harian
export function useKeyLevels(ticker = 'BBCA') {
  return useQuery({
    queryKey: stockKeys.keylevels(ticker),
    queryFn: () => fetchKeyLevels(ticker),
    staleTime: 10 * 60 * 1000,
  })
}

// Sentimen Kuantitatif Pasar Harian
export function useSentiment(ticker = 'BBCA') {
  return useQuery({
    queryKey: stockKeys.sentiment(ticker),
    queryFn: () => fetchSentiment(ticker),
    staleTime: 5 * 60 * 1000,
  })
}

// Sintesis Analisis AI Harian
export function useSynthesis(ticker = 'BBCA') {
  return useQuery({
    queryKey: stockKeys.synthesis(ticker),
    queryFn: () => fetchSynthesis(ticker),
    staleTime: 5 * 60 * 1000,
  })
}

// Berita Pasar Real-Time Harian
export function useNews(ticker = 'BBCA') {
  return useQuery({
    queryKey: stockKeys.news(ticker),
    queryFn: () => fetchNews(ticker),
    staleTime: 60 * 1000,
  })
}
