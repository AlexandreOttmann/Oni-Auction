import type { FC } from 'react'
import { Link } from 'react-router-dom'

interface Props {
  title:      string
  status:     string
  type:       string
  auctionId:  string
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE:  'bg-green-950 text-green-400',
    CLOSING: 'bg-amber-950 text-amber-400 animate-pulse',
    CLOSED:  'bg-zinc-800 text-zinc-500',
    PAUSED:  'bg-violet-950 text-violet-400',
  }
  return (
    <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${map[status] ?? 'bg-zinc-800 text-zinc-500'}`}>
      {status}
    </span>
  )
}

export const MonitorHeader: FC<Props> = ({ title, status, type, auctionId }) => {
  return (
    <header className="sticky top-0 z-10 flex h-20 items-center gap-4 border-b border-zinc-800 bg-[#09090B] px-6">
      <Link
        to="/dashboard"
        className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
      >
        ← Auction Dashboard
      </Link>

      <div className="flex flex-1 items-center gap-3 min-w-0">
        <h1 className="text-xl font-bold text-zinc-50 truncate">{title}</h1>
        <StatusBadge status={status} />
        <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-500 uppercase">
          {type}
        </span>
      </div>

      <span className="shrink-0 font-mono text-xs text-zinc-600">{auctionId}</span>
    </header>
  )
}
