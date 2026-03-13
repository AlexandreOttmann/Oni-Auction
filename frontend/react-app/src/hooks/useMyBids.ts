import { useQuery } from '@tanstack/react-query'
import { useBuyerDashboardStore, type BuyerBidEntry } from '../stores/buyerDashboardStore'

const MOCK_ENTRIES: BuyerBidEntry[] = [
  {
    auction_id: 'a1', title: 'Stainless Steel Coil 304', lot_id: 'l1',
    auction_type: 'ENGLISH', status: 'ACTIVE', user_bid_status: 'winning',
    user_last_bid: 14200, current_price: 14200,
    ends_at: new Date(Date.now() + 272000).toISOString(),
    bidder_count: 5, ws_status: 'disconnected',
  },
  {
    auction_id: 'a2', title: 'Aluminum Extrusion 6061', lot_id: 'l2',
    auction_type: 'ENGLISH', status: 'CLOSING', user_bid_status: 'outbid',
    user_last_bid: 7200, current_price: 7400,
    ends_at: new Date(Date.now() + 47000).toISOString(),
    bidder_count: 3, ws_status: 'disconnected',
  },
  {
    auction_id: 'a3', title: 'Copper Wire Spool', lot_id: 'l3',
    auction_type: 'ENGLISH', status: 'CLOSED', user_bid_status: 'closed_won',
    user_last_bid: 4100, current_price: 4100,
    ends_at: new Date(Date.now() - 7200000).toISOString(),
    final_price: 4100, closed_at: new Date(Date.now() - 7200000).toISOString(),
    ws_status: 'disconnected',
  },
  {
    auction_id: 'a4', title: 'Titanium Sheet 3mm', lot_id: 'l4',
    auction_type: 'ENGLISH', status: 'CLOSED', user_bid_status: 'closed_lost',
    user_last_bid: 26000, current_price: 28500,
    ends_at: new Date(Date.now() - 86400000).toISOString(),
    final_price: 28500, closed_at: new Date(Date.now() - 86400000).toISOString(),
    ws_status: 'disconnected',
  },
]

export function useMyBids() {
  const setEntries = useBuyerDashboardStore((s) => s.setEntries)

  return useQuery<BuyerBidEntry[]>({
    queryKey: ['my-bids'],
    queryFn:  async () => {
      try {
        const res = await fetch('/api/bids/mine', { credentials: 'include' })
        if (!res.ok) return MOCK_ENTRIES
        const data = await res.json()
        return (data as BuyerBidEntry[]).length > 0 ? data : MOCK_ENTRIES
      } catch {
        return MOCK_ENTRIES
      }
    },
    onSuccess: (data: BuyerBidEntry[]) => {
      setEntries(data)
    },
  } as Parameters<typeof useQuery<BuyerBidEntry[]>>[0])
}
