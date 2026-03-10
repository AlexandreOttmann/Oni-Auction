import type { FC } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useDashboardStore } from '../../stores/dashboardStore'

export const NewAuctionModal: FC = () => {
  const { showNewAuctionModal, setShowNewAuctionModal } = useDashboardStore()

  return (
    <AnimatePresence>
      {showNewAuctionModal && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-[#09090B]/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowNewAuctionModal(false)}
          />
          {/* Modal */}
          <motion.div
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-700 bg-[#27272A] p-6 shadow-2xl"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-zinc-50">Create Auction</h2>
              <button
                onClick={() => setShowNewAuctionModal(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors text-xl"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <span className="text-4xl">⚒</span>
              <p className="text-sm text-zinc-400">Full auction creation form coming in Phase 3.</p>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowNewAuctionModal(false)}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:border-zinc-500 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled
                className="rounded-lg bg-orange-500/50 px-5 py-2 text-sm font-bold text-[#09090B] cursor-not-allowed"
              >
                Create →
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
