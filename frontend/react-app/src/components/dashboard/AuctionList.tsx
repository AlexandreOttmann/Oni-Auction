import type { FC } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { AuctionListItem } from '../../hooks/useAuctionList'
import { AuctionListRow } from './AuctionListRow'
import { useDashboardStore } from '../../stores/dashboardStore'

interface AuctionListProps {
  auctions: AuctionListItem[]
  isLoading: boolean
}

function SkeletonRow() {
  return (
    <div className="flex h-[72px] items-center gap-4 border-b border-zinc-800 px-5">
      <div className="h-6 w-24 rounded-full bg-zinc-800 animate-pulse" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-2/3 rounded bg-zinc-800 animate-pulse" />
        <div className="h-2.5 w-1/4 rounded bg-zinc-800 animate-pulse" />
      </div>
      <div className="h-4 w-16 rounded bg-zinc-800 animate-pulse" />
      <div className="h-4 w-12 rounded bg-zinc-800 animate-pulse" />
    </div>
  )
}

export const AuctionList: FC<AuctionListProps> = ({ auctions, isLoading }) => {
  const { setShowNewAuctionModal } = useDashboardStore()

  if (isLoading) {
    return (
      <div className="rounded-lg border border-zinc-800 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
      </div>
    )
  }

  if (auctions.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center gap-4 py-20 text-center"
      >
        <span className="text-5xl text-zinc-700">○</span>
        <p className="text-sm text-zinc-500">No auctions here.</p>
        <button
          onClick={() => setShowNewAuctionModal(true)}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:border-orange-500 hover:text-orange-500 transition-colors"
        >
          + Create your first auction
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div
      className="rounded-lg border border-zinc-800 overflow-hidden"
      layout
    >
      <AnimatePresence initial={false}>
        {auctions.map((auction, i) => (
          <motion.div
            key={auction.auction_id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, delay: Math.min(i, 7) * 0.04 }}
          >
            <AuctionListRow auction={auction} />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  )
}
