import type { FC } from 'react'

interface Props {
  bidsPerMin: number
}

function heatLabel(bpm: number) {
  if (bpm <= 2)  return { label: 'Quiet',  color: 'bg-zinc-500' }
  if (bpm <= 6)  return { label: 'Active', color: 'bg-orange-500' }
  if (bpm <= 10) return { label: 'Hot',    color: 'bg-red-400' }
  return { label: 'Frenzy', color: 'bg-red-600' }
}

export const BidVelocityBar: FC<Props> = ({ bidsPerMin }) => {
  const { label, color } = heatLabel(bidsPerMin)
  const pct = Math.min(100, (bidsPerMin / 12) * 100)

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-400">{bidsPerMin.toFixed(1)} bids/min</span>
        <span className="text-zinc-500">{label}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-zinc-800">
        <div
          className={`h-2 rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={bidsPerMin}
          aria-valuemin={0}
          aria-valuemax={12}
        />
      </div>
    </div>
  )
}
