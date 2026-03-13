import { create } from 'zustand'

export interface SellerAuctionState {
  currentPrice:  number
  bidCount:      number
  bidderCount:   number
  bidHistory:    Array<{ amount: number; timestamp: string }>
  bidsPerMin:    number
  status:        string
  endsAt:        string
  wsStatus:      'connecting' | 'connected' | 'reconnecting' | 'disconnected'
}

interface SellerStore {
  expandedAuctionId: string | null
  setExpanded:       (id: string | null) => void
  auctionStates:     Record<string, SellerAuctionState>
  updateAuctionState: (auctionId: string, patch: Partial<SellerAuctionState>) => void
}

export const useSellerStore = create<SellerStore>((set) => ({
  expandedAuctionId: null,
  auctionStates:     {},

  setExpanded: (id) => set({ expandedAuctionId: id }),

  updateAuctionState: (auctionId, patch) =>
    set((state) => ({
      auctionStates: {
        ...state.auctionStates,
        [auctionId]: {
          currentPrice: 0,
          bidCount:     0,
          bidderCount:  0,
          bidHistory:   [],
          bidsPerMin:   0,
          status:       'ACTIVE',
          endsAt:       '',
          wsStatus:     'disconnected',
          ...state.auctionStates[auctionId],
          ...patch,
        },
      },
    })),
}))
