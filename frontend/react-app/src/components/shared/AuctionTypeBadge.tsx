import type { FC } from 'react'
import type { AuctionType } from '../../tokens'

interface AuctionTypeBadgeProps {
  type: AuctionType
  size?: 'sm' | 'xs'
}

export const AuctionTypeBadge: FC<AuctionTypeBadgeProps> = ({ type, size = 'sm' }) => {
  const isEnglish = type === 'ENGLISH'
  const sizeClasses = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold tracking-wide ${sizeClasses} ${
        isEnglish
          ? 'bg-blue-950 text-blue-400'
          : 'bg-amber-950 text-amber-400'
      }`}
    >
      {type}
    </span>
  )
}
