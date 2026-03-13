import type { FC } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

export const BuyerTopbar: FC = () => {
  const user = useAuthStore((s) => s.user)

  return (
    <header className="flex h-14 shrink-0 items-center border-b border-zinc-800 bg-zinc-900 px-4">
      <Link
        to="/"
        className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
      >
        ← Auction List
      </Link>

      <h1 className="absolute left-1/2 -translate-x-1/2 text-sm font-semibold text-zinc-50">
        My Bids
      </h1>

      <div className="ml-auto flex items-center gap-2">
        <span className="rounded-full bg-blue-950 px-2 py-0.5 text-[11px] font-semibold text-blue-400">
          BUYER
        </span>
        <span className="text-sm text-zinc-400">{user?.name ?? ''}</span>
      </div>
    </header>
  )
}
