import { useEffect, useRef } from 'react'

const WS_BASE = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8001'

interface AuctionTarget {
  auctionId: string
  lotId:     string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useMultiAuctionWebSocket(targets: AuctionTarget[], onMessage: (auctionId: string, msg: any) => void) {
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  useEffect(() => {
    if (targets.length === 0) return

    const connections: Array<{ ws: WebSocket | null; timer: ReturnType<typeof setTimeout> | null; unmounted: boolean }> =
      targets.map(() => ({ ws: null, timer: null, unmounted: false }))

    targets.forEach((target, i) => {
      const conn = connections[i]

      const connect = (delay = 0) => {
        if (conn.unmounted) return
        conn.timer = setTimeout(() => {
          if (conn.unmounted) return

          const ws = new WebSocket(`${WS_BASE}/ws/lot/${target.lotId}`)
          conn.ws = ws

          ws.onmessage = (e) => {
            try {
              const msg = JSON.parse(e.data)
              onMessageRef.current(target.auctionId, msg)
            } catch {
              // ignore malformed
            }
          }

          ws.onclose = () => {
            if (!conn.unmounted) {
              // exponential backoff: 500ms base, 30s cap, +jitter
              const retryDelay = Math.min(30000, 500 * 2 + Math.random() * 500)
              connect(retryDelay)
            }
          }

          ws.onerror = () => {
            ws.close()
          }
        }, delay)
      }

      connect(0)
    })

    return () => {
      connections.forEach((conn) => {
        conn.unmounted = true
        if (conn.timer) clearTimeout(conn.timer)
        if (conn.ws) {
          conn.ws.onopen    = null
          conn.ws.onmessage = null
          conn.ws.onclose   = null
          conn.ws.onerror   = null
          conn.ws.close()
          conn.ws = null
        }
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targets.map((t) => t.lotId).join(',')])
}
