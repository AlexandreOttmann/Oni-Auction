import type { FC } from 'react'

interface Props {
  type:       'ENGLISH' | 'DUTCH'
  selected:   boolean
  onSelect:   () => void
}

const DESCRIPTIONS = {
  ENGLISH: ['Ascending price format', 'Highest bid at close wins', 'Buyers bid up from starting price'],
  DUTCH:   ['Descending price per round', 'First to bid at current price wins', 'Seller sets starting price and floor'],
}

export const AuctionTypeCard: FC<Props> = ({ type, selected, onSelect }) => {
  return (
    <button
      onClick={onSelect}
      role="radio"
      aria-checked={selected}
      className={`relative flex-1 rounded-lg border p-4 text-left transition-colors ${
        selected
          ? 'border-2 border-orange-500 bg-orange-950/20'
          : 'border border-zinc-700 bg-zinc-900 hover:border-zinc-600'
      }`}
    >
      {selected && (
        <span className="absolute top-3 left-3 h-4 w-4 rounded-full bg-orange-500" />
      )}
      <p className={`text-sm font-semibold mb-1.5 ${selected ? 'text-zinc-50 pl-6' : 'text-zinc-200'}`}>
        {type === 'ENGLISH' ? 'English Auction' : 'Dutch Auction'}
      </p>
      <ul className="space-y-0.5">
        {DESCRIPTIONS[type].map((line) => (
          <li key={line} className="text-xs text-zinc-500">{line}</li>
        ))}
      </ul>
    </button>
  )
}
