import { useQuery } from '@tanstack/react-query'
import { fetchStock, fetchForecast, fetchTarget, fetchKeyLevels, fetchSentiment, fetchSynthesis, fetchNews } from '@/services/api'

// Query Key Factory Pattern for logical caching
export const stockKeys = {
  all: ['stocks'] as const,
  stock: (ticker: string) => [...stockKeys.all, 'detail', ticker] as const,
  forecast: (ticker: string, range: string) => [...stockKeys.all, 'forecast', ticker, range] as const,
  target: (ticker: string) => [...stockKeys.all, 'target', ticker] as const,
  keylevels: (ticker: string) => [...stockKeys.all, 'keylevels', ticker] as const,
  sentiment: (ticker: string) => [...stockKeys.all, 'sentiment', ticker] as const,
  synthesis: (ticker: string) => [...stockKeys.all, 'synthesis', ticker] as const,
  news: (ticker: string) => [...stockKeys.all, 'news', ticker] as const,
}

const ONE_DAY_MS = 1000 * 60 * 60 * 24

export function useStock(ticker = 'BBCA') {
  return useQuery({
    queryKey: stockKeys.stock(ticker),
    queryFn: () => fetchStock(ticker),
    staleTime: ONE_DAY_MS,
  })
}

export function useForecast(ticker = 'BBCA', range = '3M') {
  return useQuery({
    queryKey: stockKeys.forecast(ticker, range),
    queryFn: () => fetchForecast(ticker, range),
    staleTime: ONE_DAY_MS, // Monthly forecast cached fresh for 24 hours
  })
}

export function useTarget(ticker = 'BBCA') {
  return useQuery({
    queryKey: stockKeys.target(ticker),
    queryFn: () => fetchTarget(ticker),
    staleTime: ONE_DAY_MS,
  })
}

export function useKeyLevels(ticker = 'BBCA') {
  return useQuery({
    queryKey: stockKeys.keylevels(ticker),
    queryFn: () => fetchKeyLevels(ticker),
    staleTime: ONE_DAY_MS,
  })
}

export function useSentiment(ticker = 'BBCA') {
  return useQuery({
    queryKey: stockKeys.sentiment(ticker),
    queryFn: () => fetchSentiment(ticker),
    staleTime: ONE_DAY_MS,
  })
}

export function useSynthesis(ticker = 'BBCA') {
  return useQuery({
    queryKey: stockKeys.synthesis(ticker),
    queryFn: () => fetchSynthesis(ticker),
    staleTime: ONE_DAY_MS,
  })
}

export function useNews(ticker = 'BBCA') {
  return useQuery({
    queryKey: stockKeys.news(ticker),
    queryFn: () => fetchNews(ticker),
    staleTime: 1000 * 60 * 15,
  })
}
