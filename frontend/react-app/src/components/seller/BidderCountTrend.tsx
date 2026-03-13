import type { FC } from 'react'

interface Props {
  count:   number
  prevCount?: number
}

export const BidderCountTrend: FC<Props> = ({ count, prevCount }) => {
  const trend = prevCount == null ? 0 : count - prevCount
  const dots  = Math.min(count, 10)

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-wrap gap-1" aria-label={`${count} bidders`}>
        {Array.from({ length: dots }).map((_, i) => (
          <span
            key={i}
            className="inline-block h-2 w-2 rounded-full bg-violet-500"
          />
        ))}
        {count > 10 && (
          <span className="text-xs text-zinc-500">+{count - 10}</span>
        )}
      </div>
      <span className="text-sm font-semibold text-zinc-200">{count}</span>
      {trend > 0 && <span className="text-xs text-green-400">▲</span>}
      {trend < 0 && <span className="text-xs text-red-400">▼</span>}
      {trend === 0 && <span className="text-xs text-zinc-600">—</span>}
    </div>
  )
}
