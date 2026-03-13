import type { FC } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { SellerAuction } from '../../hooks/useSellerAuctions'
import type { SellerAuctionState } from '../../stores/sellerStore'
import { formatCurrency, formatCountdown } from '../../utils/time'
import { AuctionDetailPanel } from './AuctionDetailPanel'

interface Props {
  auction:  SellerAuction
  expanded: boolean
  onToggle: () => void
  state?:   SellerAuctionState
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE:    'bg-green-950 text-green-400',
    CLOSING:   'bg-amber-950 text-amber-400',
    SCHEDULED: 'bg-violet-950 text-violet-400',
    CLOSED:    'bg-zinc-800 text-zinc-500',
  }
  return (
    <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${map[status] ?? 'bg-zinc-800 text-zinc-500'}`}>
      {status}
    </span>
  )
}

const emptyState: SellerAuctionState = {
  currentPrice: 0, bidCount: 0, bidderCount: 0, bidHistory: [],
  bidsPerMin: 0, status: 'ACTIVE', endsAt: '', wsStatus: 'disconnected',
}

export const AuctionSummaryRow: FC<Props> = ({ auction, expanded, onToggle, state }) => {
  const msLeft = new Date(auction.ends_at).getTime() - Date.now()
  const isClosing = auction.status === 'CLOSING'
  const panelState = state ?? emptyState

  return (
    <div className={`border border-zinc-800 rounded-lg overflow-hidden ${isClosing ? 'border-l-2 border-l-amber-500' : ''}`}>
      <button
        onClick={onToggle}
        className="flex h-[72px] w-full items-center gap-3 px-4 bg-zinc-900 hover:bg-zinc-800/60 transition-colors text-left"
        aria-expanded={expanded}
        aria-controls={`detail-${auction.id}`}
      >
        <div className="w-[110px] shrink-0">
          <StatusBadge status={auction.status} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-100 truncate">{auction.title}</p>
          <span className="text-[10px] text-zinc-600 font-semibold uppercase">{auction.type}</span>
        </div>

        <div className="w-[120px] shrink-0 text-right">
          <span className="tabular-nums text-zinc-400 text-sm">
            {auction.current_price > 0 ? formatCurrency(auction.current_price) : '—'}
          </span>
        </div>

        <div className="w-[140px] shrink-0 text-right">
          <span className="text-xs text-zinc-500">
            {auction.bid_count} bids · {auction.bidder_count} bidders
          </span>
        </div>

        <div className="w-[90px] shrink-0 text-right tabular-nums text-xs text-zinc-400">
          {auction.status === 'CLOSED' ? 'Closed' : msLeft > 0 ? formatCountdown(msLeft) : '0:00'}
        </div>

        <span className="w-8 shrink-0 text-center text-zinc-600 text-sm">
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id={`detail-${auction.id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <AuctionDetailPanel state={panelState} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
