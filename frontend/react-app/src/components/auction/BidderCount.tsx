import type { FC } from 'react'

interface BidderCountProps {
  count: number
}

export const BidderCount: FC<BidderCountProps> = ({ count }) => {
  if (count === 0) return null
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full bg-green-400" />
      <span className="text-xs text-zinc-400">
        {count} bidder{count !== 1 ? 's' : ''} watching
      </span>
    </div>
  )
}
