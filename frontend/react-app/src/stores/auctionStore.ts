import { create } from 'zustand'

export interface BidEntry {
  amount: number
  bidder: string
  timestamp: string
  isOwn: boolean
}

export type WsStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected'
export type UserBidStatus = 'winning' | 'losing' | 'neutral' | 'closed_won' | 'closed_lost'

export interface WsMessage {
  type:
    | 'AUCTION_STATE'
    | 'BID_ACCEPTED'
    | 'BID_REJECTED'
    | 'AUCTION_CLOSING'
    | 'AUCTION_CLOSED'
    | 'DUTCH_ROUND'
  payload: Record<string, unknown>
}

interface AuctionStore {
  auctionId: string | null
  title: string
  auctionType: 'ENGLISH' | 'DUTCH'
  status: 'SCHEDULED' | 'ACTIVE' | 'CLOSING' | 'CLOSED'
  currentPrice: number
  leader: string | null
  endsAt: string
  bidHistory: BidEntry[]
  bidderCount: number
  currentRound?: number
  priceFloor?: number
  userId: string
  userBidStatus: UserBidStatus
  userLastBid: number | null
  wsStatus: WsStatus
  handleWsMessage: (msg: WsMessage) => void
  setWsStatus: (status: WsStatus) => void
  placeBid: (amount: number) => Promise<void>
}

export const useAuctionStore = create<AuctionStore>((set, get) => ({
  auctionId: null,
  title: '',
  auctionType: 'ENGLISH',
  status: 'SCHEDULED',
  currentPrice: 0,
  leader: null,
  endsAt: '',
  bidHistory: [],
  bidderCount: 0,
  userId: 'user-self',
  userBidStatus: 'neutral',
  userLastBid: null,
  wsStatus: 'disconnected',

  setWsStatus: (wsStatus) => set({ wsStatus }),

  handleWsMessage: (msg) => {
    const { userId } = get()
    switch (msg.type) {
      case 'AUCTION_STATE': {
        const p = msg.payload as {
          auction_id: string
          title: string
          auction_type: 'ENGLISH' | 'DUTCH'
          status: 'SCHEDULED' | 'ACTIVE' | 'CLOSING' | 'CLOSED'
          current_price: number
          leader: string | null
          ends_at: string
          bid_history: BidEntry[]
          bidder_count: number
          current_round?: number
          price_floor?: number
        }
        set({
          auctionId: p.auction_id,
          title: p.title,
          auctionType: p.auction_type,
          status: p.status,
          currentPrice: p.current_price,
          leader: p.leader,
          endsAt: p.ends_at,
          bidHistory: p.bid_history,
          bidderCount: p.bidder_count,
          currentRound: p.current_round,
          priceFloor: p.price_floor,
          userBidStatus: p.leader === userId ? 'winning' : 'neutral',
        })
        break
      }
      case 'BID_ACCEPTED': {
        const p = msg.payload as {
          amount: number
          bidder: string
          highest_bid: number
          bidder_count: number
          ends_at: string
        }
        const isOwn = p.bidder === userId
        set((state) => ({
          currentPrice: p.highest_bid,
          leader: p.bidder,
          endsAt: p.ends_at,
          bidderCount: p.bidder_count,
          bidHistory: [
            { amount: p.amount, bidder: isOwn ? 'You' : p.bidder, timestamp: new Date().toISOString(), isOwn },
            ...state.bidHistory,
          ],
          userBidStatus: isOwn ? 'winning' : state.userBidStatus === 'winning' ? 'losing' : state.userBidStatus,
          userLastBid: isOwn ? p.amount : state.userLastBid,
        }))
        break
      }
      case 'AUCTION_CLOSING':
        set({ status: 'CLOSING', endsAt: (msg.payload as { ends_at: string }).ends_at })
        break
      case 'AUCTION_CLOSED': {
        const p = msg.payload as { winner: string | null; final_price: number }
        set((state) => ({
          status: 'CLOSED',
          userBidStatus:
            p.winner === userId
              ? 'closed_won'
              : state.userBidStatus === 'winning' || state.userBidStatus === 'losing'
              ? 'closed_lost'
              : 'neutral',
        }))
        break
      }
      case 'DUTCH_ROUND': {
        const p = msg.payload as { current_price: number; round: number; next_drop_at: string }
        set({ currentPrice: p.current_price, currentRound: p.round, endsAt: p.next_drop_at })
        break
      }
    }
  },

  placeBid: async (amount) => {
    const { auctionId, userId } = get()
    set((state) => ({
      userBidStatus: 'winning', // optimistic
      userLastBid: amount,
      bidHistory: [
        { amount, bidder: 'You', timestamp: new Date().toISOString(), isOwn: true },
        ...state.bidHistory,
      ],
    }))
    try {
      const res = await fetch(`/api/auction/${auctionId}/bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ bidder_id: userId, amount }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Bid rejected')
      }
    } catch (e) {
      // Revert optimistic update
      set((state) => ({
        userBidStatus: 'losing',
        bidHistory: state.bidHistory.filter((b) => !(b.isOwn && b.amount === amount)),
      }))
      throw e
    }
  },
}))
