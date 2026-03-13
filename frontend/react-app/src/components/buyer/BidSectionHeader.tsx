import type { FC } from 'react'

interface Props {
  variant: 'winning' | 'outbid' | 'closed'
  count:   number
  expanded?: boolean
  onToggle?: () => void
}

export const BidSectionHeader: FC<Props> = ({ variant, count, expanded, onToggle }) => {
  if (variant === 'winning') {
    return (
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
        </span>
        <span className="text-xs font-bold tracking-widest text-green-400">ACTIVE &amp; WINNING</span>
        <span className="text-xs text-zinc-600">({count})</span>
      </div>
    )
  }

  if (variant === 'outbid') {
    return (
      <div className="flex items-center gap-2 mb-3 border-l-2 border-amber-500 pl-3">
        <span className="text-amber-400">⚠</span>
        <span className="text-xs font-bold tracking-widest text-amber-400">OUTBID</span>
        <span className="text-xs text-zinc-600">({count})</span>
      </div>
    )
  }

  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center gap-2 mb-3 text-left"
      aria-expanded={expanded}
    >
      <span className="text-xs font-bold tracking-widest text-zinc-500">CLOSED</span>
      <span className="text-xs text-zinc-600">({count})</span>
      <span className="ml-auto text-zinc-600 text-xs sm:hidden">
        {expanded ? '▲' : '▼'}
      </span>
    </button>
  )
}
