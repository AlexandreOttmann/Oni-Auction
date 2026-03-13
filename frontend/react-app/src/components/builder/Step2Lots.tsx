import type { FC } from 'react'
import { useAuctionBuilderStore } from '../../stores/auctionBuilderStore'
import { LotCard } from './LotCard'

export const Step2Lots: FC = () => {
  const { lots, auctionType, addLot, removeLot, updateLot, reorderLots } = useAuctionBuilderStore()

  const moveUp = (index: number) => {
    if (index === 0) return
    const newOrder = [...lots]
    ;[newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]]
    reorderLots(newOrder)
  }

  const moveDown = (index: number) => {
    if (index === lots.length - 1) return
    const newOrder = [...lots]
    ;[newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]
    reorderLots(newOrder)
  }

  return (
    <div className="flex flex-col gap-4 max-w-xl">
      {lots.map((lot, i) => (
        <LotCard
          key={lot.id}
          lot={lot}
          index={i}
          auctionType={auctionType}
          canRemove={lots.length > 1}
          onRemove={() => removeLot(lot.id)}
          onUpdate={(field, value) => updateLot(lot.id, field, value)}
          onMoveUp={i > 0 ? () => moveUp(i) : undefined}
          onMoveDown={i < lots.length - 1 ? () => moveDown(i) : undefined}
        />
      ))}

      {lots.length < 10 && (
        <button
          onClick={addLot}
          className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-700 py-3 text-sm text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 transition-colors"
        >
          + Add Lot
        </button>
      )}
    </div>
  )
}
