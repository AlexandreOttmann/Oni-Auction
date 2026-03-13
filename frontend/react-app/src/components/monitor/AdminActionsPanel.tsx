import { useState, type FC } from 'react'
import { ConfirmationDialog } from './ConfirmationDialog'

interface Props {
  status:     string
  auctionId:  string
  lastAction: string | null
}

export const AdminActionsPanel: FC<Props> = ({ status, auctionId, lastAction }) => {
  const [dialog, setDialog] = useState<'extend' | 'pause' | 'close' | null>(null)
  const [loading, setLoading] = useState(false)

  const isClosed = status === 'CLOSED'

  const doAction = async (action: string) => {
    setLoading(true)
    try {
      await fetch(`/api/auctions/${auctionId}/action`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action }),
      })
    } catch {
      // ignore for now
    } finally {
      setLoading(false)
      setDialog(null)
    }
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Admin Actions</p>

      <button
        disabled={isClosed}
        onClick={() => setDialog('extend')}
        className="h-10 w-full rounded border border-zinc-700 text-sm text-zinc-300 hover:border-orange-500 hover:text-orange-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        ⏱ Extend +5 minutes
      </button>

      <button
        disabled={isClosed}
        onClick={() => setDialog('pause')}
        className="h-10 w-full rounded border border-zinc-700 text-sm text-zinc-300 hover:border-orange-500 hover:text-orange-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        ⏸ Pause Auction
      </button>

      <button
        disabled={isClosed}
        onClick={() => setDialog('close')}
        className="h-10 w-full rounded border border-red-800 bg-red-950 text-sm text-red-400 hover:bg-red-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        ✕ Close Early
      </button>

      <p className="text-xs text-zinc-600 mt-1">
        Last action: {lastAction ?? '—'}
      </p>

      <ConfirmationDialog
        open={dialog === 'extend'}
        onClose={() => setDialog(null)}
        onConfirm={() => doAction('extend')}
        title="Extend auction by 5 minutes?"
        description="The auction end time will be pushed forward by 5 minutes."
        confirmLabel="Extend"
        loading={loading}
      />

      <ConfirmationDialog
        open={dialog === 'pause'}
        onClose={() => setDialog(null)}
        onConfirm={() => doAction('pause')}
        title="Pause this auction?"
        description="Bidding will be suspended until you resume. Buyers will see a paused state."
        confirmLabel="Pause"
        loading={loading}
      />

      <ConfirmationDialog
        open={dialog === 'close'}
        onClose={() => setDialog(null)}
        onConfirm={() => doAction('close_early')}
        title="Close auction early?"
        description="This will immediately close the auction at the current highest bid. This cannot be undone."
        confirmLabel="Close Early"
        confirmStyle="danger"
        requireText="CLOSE"
        loading={loading}
      />
    </div>
  )
}
