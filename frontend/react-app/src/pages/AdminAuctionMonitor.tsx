import { useParams } from 'react-router-dom'
import { AdminSidebar } from '../components/dashboard/AdminSidebar'
import { MonitorHeader } from '../components/monitor/MonitorHeader'
import { HeroPricePanelAdmin } from '../components/monitor/HeroPricePanelAdmin'
import { LiveBidFeed } from '../components/monitor/LiveBidFeed'
import { BidderCountChart } from '../components/monitor/BidderCountChart'
import { BidVelocityChart } from '../components/monitor/BidVelocityChart'
import { AdminActionsPanel } from '../components/monitor/AdminActionsPanel'
import { useMonitorStore } from '../stores/monitorStore'
import { useAuctionMonitor, useMonitorWebSocket } from '../hooks/useAuctionMonitor'

export default function AdminAuctionMonitor() {
  const { auction_id: auctionId = '' } = useParams<{ auction_id: string }>()

  useAuctionMonitor(auctionId)
  useMonitorWebSocket(auctionId)

  const {
    currentPrice, leader, endsAt, status, bidderCount, totalBids,
    feedItems, feedFilter, setFeedFilter, bidderCountSeries, velocityWindows, lastAction,
  } = useMonitorStore()

  return (
    <div className="flex h-screen overflow-hidden bg-[#09090B]">
      <AdminSidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <MonitorHeader
          title="Stainless Steel Coil 304"
          status={status}
          type="ENGLISH"
          auctionId={auctionId}
        />

        <div className="flex flex-1 overflow-hidden">
          {/* Left column */}
          <div className="w-[380px] shrink-0 flex flex-col gap-4 overflow-y-auto p-6 border-r border-zinc-800">
            <HeroPricePanelAdmin
              currentPrice={currentPrice}
              endsAt={endsAt}
              leader={leader}
              bidderCount={bidderCount}
              totalBids={totalBids}
            />

            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">
                Bidder Count
              </p>
              <BidderCountChart series={bidderCountSeries} />
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">
                Bid Velocity (30s windows)
              </p>
              <BidVelocityChart windows={velocityWindows} />
            </div>

            <AdminActionsPanel
              status={status}
              auctionId={auctionId}
              lastAction={lastAction}
            />
          </div>

          {/* Right column */}
          <div className="flex flex-1 flex-col overflow-y-auto p-6">
            <LiveBidFeed
              items={feedItems}
              filter={feedFilter}
              onFilter={setFeedFilter}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
