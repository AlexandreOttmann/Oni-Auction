import type { FC } from 'react'
import type { LotDraft } from '../../stores/auctionBuilderStore'
import { CurrencyInput } from './CurrencyInput'

interface Props {
  lot:         LotDraft
  index:       number
  auctionType: 'ENGLISH' | 'DUTCH' | null
  canRemove:   boolean
  onRemove:    () => void
  onUpdate:    (field: string, value: string) => void
  onMoveUp?:   () => void
  onMoveDown?: () => void
}

function FieldInput({ label, value, onChange, error, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; error?: string; placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-zinc-400">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`rounded border bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none transition-colors ${
          error ? 'border-red-700' : 'border-zinc-700 focus:border-orange-500'
        }`}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

export const LotCard: FC<Props> = ({
  lot, index, auctionType, canRemove, onRemove, onUpdate, onMoveUp, onMoveDown
}) => {
  const err = lot.errors

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-zinc-700 cursor-grab text-lg select-none" title="Drag handle">⠿</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            Lot {index + 1}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onMoveUp && (
            <button onClick={onMoveUp} className="rounded px-1.5 py-1 text-xs text-zinc-600 hover:text-zinc-400 transition-colors" title="Move up">
              ↑
            </button>
          )}
          {onMoveDown && (
            <button onClick={onMoveDown} className="rounded px-1.5 py-1 text-xs text-zinc-600 hover:text-zinc-400 transition-colors" title="Move down">
              ↓
            </button>
          )}
          {canRemove && (
            <button
              onClick={onRemove}
              className="rounded px-2 py-1 text-xs text-red-500 hover:text-red-400 hover:bg-red-950/20 transition-colors"
              title="Remove lot"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <FieldInput
          label="Title"
          value={lot.title}
          onChange={(v) => onUpdate('title', v)}
          error={err.title}
          placeholder="e.g. Stainless Steel Coil 304 — Grade A"
        />
        <FieldInput
          label="Description"
          value={lot.description}
          onChange={(v) => onUpdate('description', v)}
          placeholder="Lot description"
        />

        <div className="flex gap-3">
          <CurrencyInput
            label="Starting Price"
            value={lot.starting_price}
            onChange={(v) => onUpdate('starting_price', v)}
            error={err.starting_price}
            placeholder="0.00"
          />
          <CurrencyInput
            label="Reserve Price"
            value={lot.reserve_price}
            onChange={(v) => onUpdate('reserve_price', v)}
            optional
            placeholder="0.00"
          />
        </div>

        {auctionType === 'ENGLISH' && (
          <CurrencyInput
            label="Min Increment"
            value={lot.min_increment}
            onChange={(v) => onUpdate('min_increment', v)}
            error={err.min_increment}
            placeholder="100.00"
          />
        )}

        {auctionType === 'DUTCH' && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <CurrencyInput
                label="Price Step"
                value={lot.price_step}
                onChange={(v) => onUpdate('price_step', v)}
                error={err.price_step}
                placeholder="500.00"
              />
              <CurrencyInput
                label="Price Floor"
                value={lot.price_floor}
                onChange={(v) => onUpdate('price_floor', v)}
                error={err.price_floor}
                placeholder="5000.00"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-400">Round Duration (seconds)</label>
              <input
                type="number"
                value={lot.round_duration}
                onChange={(e) => onUpdate('round_duration', e.target.value)}
                placeholder="60"
                className={`rounded border bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none transition-colors ${
                  err.round_duration ? 'border-red-700' : 'border-zinc-700 focus:border-orange-500'
                }`}
              />
              {err.round_duration && <p className="text-xs text-red-400">{err.round_duration}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
