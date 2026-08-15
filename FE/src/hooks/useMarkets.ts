import { useQuery } from '@tanstack/react-query'
import { fetchIndices, fetchRankingHighlights, fetchRankingRows } from '@/services/api'

export function useIndices() {
  return useQuery({ queryKey: ['indices'], queryFn: fetchIndices, staleTime: 10_000 })
}

export function useRankingHighlights() {
  return useQuery({ queryKey: ['ranking', 'highlights'], queryFn: fetchRankingHighlights, staleTime: 60_000 })
}

export function useRankingRows() {
  return useQuery({ queryKey: ['ranking', 'rows'], queryFn: fetchRankingRows, staleTime: 60_000 })
}
