import { create } from 'zustand'
import type { AuctionStatus } from '../tokens'

type FilterTab = 'all' | AuctionStatus

interface DashboardStore {
  activeFilter: FilterTab
  setFilter: (filter: FilterTab) => void
  showNewAuctionModal: boolean
  setShowNewAuctionModal: (show: boolean) => void
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  activeFilter: 'all',
  setFilter: (activeFilter) => set({ activeFilter }),
  showNewAuctionModal: false,
  setShowNewAuctionModal: (showNewAuctionModal) => set({ showNewAuctionModal }),
}))
