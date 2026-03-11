import { create } from 'zustand'
import { useAuthStore } from './authStore'

export interface BidEntry {
  amount: number
  bidder: string
  timestamp: string
  isOwn: boolean
}

export type WsStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected'
export type UserBidStatus = 'winning' | 'losing' | 'neutral' | 'closed_won' | 'closed_lost'

interface AuctionStore {
  auctionId: string | null
  lotId: string | null
  title: string
  auctionType: 'ENGLISH' | 'DUTCH'
  status: 'SCHEDULED' | 'ACTIVE' | 'CLOSING' | 'CLOSED'
  currentPrice: number
  priceFloor?: number
  leader: string | null
  endsAt: string
  bidHistory: BidEntry[]
  bidderCount: number
  watcherCount: number
  currentRound?: number
  userBidStatus: UserBidStatus
  userLastBid: number | null
  wsStatus: WsStatus
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleWsMessage: (msg: Record<string, any>) => void
  setWsStatus: (status: WsStatus) => void
  placeBid: (amount: number) => Promise<void>
}

export const useAuctionStore = create<AuctionStore>((set, get) => ({
  auctionId: null,
  lotId: null,
  title: '',
  auctionType: 'ENGLISH',
  status: 'SCHEDULED',
  currentPrice: 0,
  priceFloor: undefined,
  leader: null,
  endsAt: '',
  bidHistory: [],
  bidderCount: 0,
  watcherCount: 0,
  userBidStatus: 'neutral',
  userLastBid: null,
  wsStatus: 'disconnected',

  setWsStatus: (wsStatus) => set({ wsStatus }),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleWsMessage: (msg: Record<string, any>) => {
    const userId = useAuthStore.getState().user?.id ?? ''

    // Initial snapshot uses `type`; live events use `event_type`
    const type: string = msg.type ?? msg.event_type ?? ''

    switch (type) {
      // ── Initial state snapshot (sent on WS connect) ─────────────────────
      case 'AUCTION_STATE': {
        // English uses highest_bid; Dutch uses current_price
        const currentPrice: number = msg.current_price ?? msg.highest_bid ?? 0

        const bidHistory: BidEntry[] = ((msg.bid_history as Record<string, unknown>[]) ?? []).map(
          (b) => ({
            amount: b.amount as number,
            bidder: b.user_id as string,
            timestamp: b.timestamp as string,
            isOwn: b.user_id === userId,
          }),
        )

        set({
          auctionId:    msg.auction_id as string,
          lotId:        msg.lot_id as string,
          title:        msg.title as string,
          auctionType:  msg.auction_type as 'ENGLISH' | 'DUTCH',
          status:       msg.status as AuctionStore['status'],
          currentPrice,
          priceFloor:   msg.price_floor as number | undefined,
          leader:       (msg.leader as string) || null,
          endsAt:       msg.ends_at as string,
          bidHistory,
          bidderCount:  (msg.bid_count as number) ?? 0,
          currentRound: msg.current_round as number | undefined,
          userBidStatus: msg.leader === userId ? 'winning' : 'neutral',
        })
        break
      }

      // ── New bid accepted ─────────────────────────────────────────────────
      case 'BID_ACCEPTED': {
        const leader      = msg.leader as string
        const highestBid  = msg.highest_bid as number
        const bidCount    = (msg.bid_count as number) ?? 0
        const lotEndsAt   = (msg.lot_ends_at as string) || get().endsAt
        const timestamp   = (msg.timestamp as string) || new Date().toISOString()
        const isOwn       = leader === userId

        set((state) => ({
          currentPrice: highestBid,
          leader,
          endsAt:       lotEndsAt,
          bidderCount:  bidCount,
          bidHistory: [
            { amount: highestBid, bidder: isOwn ? 'You' : leader, timestamp, isOwn },
            ...state.bidHistory,
          ],
          userBidStatus: isOwn
            ? 'winning'
            : state.userBidStatus === 'winning'
            ? 'losing'
            : state.userBidStatus,
          userLastBid: isOwn ? highestBid : state.userLastBid,
        }))
        break
      }

      // ── Lot entering soft-close window ───────────────────────────────────
      case 'LOT_CLOSING':
        set({ status: 'CLOSING' })
        break

      // ── Soft-close: end time extended ────────────────────────────────────
      case 'LOT_EXTENDED':
        set({ status: 'ACTIVE', endsAt: msg.ends_at as string })
        break

      // ── Lot closed (timer expiry or Dutch strike) ─────────────────────────
      case 'LOT_CLOSED': {
        const winner     = (msg.winner as string) || null
        const finalPrice = msg.final_price as number | null
        set((state) => ({
          status:       'CLOSED',
          currentPrice: finalPrice ?? state.currentPrice,
          leader:       winner,
          userBidStatus:
            winner === userId
              ? 'closed_won'
              : state.userBidStatus === 'winning' || state.userBidStatus === 'losing'
              ? 'closed_lost'
              : 'neutral',
        }))
        break
      }

      // ── Dutch: price dropped to next round ───────────────────────────────
      case 'DUTCH_ROUND_ADVANCED':
        set({
          currentPrice: msg.current_price as number,
          currentRound: msg.round_number as number,
        })
        break

      // ── Lot opened by timer (SCHEDULED → ACTIVE) ─────────────────────────
      case 'LOT_OPENED':
        set({ status: 'ACTIVE' })
        break

      // ── Live viewer count ─────────────────────────────────────────────────
      case 'WATCHER_COUNT':
        set({ watcherCount: msg.count as number })
        break
    }
  },

  placeBid: async (amount) => {
    const { auctionId, lotId } = get()
    const userId = useAuthStore.getState().user?.id ?? ''

    // Optimistic update
    set((state) => ({
      userBidStatus: 'winning',
      userLastBid: amount,
      bidHistory: [
        { amount, bidder: 'You', timestamp: new Date().toISOString(), isOwn: true },
        ...state.bidHistory,
      ],
    }))

    try {
      const res = await fetch('/api/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ auction_id: auctionId, lot_id: lotId, user_id: userId, amount }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
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
