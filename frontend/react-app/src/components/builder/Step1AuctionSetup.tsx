import { useState, type FC } from 'react'
import { useAuctionBuilderStore } from '../../stores/auctionBuilderStore'
import { useSellerList } from '../../hooks/useSellerList'
import { AuctionTypeCard } from './AuctionTypeCard'

export const Step1AuctionSetup: FC = () => {
  const store = useAuctionBuilderStore()
  const { data: sellers = [] } = useSellerList()
  const [titleFocused, setTitleFocused] = useState(false)

  const field = (name: string, value: string) => store.setField(name, value)
  const err   = store.step1Errors

  return (
    <div className="flex flex-col gap-5 max-w-xl">
      {/* Title */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-zinc-400">Auction Title</label>
        <input
          type="text"
          value={store.title}
          maxLength={120}
          onChange={(e) => field('title', e.target.value)}
          onFocus={() => setTitleFocused(true)}
          onBlur={() => setTitleFocused(false)}
          className={`rounded border bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none transition-colors ${
            err.title ? 'border-red-700' : 'border-zinc-700 focus:border-orange-500'
          }`}
          placeholder="e.g. Stainless Steel Coil 304"
        />
        <div className="flex justify-between">
          {err.title && <p className="text-xs text-red-400">{err.title}</p>}
          {titleFocused && (
            <p className="text-xs text-zinc-600 ml-auto">{store.title.length}/120</p>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-zinc-400">Description</label>
        <textarea
          rows={3}
          value={store.description}
          onChange={(e) => field('description', e.target.value)}
          className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-orange-500 focus:outline-none transition-colors resize-none"
          placeholder="Describe the auction items, conditions, etc."
        />
      </div>

      {/* Type */}
      <div className="flex flex-col gap-2">
        <label className="text-xs text-zinc-400">Auction Type</label>
        {err.auctionType && <p className="text-xs text-red-400">{err.auctionType}</p>}
        <div className="flex gap-3" role="radiogroup" aria-label="Auction type">
          <AuctionTypeCard
            type="ENGLISH"
            selected={store.auctionType === 'ENGLISH'}
            onSelect={() => field('auctionType', 'ENGLISH')}
          />
          <AuctionTypeCard
            type="DUTCH"
            selected={store.auctionType === 'DUTCH'}
            onSelect={() => field('auctionType', 'DUTCH')}
          />
        </div>
      </div>

      {/* Start Date + Time */}
      <div className="flex gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs text-zinc-400">Start Date</label>
          <input
            type="date"
            value={store.startsAtDate}
            onChange={(e) => field('startsAtDate', e.target.value)}
            className={`rounded border bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none transition-colors ${
              err.startsAtDate ? 'border-red-700' : 'border-zinc-700 focus:border-orange-500'
            }`}
          />
          {err.startsAtDate && <p className="text-xs text-red-400">{err.startsAtDate}</p>}
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs text-zinc-400">Start Time</label>
          <input
            type="time"
            value={store.startsAtTime}
            onChange={(e) => field('startsAtTime', e.target.value)}
            className={`rounded border bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none transition-colors ${
              err.startsAtTime ? 'border-red-700' : 'border-zinc-700 focus:border-orange-500'
            }`}
          />
          {err.startsAtTime && <p className="text-xs text-red-400">{err.startsAtTime}</p>}
        </div>
      </div>

      {/* Seller */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-zinc-400">Seller</label>
        <select
          value={store.sellerId}
          onChange={(e) => field('sellerId', e.target.value)}
          className={`rounded border bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none transition-colors ${
            err.sellerId ? 'border-red-700' : 'border-zinc-700 focus:border-orange-500'
          }`}
        >
          <option value="">Select a seller…</option>
          {sellers.map((s) => (
            <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
          ))}
        </select>
        {err.sellerId && <p className="text-xs text-red-400">{err.sellerId}</p>}
      </div>
    </div>
  )
}
