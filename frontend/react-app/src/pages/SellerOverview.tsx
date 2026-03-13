import { useSellerStore } from '../stores/sellerStore'
import { useSellerAuctions } from '../hooks/useSellerAuctions'
import { SellerTopbar } from '../components/seller/SellerTopbar'
import { StatusSummaryChip } from '../components/seller/StatusSummaryChip'
import { AuctionSummaryRow } from '../components/seller/AuctionSummaryRow'

const STATUS_ORDER = ['CLOSING', 'ACTIVE', 'SCHEDULED', 'CLOSED']

export default function SellerOverview() {
  const { data: auctions = [], isLoading } = useSellerAuctions()
  const { expandedAuctionId, setExpanded, auctionStates } = useSellerStore()

  const sorted = [...auctions].sort((a, b) => {
    return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
  })

  return (
    <div className="flex min-h-screen flex-col bg-[#09090B]">
      <SellerTopbar />

      <main className="flex-1 px-4 py-6 max-w-5xl mx-auto w-full">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-100">My Auctions</h2>
          {auctions.length > 0 && <StatusSummaryChip auctions={auctions} />}
        </div>

        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[72px] rounded-lg bg-zinc-800 animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-zinc-700 text-2xl text-zinc-600">
              ⚒
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-300">No auctions yet.</p>
              <p className="text-xs text-zinc-500 mt-1">Your auctions will appear here once created by an admin.</p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {sorted.map((auction) => (
            <AuctionSummaryRow
              key={auction.id}
              auction={auction}
              expanded={expandedAuctionId === auction.id}
              onToggle={() => setExpanded(expandedAuctionId === auction.id ? null : auction.id)}
              state={auctionStates[auction.id]}
            />
          ))}
        </div>
      </main>
    </div>
  )
}
