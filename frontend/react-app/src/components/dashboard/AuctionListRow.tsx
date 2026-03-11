import { useState, useEffect, type FC } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import type { AuctionListItem, AuctionStatus } from '../../hooks/useAuctionList'
import { StatusBadge } from '../shared/StatusBadge'
import { AuctionTypeBadge } from '../shared/AuctionTypeBadge'
import { CountdownTimer } from '../shared/CountdownTimer'
import { HeatBar } from './HeatBar'

interface AuctionListRowProps {
  auction: AuctionListItem
}

function getEffectiveStatus(auction: AuctionListItem): AuctionStatus {
  if (auction.status === 'CLOSED' || auction.status === 'SCHEDULED') return auction.status
  if (auction.ends_at && new Date(auction.ends_at).getTime() <= Date.now()) return 'CLOSED'
  return auction.status
}

export const AuctionListRow: FC<AuctionListRowProps> = ({ auction }) => {
  const navigate = useNavigate()
  const [status, setStatus] = useState<AuctionStatus>(() => getEffectiveStatus(auction))

  // Fire a one-shot timer to flip status → CLOSED exactly when ends_at passes
  useEffect(() => {
    const derived = getEffectiveStatus(auction)
    setStatus(derived)

    if (derived === 'CLOSED' || !auction.ends_at) return
    const remaining = new Date(auction.ends_at).getTime() - Date.now()
    if (remaining <= 0) return

    const timer = setTimeout(() => setStatus('CLOSED'), remaining)
    return () => clearTimeout(timer)
  }, [auction.ends_at, auction.status])

  const isClosing = status === 'CLOSING'
  const isLive = status === 'ACTIVE' || status === 'CLOSING'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0, 0, 0.2, 1] }}
      onClick={() => navigate(`/auction/${auction.auction_id}`)}
      className={`group flex h-[72px] cursor-pointer items-center gap-4 border-b border-zinc-800 px-5 transition-colors hover:bg-zinc-800/50
        ${isClosing ? 'border-l-2 border-l-amber-500' : ''}`}
    >
      {/* Status badge */}
      <div className="w-[110px] shrink-0">
        <StatusBadge status={status} />
      </div>

      {/* Lot title + meta */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-200">{auction.title}</p>
        <div className="mt-0.5 flex items-center gap-2">
          <AuctionTypeBadge type={auction.auction_type} size="xs" />
          {auction.bidder_count > 0 && (
            <span className="text-[11px] text-zinc-600">
              {auction.bidder_count} bidder{auction.bidder_count !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Current bid */}
      <div className="w-[110px] shrink-0 text-right">
        {auction.current_bid != null ? (
          <span className={`tabular-nums text-sm font-bold ${isLive ? 'text-green-400' : 'text-zinc-500'}`}>
            ${auction.current_bid.toLocaleString()}
          </span>
        ) : (
          <span className="text-sm text-zinc-600">—</span>
        )}
      </div>

      {/* Timer */}
      <div className="w-[100px] shrink-0 text-right text-sm">
        {auction.ends_at && status !== 'CLOSED' ? (
          <CountdownTimer
            endsAt={auction.ends_at}
            startsAt={auction.starts_at}
            status={status as 'SCHEDULED' | 'ACTIVE' | 'CLOSING'}
          />
        ) : (
          <span className="text-zinc-600">—</span>
        )}
      </div>

      {/* Heat bar */}
      <div className="flex w-8 shrink-0 items-center justify-center">
        {isLive && <HeatBar bidsPerMin={auction.bids_per_min} />}
      </div>

      {/* Arrow */}
      <motion.span
        className="shrink-0 text-sm text-zinc-600"
        variants={{ rest: { x: 0 }, hover: { x: 4 } }}
        initial="rest"
        animate="rest"
        whileHover="hover"
        transition={{ duration: 0.15 }}
      >
        →
      </motion.span>
    </motion.div>
  )
}
