import type { FC } from 'react'
import { formatCurrency, formatCountdown } from '../../utils/time'

interface Props {
  currentPrice: number
  endsAt:       string
  leader:       string | null
  bidderCount:  number
  totalBids:    number
}

export const HeroPricePanelAdmin: FC<Props> = ({
  currentPrice, endsAt, leader, bidderCount, totalBids
}) => {
  const msLeft = new Date(endsAt).getTime() - Date.now()

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-6 py-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Current Price</p>
      <p className="text-5xl font-extrabold tabular-nums text-zinc-50">
        {formatCurrency(currentPrice)}
      </p>
      <div className="mt-3 flex items-center gap-4 text-sm text-zinc-400">
        <span className="tabular-nums">
          {msLeft > 0 ? formatCountdown(msLeft) : 'Ended'}
        </span>
        <span className="text-zinc-700">·</span>
        <span>Leader: {leader ?? '—'}</span>
      </div>
      <p className="mt-1 text-xs text-zinc-600">
        {bidderCount} active bidders · {totalBids} total bids
      </p>
    </div>
  )
}
