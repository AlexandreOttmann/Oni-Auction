import { useQuery } from '@tanstack/react-query'

export interface SellerAuction {
  id:            string
  title:         string
  lot_id:        string
  type:          'ENGLISH' | 'DUTCH'
  status:        'ACTIVE' | 'CLOSING' | 'SCHEDULED' | 'CLOSED'
  current_price: number
  bid_count:     number
  bidder_count:  number
  ends_at:       string
}

const MOCK_AUCTIONS: SellerAuction[] = [
  { id: 'a1', title: 'Stainless Steel Coil 304', lot_id: 'l1', type: 'ENGLISH', status: 'ACTIVE', current_price: 14200, bid_count: 12, bidder_count: 5, ends_at: new Date(Date.now() + 272000).toISOString() },
  { id: 'a2', title: 'Aluminum Extrusion 6061', lot_id: 'l2', type: 'ENGLISH', status: 'CLOSING', current_price: 6800, bid_count: 8, bidder_count: 3, ends_at: new Date(Date.now() + 47000).toISOString() },
  { id: 'a3', title: 'Carbon Fiber Roll 500M', lot_id: 'l3', type: 'DUTCH', status: 'SCHEDULED', current_price: 0, bid_count: 0, bidder_count: 0, ends_at: new Date(Date.now() + 7200000).toISOString() },
  { id: 'a4', title: 'Copper Wire Spool 1T', lot_id: 'l4', type: 'ENGLISH', status: 'CLOSED', current_price: 4100, bid_count: 7, bidder_count: 4, ends_at: new Date(Date.now() - 3600000).toISOString() },
]

export function useSellerAuctions() {
  return useQuery<SellerAuction[]>({
    queryKey: ['seller-auctions'],
    queryFn:  async () => {
      try {
        const res = await fetch('/api/auctions?mine=true', { credentials: 'include' })
        if (!res.ok) return MOCK_AUCTIONS
        const data = await res.json()
        return (data as SellerAuction[]).length > 0 ? data : MOCK_AUCTIONS
      } catch {
        return MOCK_AUCTIONS
      }
    },
  })
}
