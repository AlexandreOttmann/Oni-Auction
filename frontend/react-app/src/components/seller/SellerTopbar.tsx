import type { FC } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useAuthStore } from '../../stores/authStore'

export const SellerTopbar: FC = () => {
  const { logout } = useAuth()
  const user = useAuthStore((s) => s.user)

  return (
    <header className="flex h-14 shrink-0 items-center border-b border-zinc-800 bg-zinc-900 px-5 relative">
      <div className="flex items-center gap-1.5">
        <span className="text-orange-500 font-bold font-mono">◆</span>
        <span className="text-sm font-bold tracking-tight font-mono text-zinc-50">ONI</span>
      </div>

      <p className="absolute left-1/2 -translate-x-1/2 text-sm font-semibold text-zinc-400">
        Auction Overview
      </p>

      <div className="ml-auto flex items-center gap-3">
        <span className="rounded-full bg-emerald-950 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
          SELLER
        </span>
        <span className="text-sm text-zinc-400">{user?.name ?? ''}</span>
        <button
          onClick={logout}
          className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  )
}
