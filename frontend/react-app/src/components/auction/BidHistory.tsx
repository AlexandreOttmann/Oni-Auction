import type { FC } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { BidEntry } from '../../stores/auctionStore'

interface BidHistoryProps {
  bids: BidEntry[]
  userBidStatus: string
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export const BidHistory: FC<BidHistoryProps> = ({ bids, userBidStatus }) => {
  if (bids.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-zinc-600">
        No bids yet — be the first.
      </p>
    )
  }

  const isWinning = userBidStatus === 'winning' || userBidStatus === 'closed_won'

  return (
    <div className="max-h-[320px] overflow-y-auto space-y-0.5">
      <AnimatePresence initial={false}>
        {bids.map((bid, i) => {
          const ownBg = bid.isOwn
            ? isWinning && i === 0
              ? 'bg-green-950/50'
              : bid.isOwn
              ? 'bg-red-950/30'
              : ''
            : ''

          return (
            <motion.div
              key={`${bid.timestamp}-${bid.amount}`}
              layout
              initial={i === 0 ? { opacity: 0, y: -8 } : { opacity: 1 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, ease: [0, 0, 0.2, 1] }}
              className={`flex items-baseline gap-3 rounded px-3 py-2 ${ownBg}`}
            >
              <span
                className={`tabular-nums text-lg font-bold ${
                  bid.isOwn
                    ? isWinning && i === 0
                      ? 'text-green-400'
                      : 'text-red-400'
                    : 'text-zinc-200'
                }`}
              >
                ${bid.amount.toLocaleString()}
              </span>
              <span className={`text-sm ${bid.isOwn ? 'font-semibold text-zinc-300' : 'text-zinc-500'}`}>
                {bid.bidder}
              </span>
              <span className="ml-auto text-xs text-zinc-600">{formatTime(bid.timestamp)}</span>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
