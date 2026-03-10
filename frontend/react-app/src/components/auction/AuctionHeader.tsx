import type { FC } from 'react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '../shared/StatusBadge'
import { AuctionTypeBadge } from '../shared/AuctionTypeBadge'
import type { AuctionStatus, AuctionType } from '../../tokens'

interface AuctionHeaderProps {
  title: string
  auctionType: AuctionType
  status: AuctionStatus
}

export const AuctionHeader: FC<AuctionHeaderProps> = ({ title, auctionType, status }) => (
  <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-zinc-800 bg-[#18181B] px-6">
    <Link to="/dashboard" className="mr-2 text-zinc-500 hover:text-zinc-300 transition-colors">
      ←
    </Link>
    <p className="flex-1 truncate text-sm font-semibold text-zinc-200">{title}</p>
    <AuctionTypeBadge type={auctionType} size="xs" />
    <StatusBadge status={status} />
  </header>
)
