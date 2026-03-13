import type { FC } from 'react'
import { useNavigate } from 'react-router-dom'

export const EmptyBidsState: FC = () => {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-zinc-700 text-2xl text-zinc-600">
        ⚒
      </div>
      <div>
        <p className="text-sm font-medium text-zinc-300">No bids placed yet.</p>
        <p className="text-xs text-zinc-500 mt-1">Join an auction to start bidding.</p>
      </div>
      <button
        onClick={() => navigate('/')}
        className="rounded bg-orange-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-orange-400 transition-colors"
      >
        Browse Auctions →
      </button>
    </div>
  )
}
