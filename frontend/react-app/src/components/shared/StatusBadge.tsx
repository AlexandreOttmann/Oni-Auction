import type { FC } from 'react'
import type { AuctionStatus } from '../../tokens'

interface StatusBadgeProps {
  status: AuctionStatus
}

const CONFIG: Record<AuctionStatus, { label: string; dot: string; classes: string; pulse?: boolean; fastPulse?: boolean }> = {
  ACTIVE:    { label: 'ACTIVE',   dot: 'bg-green-400', classes: 'bg-green-950 text-green-400', pulse: true },
  CLOSING:   { label: 'CLOSING',  dot: 'bg-amber-400', classes: 'bg-amber-950 text-amber-400', fastPulse: true },
  SCHEDULED: { label: 'SCHED.',   dot: 'bg-violet-400', classes: 'bg-violet-950 text-violet-400' },
  CLOSED:    { label: 'CLOSED',   dot: 'bg-zinc-500',  classes: 'bg-zinc-800 text-zinc-500' },
  DRAFT:     { label: 'DRAFT',    dot: 'bg-zinc-600',  classes: 'bg-zinc-900 text-zinc-600' },
  SETTLED:   { label: 'SETTLED',  dot: 'bg-zinc-500',  classes: 'bg-zinc-800 text-zinc-500' },
}

export const StatusBadge: FC<StatusBadgeProps> = ({ status }) => {
  const cfg = CONFIG[status]

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-widest ${cfg.classes}`}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${cfg.dot} ${cfg.fastPulse ? 'animate-[pulse_0.7s_ease-in-out_infinite]' : cfg.pulse ? 'animate-pulse' : ''}`}
      />
      {cfg.label}
    </span>
  )
}
