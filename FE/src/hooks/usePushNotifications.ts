import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchNotificationsApi, type NotificationItem } from '@/services/api'
import { useAuth } from '@/context/AuthContext'

const NOTIFIED_KEY = 'atheric_notified_ids'

function getNotifiedIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(NOTIFIED_KEY)
    if (raw) return new Set(JSON.parse(raw))
  } catch {}
  return new Set()
}

function saveNotifiedId(id: string | number) {
  try {
    const current = getNotifiedIds()
    current.add(String(id))
    sessionStorage.setItem(NOTIFIED_KEY, JSON.stringify(Array.from(current)))
  } catch {}
}

export function usePushNotificationWatcher() {
  const { isAuthenticated } = useAuth()
  const initializedRef = useRef(false)

  const { data: notifications = [] } = useQuery<NotificationItem[]>({
    queryKey: ['notifications'],
    queryFn: fetchNotificationsApi,
    enabled: isAuthenticated,
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000,
  })

  useEffect(() => {
    if (!isAuthenticated || !notifications || notifications.length === 0) return

    const notifiedSet = getNotifiedIds()

    // On first mount, register existing read notifications to prevent blast
    if (!initializedRef.current) {
      notifications.forEach(n => {
        if (n.read) notifiedSet.add(String(n.id))
      })
      sessionStorage.setItem(NOTIFIED_KEY, JSON.stringify(Array.from(notifiedSet)))
      initializedRef.current = true
    }

    const canPush = typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'

    notifications.forEach(n => {
      const idStr = String(n.id)
      if (!n.read && !notifiedSet.has(idStr)) {
        saveNotifiedId(n.id)
        notifiedSet.add(idStr)

        if (canPush) {
          try {
            const cleanTitle = n.title
              .replace(/genesis ai v2\.0\s*\(.*?\)/gi, 'Model AI v2.0')
              .replace(/genesis/gi, 'Model AI')
            const cleanBody = n.body.replace(/genesis/gi, 'Generative AI')

            new Notification(cleanTitle, {
              body: cleanBody,
              icon: '/favicon.ico',
              badge: '/favicon.ico',
              tag: `atheric-notif-${n.id}`,
            })
          } catch (e) {
            console.warn('[Push Notification] Failed to trigger notification:', e)
          }
        }
      }
    })
  }, [notifications, isAuthenticated])
}
