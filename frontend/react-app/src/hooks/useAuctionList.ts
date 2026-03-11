import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { AuctionStatus, AuctionType } from '../tokens'

export type { AuctionStatus }

export interface AuctionListItem {
  auction_id: string
  title: string
  auction_type: AuctionType
  status: AuctionStatus
  current_bid?: number
  leader?: string
  starts_at?: string  // SCHEDULED auctions: when the auction opens
  ends_at?: string
  bidder_count: number
  bids_per_min: number
}

const fetchAuctions = async (): Promise<AuctionListItem[]> => {
  const res = await fetch('/api/auctions', { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch auctions')
  return res.json()
}

/**
 * Derive the display status from server status + ends_at.
 * ACTIVE/CLOSING auctions whose ends_at has passed are shown as CLOSED.
 * SCHEDULED auctions are left as-is — only the backend knows their start time.
 */
function deriveStatus(a: AuctionListItem): AuctionListItem {
  if (a.status === 'CLOSED' || a.status === 'SCHEDULED') return a
  if (a.ends_at && new Date(a.ends_at).getTime() <= Date.now()) return { ...a, status: 'CLOSED' }
  return a
}

export function useAuctionList() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['auctions'],
    queryFn: fetchAuctions,
    refetchInterval: 30_000,
    staleTime: 10_000,
    // Derive effective status from ends_at so KPI, filter tabs, and list rows
    // all see consistent statuses without each component duplicating the logic.
    select: (data) => data.map(deriveStatus),
    // Placeholder keeps the dashboard usable in local dev without backend.
    // Pass as a function so timestamps are computed fresh on each call.
    placeholderData: import.meta.env.DEV ? getMockAuctions : undefined,
  })

  const patchBid = (auctionId: string, highestBid: number) => {
    queryClient.setQueryData<AuctionListItem[]>(['auctions'], (prev) =>
      prev?.map((a) => (a.auction_id === auctionId ? { ...a, current_bid: highestBid } : a))
    )
  }

  return { ...query, patchBid }
}

// Mock data for local dev — called as a function so ends_at timestamps are always fresh
function getMockAuctions(): AuctionListItem[] {
  const t = (ms: number) => new Date(Date.now() + ms).toISOString()
  return [
    {
      auction_id: 'a1',
      title: 'Stainless Steel Coil 304 — 50 MT',
      auction_type: 'ENGLISH',
      status: 'ACTIVE',
      current_bid: 14200,
      leader: 'Bidder 3',
      ends_at: t(4 * 60 * 1000 + 32 * 1000),
      bidder_count: 7,
      bids_per_min: 8,
    },
    {
      auction_id: 'a2',
      title: 'Aluminum Extrusion 6061 — 200 KG',
      auction_type: 'DUTCH',
      status: 'CLOSING',
      current_bid: 6800,
      leader: 'Bidder 2',
      ends_at: t(47 * 1000),
      bidder_count: 4,
      bids_per_min: 14,
    },
    {
      auction_id: 'a3',
      title: 'Titanium Sheet Grade 5 — 10 MT',
      auction_type: 'ENGLISH',
      status: 'ACTIVE',
      current_bid: 28500,
      leader: 'Bidder 1',
      ends_at: t(12 * 60 * 1000 + 11 * 1000),
      bidder_count: 12,
      bids_per_min: 3,
    },
    {
      auction_id: 'a4',
      title: 'Carbon Fiber Roll — 500 M',
      auction_type: 'ENGLISH',
      status: 'SCHEDULED',
      starts_at: t(2 * 60 * 60 * 1000),         // opens in 2h
      ends_at: t(2 * 60 * 60 * 1000 + 30 * 60 * 1000), // closes 30min after open
      bidder_count: 0,
      bids_per_min: 0,
    },
    {
      auction_id: 'a5',
      title: 'Copper Wire Spool — 1T',
      auction_type: 'ENGLISH',
      status: 'CLOSED',
      current_bid: 4100,
      bidder_count: 6,
      bids_per_min: 0,
    },
    {
      auction_id: 'a6',
      title: 'High-Density Polyethylene Pellets — 5 MT',
      auction_type: 'DUTCH',
      status: 'ACTIVE',
      current_bid: 3200,
      ends_at: t(8 * 60 * 1000),
      bidder_count: 5,
      bids_per_min: 2,
    },
  ]
}
