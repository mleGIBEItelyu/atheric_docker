import { useState, useCallback } from 'react'
import { chatWithRAG, hasGeminiKey } from '@/services/rag'
import type { ChatMessage } from '@/services/rag'

export interface UseChatReturn {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  sendMessage: (text: string, activeTicker?: string) => Promise<void>
  clearMessages: () => void
  hasKey: boolean
}

const WELCOME_MESSAGE: ChatMessage = {
  role: 'model',
  text: 'Halo! Saya **Atheric AI Assistant**. Tanyakan apa saja tentang saham Indonesia - analisis, perbandingan, rekomendasi, atau penjelasan data yang ada di terminal ini.\n\nContoh:\n• "Analisis saham BBCA saat ini"\n• "Bandingkan BBRI dan BBCA"\n• "Saham apa yang paling direkomendasikan?"',
}

export function useRagChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(async (text: string, activeTicker?: string) => {
    if (!text.trim() || isLoading) return

    const userMsg: ChatMessage = { role: 'user', text: text.trim() }
    const updatedMessages = [...messages, userMsg]

    setMessages(updatedMessages)
    setIsLoading(true)
    setError(null)

    try {
      const historyForApi = updatedMessages.filter(m => m.text !== WELCOME_MESSAGE.text)
      const responseText = await chatWithRAG(historyForApi, activeTicker)

      const aiMsg: ChatMessage = { role: 'model', text: responseText }
      setMessages(prev => [...prev, aiMsg])
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Terjadi kesalahan'
      setError(errMsg)
      const errResponse: ChatMessage = {
        role: 'model',
        text: `Maaf, terjadi kesalahan: ${errMsg}`,
      }
      setMessages(prev => [...prev, errResponse])
    } finally {
      setIsLoading(false)
    }
  }, [messages, isLoading])

  const clearMessages = useCallback(() => {
    setMessages([WELCOME_MESSAGE])
    setError(null)
  }, [])

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    hasKey: hasGeminiKey(),
  }
}
