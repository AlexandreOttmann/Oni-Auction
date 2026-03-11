import type { FC } from 'react'

interface BidderCountProps {
  bidderCount: number
  watcherCount: number
}

export const BidderCount: FC<BidderCountProps> = ({ bidderCount, watcherCount }) => (
  <div className="flex items-center gap-4">
    {watcherCount > 0 && (
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-xs text-zinc-400">
          {watcherCount} watching
        </span>
      </div>
    )}
    {bidderCount > 0 && (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-zinc-600">
          {bidderCount} bidder{bidderCount !== 1 ? 's' : ''}
        </span>
      </div>
    )}
  </div>
)
