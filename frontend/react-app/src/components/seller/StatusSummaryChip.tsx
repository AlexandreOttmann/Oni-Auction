import type { FC } from 'react'
import type { SellerAuction } from '../../hooks/useSellerAuctions'

interface Props {
  auctions: SellerAuction[]
}

export const StatusSummaryChip: FC<Props> = ({ auctions }) => {
  const active    = auctions.filter((a) => a.status === 'ACTIVE').length
  const closing   = auctions.filter((a) => a.status === 'CLOSING').length
  const closed    = auctions.filter((a) => a.status === 'CLOSED').length
  const scheduled = auctions.filter((a) => a.status === 'SCHEDULED').length

  const parts: React.ReactNode[] = []
  if (active)    parts.push(<span key="active">{active} active</span>)
  if (closing)   parts.push(<span key="closing" className="text-amber-400">{closing} closing</span>)
  if (scheduled) parts.push(<span key="scheduled">{scheduled} scheduled</span>)
  if (closed)    parts.push(<span key="closed">{closed} closed</span>)

  return (
    <p className="text-xs text-zinc-500">
      {parts.map((p, i) => (
        <span key={i}>
          {i > 0 && ' · '}
          {p}
        </span>
      ))}
    </p>
  )
}
