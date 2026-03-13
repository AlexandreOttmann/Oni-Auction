import type { FC } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import type { BuyerBidEntry } from '../../stores/buyerDashboardStore'
import { formatCurrency, formatCountdown } from '../../utils/time'

interface Props {
  entry: BuyerBidEntry
}

export const WinningCard: FC<Props> = ({ entry }) => {
  const navigate = useNavigate()
  const msLeft = new Date(entry.ends_at).getTime() - Date.now()

  return (
    <motion.article
      layoutId={`bid-card-${entry.auction_id}`}
      className="min-w-[280px] max-w-[400px] rounded-lg border border-zinc-800 border-l-4 border-l-green-600 bg-zinc-900 p-4 flex flex-col gap-3"
      role="article"
      aria-label={`Winning bid: ${entry.title}`}
    >
      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-wider">{entry.auction_type}</p>
        <h3 className="text-sm font-semibold text-zinc-50 mt-0.5">{entry.title}</h3>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Current Bid</p>
        <p className="text-2xl font-bold tabular-nums text-green-400">
          {formatCurrency(entry.current_price)}
        </p>
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>{msLeft > 0 ? formatCountdown(msLeft) : 'Ended'}</span>
        {entry.bidder_count != null && <span>{entry.bidder_count} bidders</span>}
      </div>

      <button
        onClick={() => navigate(`/auction/${entry.auction_id}`)}
        className="mt-auto self-start rounded border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500 hover:text-zinc-50 transition-colors"
        aria-label={`Watch auction ${entry.title}`}
      >
        Watch →
      </button>
    </motion.article>
  )
}
