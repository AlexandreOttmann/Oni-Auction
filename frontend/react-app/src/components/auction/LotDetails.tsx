import { useState, type FC } from 'react'
import { motion, AnimatePresence } from 'motion/react'

interface LotDetailsProps {
  title: string
  defaultOpen?: boolean
}

const MOCK_DETAILS: Record<string, string> = {
  Material: 'Stainless Steel Coil (304 grade)',
  Quantity: '50 MT',
  Delivery: 'Ex-Works, Rotterdam',
  Seller: 'Acme Steel BV',
  Starting: '$3,500',
}

export const LotDetails: FC<LotDetailsProps> = ({ defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-t border-zinc-800">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 py-4 px-1 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <motion.span
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.15 }}
          className="text-xs"
        >
          ▸
        </motion.span>
        Lot Details
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 pb-4 text-sm">
              {Object.entries(MOCK_DETAILS).map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-zinc-600">{k}</dt>
                  <dd className="text-zinc-300">{v}</dd>
                </div>
              ))}
            </dl>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
