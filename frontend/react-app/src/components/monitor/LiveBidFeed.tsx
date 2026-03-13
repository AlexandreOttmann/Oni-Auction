import { useRef, useEffect, useState, type FC } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { FeedItem } from '../../stores/monitorStore'
import { formatRelativeTime, formatCurrency } from '../../utils/time'

interface Props {
  items:     FeedItem[]
  filter:    'all' | 'accepted' | 'rejected'
  onFilter:  (f: 'all' | 'accepted' | 'rejected') => void
}

const bidEntryVariants = {
  hidden:  { opacity: 0, y: -8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.18 } },
  exit:    { opacity: 0 },
}

function StatusChip({ item }: { item: FeedItem }) {
  if (item.status === 'ACCEPTED') {
    return (
      <span className="rounded px-2 py-0.5 text-[10px] font-semibold bg-green-950 text-green-400">
        ✓ ACCEPTED
      </span>
    )
  }
  if (item.status === 'DLQ') {
    return (
      <span className="rounded px-2 py-0.5 text-[10px] font-semibold bg-orange-950 text-orange-400 border-l-2 border-l-orange-500">
        ⚠ DLQ
      </span>
    )
  }
  return (
    <span className="rounded px-2 py-0.5 text-[10px] font-semibold bg-red-950 text-red-400">
      ✗ {item.reason ?? 'REJECTED'}
    </span>
  )
}

export const LiveBidFeed: FC<Props> = ({ items, filter, onFilter }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [newCount, setNewCount]     = useState(0)
  const prevLenRef  = useRef(items.length)
  const VELOCITY_THRESHOLD = 10

  useEffect(() => {
    if (items.length > prevLenRef.current) {
      const added = items.length - prevLenRef.current
      setNewCount((c) => c + added)
    }
    prevLenRef.current = items.length
  }, [items.length])

  const filtered = filter === 'all' ? items
    : filter === 'accepted' ? items.filter((i) => i.status === 'ACCEPTED')
    : items.filter((i) => i.status !== 'ACCEPTED')

  const bidsPerMin = items.filter(
    (i) => Date.now() - new Date(i.timestamp).getTime() < 60000
  ).length

  const showBanner = bidsPerMin >= VELOCITY_THRESHOLD && newCount > 0

  return (
    <div className="flex flex-col rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <span className="text-sm font-semibold text-zinc-100">Live Bid Feed</span>
        <div className="flex gap-1" role="tablist">
          {(['all', 'accepted', 'rejected'] as const).map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              onClick={() => onFilter(f)}
              className={`rounded px-2 py-1 text-xs capitalize transition-colors ${
                filter === f
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* High velocity banner */}
      {showBanner && (
        <button
          onClick={() => {
            setNewCount(0)
            containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          className="sticky top-0 z-10 w-full bg-orange-500/20 border-b border-orange-500/30 py-1.5 text-center text-xs text-orange-400 hover:bg-orange-500/30 transition-colors"
        >
          ↓ {newCount} new bids
        </button>
      )}

      {/* Feed list */}
      <div
        ref={containerRef}
        className="max-h-[480px] overflow-y-auto"
        aria-live="polite"
        aria-label="Live bid feed"
      >
        {filtered.length === 0 && (
          <div className="flex items-center justify-center py-12 text-xs text-zinc-600">
            Waiting for first bid…
          </div>
        )}

        <AnimatePresence initial={false}>
          {filtered.map((item) => (
            <motion.div
              key={item.bid_id}
              variants={bidEntryVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex items-center gap-3 border-b border-zinc-800/50 px-4 py-2.5 hover:bg-zinc-800/30 transition-colors"
            >
              <span className="w-20 shrink-0 font-mono text-xs text-zinc-500">
                {formatRelativeTime(item.timestamp)}
              </span>
              <span className="w-24 shrink-0 text-xs text-zinc-400 truncate">{item.bidder}</span>
              <span className={`w-28 shrink-0 tabular-nums text-sm font-semibold ${item.status === 'ACCEPTED' ? 'text-green-400' : 'text-zinc-500'}`}>
                {formatCurrency(item.amount)}
              </span>
              <StatusChip item={item} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
