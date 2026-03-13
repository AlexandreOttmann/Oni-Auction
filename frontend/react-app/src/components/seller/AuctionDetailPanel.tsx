import type { FC } from 'react'
import type { SellerAuctionState } from '../../stores/sellerStore'
import { PriceSparkline } from './PriceSparkline'
import { BidVelocityBar } from './BidVelocityBar'
import { BidderCountTrend } from './BidderCountTrend'
import { BidHistoryMini } from './BidHistoryMini'

interface Props {
  state: SellerAuctionState
}

export const AuctionDetailPanel: FC<Props> = ({ state }) => {
  return (
    <div className="bg-zinc-800 px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Price History</p>
          <PriceSparkline history={state.bidHistory} />
        </div>
        <BidVelocityBar bidsPerMin={state.bidsPerMin} />
      </div>
      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Active Bidders</p>
          <BidderCountTrend count={state.bidderCount} />
        </div>
        <BidHistoryMini history={state.bidHistory} />
      </div>
    </div>
  )
}
