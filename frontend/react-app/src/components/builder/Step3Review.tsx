import { useState, type FC } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuctionBuilderStore } from '../../stores/auctionBuilderStore'
import { ConfirmationDialog } from '../monitor/ConfirmationDialog'
import { formatCurrency, formatRelativeTime } from '../../utils/time'

export const Step3Review: FC = () => {
  const store = useAuctionBuilderStore()
  const navigate = useNavigate()
  const [publishDialog, setPublishDialog] = useState(false)

  const startsAt = store.startsAtDate && store.startsAtTime
    ? new Date(`${store.startsAtDate}T${store.startsAtTime}`)
    : null

  return (
    <div className="flex flex-col gap-5 max-w-xl">
      {/* Auction summary */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4">Auction Details</p>

        <div className="flex flex-col gap-3 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-500">Title</span>
            <span className="text-zinc-100 font-medium">{store.title || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Type</span>
            <span className="text-zinc-100">{store.auctionType ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Starts</span>
            <span className="text-zinc-100">
              {startsAt ? `${startsAt.toLocaleString()} (${formatRelativeTime(startsAt.toISOString())})` : '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Lots</span>
            <span className="text-zinc-100">{store.lots.length}</span>
          </div>
        </div>
      </div>

      {/* Lots list */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4">Lots</p>
        <div className="flex flex-col gap-3">
          {store.lots.map((lot, i) => (
            <div key={lot.id} className="flex items-start gap-3 text-sm">
              <span className="w-6 shrink-0 text-zinc-600 tabular-nums">{i + 1}.</span>
              <div className="flex-1 min-w-0">
                <p className="text-zinc-100 font-medium truncate">{lot.title || 'Untitled'}</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Starting: {lot.starting_price ? formatCurrency(parseFloat(lot.starting_price)) : '—'}
                  {lot.reserve_price && ` · Reserve: ${formatCurrency(parseFloat(lot.reserve_price))}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => store.submit('DRAFT', navigate)}
          disabled={store.submitStatus === 'loading'}
          className="h-10 w-full rounded border border-zinc-700 text-sm text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition-colors disabled:opacity-40"
        >
          Save as Draft
        </button>
        <button
          onClick={() => store.submit('SCHEDULED', navigate)}
          disabled={store.submitStatus === 'loading'}
          className="h-10 w-full rounded border border-zinc-700 text-sm text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition-colors disabled:opacity-40"
        >
          Schedule
        </button>
        <button
          onClick={() => setPublishDialog(true)}
          disabled={store.submitStatus === 'loading'}
          className="h-10 w-full rounded bg-orange-500 text-sm font-semibold text-zinc-950 hover:bg-orange-400 transition-colors disabled:opacity-40"
        >
          Publish Now →
        </button>

        {store.submitError && (
          <p className="text-xs text-red-400 text-center">{store.submitError}</p>
        )}
      </div>

      <ConfirmationDialog
        open={publishDialog}
        onClose={() => setPublishDialog(false)}
        onConfirm={() => { setPublishDialog(false); store.submit('ACTIVE', navigate) }}
        title={`Publish "${store.title}"?`}
        description="The auction will be immediately live and visible to all buyers. Ensure all details are correct before proceeding."
        confirmLabel="Confirm &amp; Publish →"
        loading={store.submitStatus === 'loading'}
      />
    </div>
  )
}
