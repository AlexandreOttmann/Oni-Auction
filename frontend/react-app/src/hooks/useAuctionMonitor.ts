import { useEffect } from 'react'
import { useMonitorStore, type FeedItem } from '../stores/monitorStore'
import { useAuctionWebSocket } from './useAuctionWebSocket'

const MOCK_FEED: FeedItem[] = [
  { bid_id: '1', timestamp: new Date(Date.now() - 30000).toISOString(), bidder: 'Bidder #3', amount: 14200, status: 'ACCEPTED' },
  { bid_id: '2', timestamp: new Date(Date.now() - 90000).toISOString(), bidder: 'Bidder #1', amount: 13900, status: 'REJECTED', reason: 'BELOW_MIN' },
  { bid_id: '3', timestamp: new Date(Date.now() - 120000).toISOString(), bidder: 'Bidder #2', amount: 14000, status: 'ACCEPTED' },
]

export function useAuctionMonitor(auctionId: string) {
  const store = useMonitorStore()

  useEffect(() => {
    store.reset()
    // Seed mock data
    useMonitorStore.setState({
      auctionId,
      currentPrice:  14200,
      leader:        'Bidder #3',
      endsAt:        new Date(Date.now() + 272000).toISOString(),
      status:        'ACTIVE',
      bidderCount:   5,
      totalBids:     3,
      feedItems:     MOCK_FEED,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auctionId])

  // Connect WS (uses existing hook, but we need to adapt the message handler)
  // We piggyback on useAuctionWebSocket but route messages to monitorStore
  useEffect(() => {
    const unsub = useMonitorStore.subscribe(() => {})
    return unsub
  }, [])
}

// Thin WS hook that feeds monitorStore
export function useMonitorWebSocket(auctionId: string) {
  // We reuse the pattern from useAuctionWebSocket but target monitorStore
  const handleWsMessage = useMonitorStore((s) => s.handleWsMessage)
  const WS_BASE = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8001'
  const lotId = useMonitorStore((s) => s.activeLotId) ?? auctionId

  useEffect(() => {
    let unmounted = false
    let ws: WebSocket | null = null
    let timer: ReturnType<typeof setTimeout> | null = null

    const connect = (delay = 0) => {
      if (unmounted) return
      timer = setTimeout(() => {
        if (unmounted) return
        ws = new WebSocket(`${WS_BASE}/ws/lot/${lotId}`)

        ws.onmessage = (e) => {
          try { handleWsMessage(JSON.parse(e.data)) } catch { /* ignore */ }
        }
        ws.onclose = () => {
          if (!unmounted) connect(Math.min(30000, 500 + Math.random() * 500))
        }
        ws.onerror = () => ws?.close()
      }, delay)
    }

    connect(0)

    return () => {
      unmounted = true
      if (timer) clearTimeout(timer)
      if (ws) { ws.onmessage = null; ws.onclose = null; ws.onerror = null; ws.close() }
    }
  }, [lotId, handleWsMessage, WS_BASE])
}
