import { useState, type FC, type FormEvent } from 'react'
import { useAuctionStore } from '../../stores/auctionStore'

const MIN_INCREMENT = 100

interface BidInputPanelProps {
  currentPrice: number
  isClosed: boolean
}

export const BidInputPanel: FC<BidInputPanelProps> = ({ currentPrice, isClosed }) => {
  const { placeBid } = useAuctionStore()
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const minBid = currentPrice + MIN_INCREMENT
  const suggested = minBid

  const numValue = parseFloat(value.replace(/,/g, ''))
  const isValid = !isNaN(numValue) && numValue >= minBid

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!isValid || submitting || isClosed) return
    setSubmitting(true)
    setError(null)
    try {
      await placeBid(numValue)
      setValue('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bid rejected')
    } finally {
      setSubmitting(false)
    }
  }

  if (isClosed) return null

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label
          htmlFor="bid-amount"
          className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-zinc-500"
        >
          Your Bid (minimum ${minBid.toLocaleString()})
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">$</span>
          <input
            id="bid-amount"
            type="number"
            inputMode="decimal"
            step={MIN_INCREMENT}
            min={minBid}
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(null) }}
            placeholder={minBid.toLocaleString()}
            className={`h-11 w-full rounded bg-[#27272A] border pl-7 pr-4 text-right text-lg font-bold tabular-nums text-zinc-50 placeholder-zinc-600 focus:outline-none transition-colors
              ${error ? 'border-red-600' : 'border-zinc-700 focus:border-orange-600'}`}
          />
        </div>
        <p className="mt-1 text-xs text-zinc-600">
          Min: ${minBid.toLocaleString()} · Suggested: ${suggested.toLocaleString()}
        </p>
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
        {value && !isValid && (
          <p className="mt-1 text-xs text-red-400">Must be at least ${minBid.toLocaleString()}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={submitting || !isValid || isClosed}
        aria-disabled={submitting || !isValid}
        className="flex h-[52px] w-full items-center justify-center rounded-lg bg-zinc-900 text-[15px] font-semibold text-zinc-50 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-700"
      >
        {submitting ? (
          <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          'Place Bid →'
        )}
      </button>
    </form>
  )
}
