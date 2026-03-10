import type { FC } from 'react'
import type { AuctionListItem } from '../../hooks/useAuctionList'

type Filter = 'all' | 'ACTIVE' | 'CLOSING' | 'SCHEDULED' | 'CLOSED'

interface AuctionFilterTabsProps {
  activeFilter: Filter
  onFilter: (f: Filter) => void
  auctions: AuctionListItem[]
}

const TABS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'CLOSING', label: 'Closing' },
  { key: 'SCHEDULED', label: 'Scheduled' },
  { key: 'CLOSED', label: 'Closed' },
]

export const AuctionFilterTabs: FC<AuctionFilterTabsProps> = ({ activeFilter, onFilter, auctions }) => {
  const counts: Record<Filter, number> = {
    all: auctions.length,
    ACTIVE: auctions.filter((a) => a.status === 'ACTIVE').length,
    CLOSING: auctions.filter((a) => a.status === 'CLOSING').length,
    SCHEDULED: auctions.filter((a) => a.status === 'SCHEDULED').length,
    CLOSED: auctions.filter((a) => a.status === 'CLOSED').length,
  }

  return (
    <div className="flex gap-1">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onFilter(tab.key)}
          className={`rounded px-3 py-1.5 text-sm transition-colors ${
            activeFilter === tab.key
              ? 'bg-zinc-800 font-semibold text-zinc-50'
              : 'text-zinc-400 hover:text-zinc-50'
          }`}
        >
          {tab.label}{' '}
          <span className="text-zinc-600">{counts[tab.key]}</span>
        </button>
      ))}
    </div>
  )
}
