import { useEffect, useRef } from 'react'
import { useAuctionStore } from '../stores/auctionStore'

const WS_BASE = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8001'

export function useAuctionWebSocket(auctionId: string) {
  const { handleWsMessage, setWsStatus } = useAuctionStore()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let unmounted = false

    const connect = () => {
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
          reconnectTimeout.current = setTimeout(connect, 3000)
        }
      }

      ws.onerror = () => {
        ws.close()
      }
    }

    connect()

    return () => {
      unmounted = true
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current)
      wsRef.current?.close()
      setWsStatus('disconnected')
    }
  }, [auctionId, handleWsMessage, setWsStatus])
}
