import { useEffect, useRef } from 'react'
import { useAuctionStore } from '../stores/auctionStore'

const WS_BASE = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8001'

export function useAuctionWebSocket(auctionId: string) {
  const { handleWsMessage, setWsStatus } = useAuctionStore()
  const wsRef = useRef<WebSocket | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let unmounted = false

    const connect = (delay = 0) => {
      if (unmounted) return
      timerRef.current = setTimeout(() => {
        if (unmounted) return

        setWsStatus('connecting')
        const ws = new WebSocket(`${WS_BASE}/ws/auction/${auctionId}`)
        wsRef.current = ws

        ws.onopen = () => {
          if (!unmounted) setWsStatus('connected')
        }

        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data)
            handleWsMessage(msg)
          } catch {
            // ignore malformed messages
          }
        }

        ws.onclose = () => {
          if (!unmounted) {
            setWsStatus('reconnecting')
            connect(3000)
          }
        }

        ws.onerror = () => {
          ws.close()
        }
      }, delay)
    }

    // Defer by one tick — StrictMode's synchronous cleanup can cancel this
    // before the WebSocket is ever created, preventing abandoned connections.
    connect(0)

    return () => {
      unmounted = true
      if (timerRef.current) clearTimeout(timerRef.current)
      const ws = wsRef.current
      if (ws) {
        ws.onopen = null
        ws.onmessage = null
        ws.onclose = null
        ws.onerror = null
        ws.close()
        wsRef.current = null
      }
      setWsStatus('disconnected')
    }
  }, [auctionId, handleWsMessage, setWsStatus])
}
