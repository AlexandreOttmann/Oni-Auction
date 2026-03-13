import { useState, useEffect, useRef, type FC } from 'react'
import { motion, AnimatePresence } from 'motion/react'

export interface ConfirmationDialogProps {
  open:           boolean
  onClose:        () => void
  onConfirm:      () => void
  title:          string
  description:    string
  confirmLabel?:  string
  confirmStyle?:  'default' | 'danger'
  requireText?:   string
  loading?:       boolean
}

export const ConfirmationDialog: FC<ConfirmationDialogProps> = ({
  open, onClose, onConfirm, title, description,
  confirmLabel = 'Confirm', confirmStyle = 'default', requireText, loading = false,
}) => {
  const [typed, setTyped] = useState('')
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) setTyped('')
  }, [open])

  useEffect(() => {
    if (open) cancelRef.current?.focus()
  }, [open])

  const canConfirm = !requireText || typed === requireText

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-title"
          onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md rounded-xl bg-zinc-800 p-6 shadow-2xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="dialog-title" className="text-base font-bold text-zinc-50 mb-2">{title}</h2>
            <p className="text-sm text-zinc-400 mb-4">{description}</p>

            {requireText && (
              <div className="mb-4">
                <p className="text-xs text-zinc-500 mb-1.5">
                  Type <span className="font-mono text-zinc-300">{requireText}</span> to confirm
                </p>
                <input
                  type="text"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  className="w-full rounded bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 focus:border-orange-500 focus:outline-none"
                  placeholder={requireText}
                />
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                ref={cancelRef}
                onClick={onClose}
                className="rounded px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={!canConfirm || loading}
                className={`rounded px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-40 ${
                  confirmStyle === 'danger'
                    ? 'bg-red-950 text-red-400 border border-red-800 hover:bg-red-900 disabled:hover:bg-red-950'
                    : 'bg-orange-500 text-zinc-950 hover:bg-orange-400 disabled:hover:bg-orange-500'
                }`}
              >
                {loading ? '…' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
