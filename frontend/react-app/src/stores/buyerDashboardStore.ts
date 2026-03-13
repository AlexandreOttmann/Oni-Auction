import { create } from 'zustand'

export interface BuyerBidEntry {
  auction_id:      string
  title:           string
  lot_id:          string
  auction_type:    'ENGLISH' | 'DUTCH'
  status:          'ACTIVE' | 'CLOSING' | 'CLOSED' | 'SCHEDULED'
  user_bid_status: 'winning' | 'outbid' | 'closed_won' | 'closed_lost' | 'closed_no_winner'
  user_last_bid:   number
  current_price:   number
  ends_at:         string
  final_price?:    number
  closed_at?:      string
  ws_status:       'connecting' | 'connected' | 'reconnecting' | 'disconnected'
  bidder_count?:   number
}

interface BuyerDashboardStore {
  entries:           BuyerBidEntry[]
  closedExpanded:    boolean
  setClosedExpanded: (v: boolean) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleWsMessage:   (auctionId: string, msg: any) => void
  setEntries:        (entries: BuyerBidEntry[]) => void
  updateEntry:       (auctionId: string, patch: Partial<BuyerBidEntry>) => void
}

export const useBuyerDashboardStore = create<BuyerDashboardStore>((set) => ({
  entries:        [],
  closedExpanded: false,

  setClosedExpanded: (v) => set({ closedExpanded: v }),

  setEntries: (entries) => set({ entries }),

  updateEntry: (auctionId, patch) =>
    set((state) => ({
      entries: state.entries.map((e) =>
        e.auction_id === auctionId ? { ...e, ...patch } : e,
      ),
    })),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleWsMessage: (auctionId: string, msg: any) => {
    const type: string = msg.type ?? msg.event_type ?? ''
    set((state) => ({
      entries: state.entries.map((e) => {
        if (e.auction_id !== auctionId) return e
        switch (type) {
          case 'BID_ACCEPTED': {
            const isOwn = msg.leader === e.auction_id // simplified
            return {
              ...e,
              current_price: msg.highest_bid ?? e.current_price,
              bidder_count:  msg.bid_count ?? e.bidder_count,
              ends_at:       msg.lot_ends_at ?? e.ends_at,
              user_bid_status: isOwn ? 'winning' : e.user_bid_status === 'winning' ? 'outbid' : e.user_bid_status,
            }
          }
          case 'LOT_CLOSING':
            return { ...e, status: 'CLOSING' }
          case 'LOT_CLOSED':
            return {
              ...e,
              status:          'CLOSED',
              final_price:     msg.final_price ?? e.current_price,
              closed_at:       msg.timestamp ?? new Date().toISOString(),
              user_bid_status: e.user_bid_status === 'winning' ? 'closed_won' : 'closed_lost',
            }
          case 'LOT_EXTENDED':
            return { ...e, status: 'ACTIVE', ends_at: msg.ends_at ?? e.ends_at }
          default:
            return e
        }
      }),
    }))
  },
}))
