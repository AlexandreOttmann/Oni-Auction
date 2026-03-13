import type { FC } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import type { BuyerBidEntry } from '../../stores/buyerDashboardStore'
import { formatCurrency, formatCountdown } from '../../utils/time'

interface Props {
  entry: BuyerBidEntry
}

export const OutbidCard: FC<Props> = ({ entry }) => {
  const navigate = useNavigate()
  const msLeft = new Date(entry.ends_at).getTime() - Date.now()
  const diff = entry.current_price - entry.user_last_bid

  return (
    <motion.article
      layoutId={`bid-card-${entry.auction_id}`}
      className="w-full rounded-lg border border-red-900 border-l-4 border-l-red-600 bg-red-950/20 p-4 flex items-center gap-4"
      role="article"
      aria-label={`Outbid on: ${entry.title}`}
    >
      <span className="text-red-400 text-lg shrink-0">✗</span>

      <div className="flex-1 min-w-0">
        <p className="text-xs text-zinc-500 uppercase tracking-wider">{entry.auction_type}</p>
        <h3 className="text-sm font-semibold text-zinc-50 truncate">{entry.title}</h3>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="text-sm font-bold text-zinc-100 tabular-nums">
            {formatCurrency(entry.current_price)}
          </span>
          <span className="text-sm line-through text-red-400 tabular-nums">
            {formatCurrency(entry.user_last_bid)}
          </span>
          {diff > 0 && (
            <span className="text-xs text-amber-400">(+{formatCurrency(diff)} above yours)</span>
          )}
        </div>
      </div>

      <div className="shrink-0 flex flex-col items-end gap-2">
        <span className="text-xs text-zinc-500">
          {msLeft > 0 ? formatCountdown(msLeft) : 'Ended'}
        </span>
        <button
          onClick={() => navigate(`/auction/${entry.auction_id}`)}
          className="rounded bg-orange-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-orange-400 transition-colors"
          aria-label={`Re-bid on ${entry.title}`}
        >
          Re-Bid →
        </button>
      </div>
    </motion.article>
  )
}
