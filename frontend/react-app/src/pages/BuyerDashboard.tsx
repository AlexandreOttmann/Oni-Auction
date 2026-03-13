import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useBuyerDashboardStore } from '../stores/buyerDashboardStore'
import { useMyBids } from '../hooks/useMyBids'
import { useMultiAuctionWebSocket } from '../hooks/useMultiAuctionWebSocket'
import { BuyerTopbar } from '../components/buyer/BuyerTopbar'
import { BidSectionHeader } from '../components/buyer/BidSectionHeader'
import { WinningCard } from '../components/buyer/WinningCard'
import { OutbidCard } from '../components/buyer/OutbidCard'
import { ClosedRow } from '../components/buyer/ClosedRow'
import { EmptyBidsState } from '../components/buyer/EmptyBidsState'

export default function BuyerDashboard() {
  const { entries, closedExpanded, setClosedExpanded, handleWsMessage, setEntries } = useBuyerDashboardStore()
  const { data } = useMyBids()

  useEffect(() => {
    if (data) setEntries(data)
  }, [data, setEntries])

  const activeTargets = entries
    .filter((e) => e.status === 'ACTIVE' || e.status === 'CLOSING')
    .map((e) => ({ auctionId: e.auction_id, lotId: e.lot_id }))

  useMultiAuctionWebSocket(activeTargets, handleWsMessage)

  const winning = [...entries]
    .filter((e) => e.user_bid_status === 'winning')
    .sort((a, b) => new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime())

  const outbid = [...entries]
    .filter((e) => e.user_bid_status === 'outbid')
    .sort((a, b) => new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime())

  const closed = [...entries]
    .filter((e) => ['closed_won', 'closed_lost', 'closed_no_winner'].includes(e.user_bid_status))
    .sort((a, b) => new Date(b.closed_at ?? b.ends_at).getTime() - new Date(a.closed_at ?? a.ends_at).getTime())

  const isEmpty = entries.length === 0

  return (
    <div className="flex min-h-screen flex-col bg-[#09090B]">
      <BuyerTopbar />

      <main className="flex-1 px-4 py-6 max-w-5xl mx-auto w-full">
        {isEmpty ? (
          <EmptyBidsState />
        ) : (
          <div className="flex flex-col gap-8">
            {/* Winning */}
            {winning.length > 0 && (
              <section aria-label="Winning bids">
                <BidSectionHeader variant="winning" count={winning.length} />
                <div className="flex flex-wrap gap-4">
                  <AnimatePresence>
                    {winning.map((e) => (
                      <WinningCard key={e.auction_id} entry={e} />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}

            {/* Outbid */}
            {outbid.length > 0 && (
              <section aria-label="Outbid auctions">
                <BidSectionHeader variant="outbid" count={outbid.length} />
                <div className="flex flex-col gap-3">
                  <AnimatePresence>
                    {outbid.map((e) => (
                      <OutbidCard key={e.auction_id} entry={e} />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}

            {/* Closed */}
            {closed.length > 0 && (
              <section aria-label="Closed auctions">
                <BidSectionHeader
                  variant="closed"
                  count={closed.length}
                  expanded={closedExpanded}
                  onToggle={() => setClosedExpanded(!closedExpanded)}
                />
                <motion.div
                  initial={false}
                  animate={{ height: 'auto' }}
                  className="overflow-hidden"
                >
                  <ClosedRow
                    entries={closed}
                    expanded={closedExpanded}
                    onToggleAll={() => setClosedExpanded(!closedExpanded)}
                  />
                </motion.div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
