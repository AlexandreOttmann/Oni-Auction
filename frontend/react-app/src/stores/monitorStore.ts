import { create } from 'zustand'

export interface FeedItem {
  bid_id:    string
  timestamp: string
  bidder:    string
  amount:    number
  status:    'ACCEPTED' | 'REJECTED' | 'DLQ'
  reason?:   string
}

interface MonitorStore {
  auctionId:          string | null
  activeLotId:        string | null
  setActiveLot:       (lotId: string) => void
  currentPrice:       number
  leader:             string | null
  endsAt:             string
  status:             string
  bidderCount:        number
  totalBids:          number
  feedItems:          FeedItem[]
  feedFilter:         'all' | 'accepted' | 'rejected'
  setFeedFilter:      (f: 'all' | 'accepted' | 'rejected') => void
  bidderCountSeries:  Array<{ time: number; count: number }>
  velocityWindows:    Array<{ windowStart: number; count: number }>
  wsStatus:           'connecting' | 'connected' | 'reconnecting' | 'disconnected'
  lastAction:         string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleWsMessage:    (msg: any) => void
  reset:              () => void
}

const initialState = {
  auctionId:         null,
  activeLotId:       null,
  currentPrice:      0,
  leader:            null,
  endsAt:            '',
  status:            'ACTIVE',
  bidderCount:       0,
  totalBids:         0,
  feedItems:         [] as FeedItem[],
  feedFilter:        'all' as const,
  bidderCountSeries: [] as Array<{ time: number; count: number }>,
  velocityWindows:   [] as Array<{ windowStart: number; count: number }>,
  wsStatus:          'disconnected' as const,
  lastAction:        null,
}

export const useMonitorStore = create<MonitorStore>((set, get) => ({
  ...initialState,

  setActiveLot: (lotId) => set({ activeLotId: lotId }),

  setFeedFilter: (f) => set({ feedFilter: f }),

  reset: () => set(initialState),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleWsMessage: (msg: any) => {
    const type: string = msg.type ?? msg.event_type ?? ''

    switch (type) {
      case 'AUCTION_STATE': {
        const price = msg.current_price ?? msg.highest_bid ?? 0
        set({
          auctionId:    msg.auction_id,
          currentPrice: price,
          leader:       msg.leader ?? null,
          endsAt:       msg.ends_at ?? '',
          status:       msg.status ?? 'ACTIVE',
          bidderCount:  msg.bid_count ?? 0,
          totalBids:    msg.bid_count ?? 0,
        })
        break
      }
      case 'BID_ACCEPTED': {
        const newItem: FeedItem = {
          bid_id:    msg.bid_id ?? crypto.randomUUID(),
          timestamp: msg.timestamp ?? new Date().toISOString(),
          bidder:    msg.leader ?? 'Unknown',
          amount:    msg.highest_bid ?? 0,
          status:    'ACCEPTED',
        }
        const now = Date.now()
        set((state) => ({
          currentPrice: msg.highest_bid ?? state.currentPrice,
          leader:       msg.leader ?? state.leader,
          endsAt:       msg.lot_ends_at ?? state.endsAt,
          bidderCount:  msg.bid_count ?? state.bidderCount,
          totalBids:    state.totalBids + 1,
          feedItems:    [newItem, ...state.feedItems],
          bidderCountSeries: [
            ...state.bidderCountSeries.slice(-60),
            { time: now, count: msg.bid_count ?? state.bidderCount },
          ],
          velocityWindows: computeVelocity([newItem, ...state.feedItems]),
        }))
        break
      }
      case 'BID_REJECTED': {
        const newItem: FeedItem = {
          bid_id:    msg.bid_id ?? crypto.randomUUID(),
          timestamp: msg.timestamp ?? new Date().toISOString(),
          bidder:    msg.bidder ?? 'Unknown',
          amount:    msg.amount ?? 0,
          status:    'REJECTED',
          reason:    msg.reason ?? 'REJECTED',
        }
        set((state) => ({ feedItems: [newItem, ...state.feedItems] }))
        break
      }
      case 'LOT_CLOSING':
        set({ status: 'CLOSING' })
        break
      case 'LOT_CLOSED':
        set({
          status:       'CLOSED',
          leader:       msg.winner ?? get().leader,
          currentPrice: msg.final_price ?? get().currentPrice,
        })
        break
      case 'LOT_EXTENDED':
        set({ status: 'ACTIVE', endsAt: msg.ends_at ?? get().endsAt })
        break
    }
  },
}))

function computeVelocity(feedItems: FeedItem[]): Array<{ windowStart: number; count: number }> {
  const now = Date.now()
  const windows: Array<{ windowStart: number; count: number }> = []
  for (let i = 19; i >= 0; i--) {
    const windowStart = now - (i + 1) * 30000
    const windowEnd = now - i * 30000
    const count = feedItems.filter((f) => {
      const t = new Date(f.timestamp).getTime()
      return t >= windowStart && t < windowEnd
    }).length
    windows.push({ windowStart, count })
  }
  return windows
}
