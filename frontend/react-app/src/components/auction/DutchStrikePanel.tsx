import { useState, type FC } from 'react'
import { useAuctionStore } from '../../stores/auctionStore'

interface DutchStrikePanelProps {
  currentPrice: number
  priceFloor?: number
  currentRound?: number
  isClosed: boolean
}

export const DutchStrikePanel: FC<DutchStrikePanelProps> = ({
  currentPrice,
  priceFloor,
  currentRound,
  isClosed,
}) => {
  const { placeBid } = useAuctionStore()
  const [confirming, setConfirming] = useState(false)
  const [rejected, setRejected] = useState(false)

  const handleStrike = async () => {
    if (confirming || isClosed) return
    setConfirming(true)
    setRejected(false)
    try {
      await placeBid(currentPrice)
    } catch {
      setRejected(true)
      setConfirming(false)
    }
  }

  if (isClosed) return null

  if (rejected) {
    return (
      <div className="rounded-lg border border-amber-900 bg-amber-950 px-4 py-4 text-sm text-amber-400">
        Auction Sold — another buyer struck at ${currentPrice.toLocaleString()}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Current Price</p>
        <p className="tabular-nums text-4xl font-extrabold text-zinc-50">
          ${currentPrice.toLocaleString()}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          You&apos;ll lock in this price immediately. No other buyer can take it once confirmed.
        </p>
      </div>

      <button
        onClick={handleStrike}
        disabled={confirming || isClosed}
        className="flex h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 text-[15px] font-semibold text-zinc-50 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700"
      >
        {confirming ? 'Confirming…' : (
          <>Strike at ${currentPrice.toLocaleString()} <span>⚡</span></>
        )}
      </button>

      {(priceFloor != null || currentRound != null) && (
        <p className="text-xs text-zinc-600">
          {priceFloor != null && `Floor: $${priceFloor.toLocaleString()}`}
          {priceFloor != null && currentRound != null && ' · '}
          {currentRound != null && `Round ${currentRound}`}
        </p>
      )}
    </div>
  )
}
