import type { FC } from 'react'
import type { BuyerBidEntry } from '../../stores/buyerDashboardStore'
import { formatCurrency, formatRelativeTime } from '../../utils/time'

interface Props {
  entries:     BuyerBidEntry[]
  expanded:    boolean
  onToggleAll: () => void
}

const SHOW_COUNT = 5

function OutcomeBadge({ status }: { status: BuyerBidEntry['user_bid_status'] }) {
  if (status === 'closed_won') {
    return (
      <span className="rounded px-2 py-0.5 text-[11px] font-semibold bg-green-950 text-green-400">
        Won ✓
      </span>
    )
  }
  if (status === 'closed_no_winner') {
    return (
      <span className="rounded px-2 py-0.5 text-[11px] font-semibold bg-zinc-800 text-zinc-500">
        No winner
      </span>
    )
  }
  return (
    <span className="rounded px-2 py-0.5 text-[11px] font-semibold bg-zinc-800 text-zinc-500">
      Lost
    </span>
  )
}

export const ClosedRow: FC<Props> = ({ entries, expanded, onToggleAll }) => {
  const visible = expanded ? entries : entries.slice(0, SHOW_COUNT)
  const hasMore = entries.length > SHOW_COUNT

  return (
    <div className="flex flex-col gap-0.5">
      {visible.map((entry) => (
        <div
          key={entry.auction_id}
          className="flex h-11 items-center gap-3 rounded px-2 text-sm hover:bg-zinc-800/50 transition-colors"
          role="row"
        >
          <span className="flex-1 truncate text-zinc-300">{entry.title}</span>
          <OutcomeBadge status={entry.user_bid_status} />
          <span className="tabular-nums text-zinc-400 text-xs">
            Final: {formatCurrency(entry.final_price ?? entry.current_price)}
          </span>
          <span className="text-xs text-zinc-600 w-16 text-right">
            {entry.closed_at ? formatRelativeTime(entry.closed_at) : '—'}
          </span>
        </div>
      ))}

      {hasMore && (
        <button
          onClick={onToggleAll}
          className="mt-1 text-xs text-orange-500 hover:text-orange-400 text-left pl-2 transition-colors"
        >
          {expanded ? 'Show less' : `Show all ${entries.length}`}
        </button>
      )}
    </div>
  )
}
