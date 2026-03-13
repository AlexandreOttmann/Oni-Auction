import { useState, type FC } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { formatRelativeTime, formatCurrency } from '../../utils/time'

interface BidEntry {
  amount:    number
  timestamp: string
}

interface Props {
  history: BidEntry[]
}

const bidEntryVariants = {
  hidden:  { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.18 } },
  exit:    { opacity: 0 },
}

export const BidHistoryMini: FC<Props> = ({ history }) => {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? history : history.slice(0, 5)

  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
        Bid History
      </p>
      <div
        className="max-h-[200px] overflow-y-auto flex flex-col gap-1"
        aria-live="polite"
        aria-label="Bid history"
      >
        <AnimatePresence initial={false}>
          {visible.map((entry, i) => (
            <motion.div
              key={`${entry.timestamp}-${i}`}
              variants={bidEntryVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex items-center justify-between text-xs py-1 border-b border-zinc-800/50"
            >
              <span className="tabular-nums text-zinc-200 font-semibold">
                {formatCurrency(entry.amount)}
              </span>
              <span className="text-zinc-600">
                {formatRelativeTime(entry.timestamp)}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {history.length > 5 && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="mt-2 text-xs text-orange-500 hover:text-orange-400 transition-colors"
        >
          {showAll ? 'Show less' : `Show all ${history.length}`}
        </button>
      )}
      {history.length === 0 && (
        <p className="text-xs text-zinc-600 py-2">No bids yet.</p>
      )}
    </div>
  )
}
