import { useEffect, type FC } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useAuctionStore } from '../stores/auctionStore'
import { useAuctionWebSocket } from '../hooks/useAuctionWebSocket'
import { AuctionHeader } from '../components/auction/AuctionHeader'
import { HeroPricePanel } from '../components/auction/HeroPricePanel'
import { CountdownTimer } from '../components/shared/CountdownTimer'
import { BidderCount } from '../components/auction/BidderCount'
import { UserStatusBadge } from '../components/auction/UserStatusBadge'
import { BidInputPanel } from '../components/auction/BidInputPanel'
import { DutchStrikePanel } from '../components/auction/DutchStrikePanel'
import { BidHistory } from '../components/auction/BidHistory'
import { LotDetails } from '../components/auction/LotDetails'
import { OutcomePanel } from '../components/auction/OutcomePanel'

// Seed mock state for development (no backend yet)
const MOCK_STATE = {
  auctionId: 'a1',
  title: 'Stainless Steel Coil 304 — 50 MT',
  auctionType: 'ENGLISH' as const,
  status: 'ACTIVE' as const,
  currentPrice: 14200,
  leader: 'Bidder 3',
  endsAt: new Date(Date.now() + 4 * 60 * 1000 + 32 * 1000).toISOString(),
  bidHistory: [
    { amount: 14200, bidder: 'Bidder 3', timestamp: new Date(Date.now() - 60000).toISOString(), isOwn: false },
    { amount: 13900, bidder: 'Bidder 1', timestamp: new Date(Date.now() - 120000).toISOString(), isOwn: false },
    { amount: 13500, bidder: 'You',      timestamp: new Date(Date.now() - 180000).toISOString(), isOwn: true },
    { amount: 13200, bidder: 'Bidder 6', timestamp: new Date(Date.now() - 240000).toISOString(), isOwn: false },
  ],
  bidderCount: 7,
  userId: 'user-self',
  userBidStatus: 'losing' as const,
  userLastBid: 13500,
  wsStatus: 'connected' as const,
}

const LiveAuction: FC = () => {
  const { auctionId } = useParams<{ auctionId: string }>()
  const store = useAuctionStore()

  // Seed mock state while backend is offline
  useEffect(() => {
    if (!store.auctionId) {
      useAuctionStore.setState({ ...MOCK_STATE, auctionId: auctionId ?? 'a1' })
    }
  }, [auctionId, store.auctionId])

  useAuctionWebSocket(auctionId ?? '')

  const {
    title, auctionType, status, currentPrice, endsAt,
    bidHistory, bidderCount, currentRound, priceFloor,
    userBidStatus, userLastBid, wsStatus,
  } = store

  const isClosed = status === 'CLOSED'
  const isWinning = userBidStatus === 'winning'

  return (
    <div className="flex min-h-screen flex-col bg-[#09090B]">
      <AuctionHeader title={title} auctionType={auctionType} status={status} />

      {/* Reconnecting banner */}
      <AnimatePresence>
        {wsStatus === 'reconnecting' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="sticky top-14 z-20 w-full border-b border-amber-900 bg-amber-950 py-2 text-center text-sm text-amber-400"
          >
            Reconnecting to live auction…
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Left: Hero panel */}
        <div className="flex flex-1 flex-col gap-6 p-6 lg:p-8">
          <HeroPricePanel
            auctionType={auctionType}
            currentPrice={currentPrice}
            isWinning={isWinning}
            currentRound={currentRound}
            priceFloor={priceFloor}
          />

          <div className="flex flex-wrap items-center gap-4">
            {endsAt && (
              <div>
                <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Time Remaining</p>
                <CountdownTimer endsAt={endsAt} status={status} className="text-2xl" />
              </div>
            )}
            <BidderCount count={bidderCount} />
          </div>

          <UserStatusBadge status={userBidStatus} />

          {/* Bid action on mobile */}
          <div className="lg:hidden">
            {isClosed ? (
              <OutcomePanel
                userBidStatus={userBidStatus}
                finalPrice={currentPrice}
                userLastBid={userLastBid}
                title={title}
              />
            ) : auctionType === 'ENGLISH' ? (
              <BidInputPanel currentPrice={currentPrice} isClosed={isClosed} />
            ) : (
              <DutchStrikePanel
                currentPrice={currentPrice}
                priceFloor={priceFloor}
                currentRound={currentRound}
                isClosed={isClosed}
              />
            )}
          </div>

          {/* Bid history */}
          <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Bid History</p>
            <BidHistory bids={bidHistory} userBidStatus={userBidStatus} />
          </div>

          {/* Lot details */}
          <LotDetails title={title} defaultOpen={false} />
        </div>

        {/* Right: Bid action (desktop) */}
        <div className="hidden lg:block lg:w-[360px] lg:shrink-0 lg:border-l lg:border-zinc-800">
          <div className="sticky top-14 p-6">
            {isClosed ? (
              <OutcomePanel
                userBidStatus={userBidStatus}
                finalPrice={currentPrice}
                userLastBid={userLastBid}
                title={title}
              />
            ) : auctionType === 'ENGLISH' ? (
              <BidInputPanel currentPrice={currentPrice} isClosed={isClosed} />
            ) : (
              <DutchStrikePanel
                currentPrice={currentPrice}
                priceFloor={priceFloor}
                currentRound={currentRound}
                isClosed={isClosed}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LiveAuction
