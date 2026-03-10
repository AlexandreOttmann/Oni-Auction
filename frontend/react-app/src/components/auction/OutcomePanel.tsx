import type { FC } from 'react'
import { motion } from 'motion/react'
import type { UserBidStatus } from '../../stores/auctionStore'

interface OutcomePanelProps {
  userBidStatus: UserBidStatus
  finalPrice: number
  userLastBid: number | null
  title: string
}

export const OutcomePanel: FC<OutcomePanelProps> = ({
  userBidStatus,
  finalPrice,
  userLastBid,
  title,
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.97 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.25 }}
    className={`rounded-xl border p-6 ${
      userBidStatus === 'closed_won'
        ? 'border-green-800 bg-green-950/50'
        : 'border-zinc-700 bg-zinc-800/50'
    }`}
  >
    {userBidStatus === 'closed_won' && (
      <>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl text-green-400">✓</span>
          <h3 className="text-lg font-bold text-green-400">You Won</h3>
        </div>
        <p className="text-sm text-zinc-300 mb-1">Final Price: <strong className="text-zinc-50 tabular-nums">${finalPrice.toLocaleString()}</strong></p>
        <p className="text-sm text-zinc-300 mb-3">Lot: {title}</p>
        <p className="text-xs text-zinc-500">The seller will contact you shortly.</p>
      </>
    )}

    {userBidStatus === 'closed_lost' && (
      <>
        <h3 className="text-base font-semibold text-zinc-300 mb-2">Auction Ended</h3>
        <p className="text-sm text-zinc-500 mb-1">Final Price: <span className="tabular-nums text-zinc-300">${finalPrice.toLocaleString()}</span></p>
        {userLastBid != null && (
          <p className="text-sm text-zinc-500">Your highest bid: <span className="tabular-nums text-zinc-400">${userLastBid.toLocaleString()}</span></p>
        )}
      </>
    )}

    {userBidStatus === 'neutral' && (
      <>
        <h3 className="text-base font-semibold text-zinc-400 mb-2">Auction Closed — No Winner</h3>
        <p className="text-sm text-zinc-600">Price reached floor without a buyer striking.</p>
      </>
    )}
  </motion.div>
)
