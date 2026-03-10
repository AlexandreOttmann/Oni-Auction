import { type FC } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { AuctionType } from '../../tokens'

interface HeroPricePanelProps {
  auctionType: AuctionType
  currentPrice: number
  isWinning: boolean
  currentRound?: number
  priceFloor?: number
  endsAt?: string
}

export const HeroPricePanel: FC<HeroPricePanelProps> = ({
  auctionType,
  currentPrice,
  isWinning,
  currentRound,
  priceFloor,
}) => {
  const label = auctionType === 'ENGLISH' ? 'Current Bid' : 'Current Price'
  const priceColor = auctionType === 'ENGLISH' && isWinning ? 'text-green-400' : 'text-zinc-50'

  return (
    <div aria-live="polite">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">{label}</p>
      <AnimatePresence mode="popLayout">
        <motion.p
          key={currentPrice}
          className={`tabular-nums text-5xl font-extrabold leading-none ${priceColor}`}
          initial={{ y: -8, opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.15, ease: [0, 0, 0.2, 1] }}
        >
          ${currentPrice.toLocaleString()}
        </motion.p>
      </AnimatePresence>

      {auctionType === 'DUTCH' && (
        <div className="mt-2 flex items-center gap-4">
          {currentRound != null && (
            <p className="text-sm text-zinc-400">Round {currentRound}</p>
          )}
          {priceFloor != null && (
            <p className="text-xs text-zinc-600">Floor: ${priceFloor.toLocaleString()}</p>
          )}
        </div>
      )}
    </div>
  )
}
