import type { FC } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { UserBidStatus } from '../../stores/auctionStore'

interface UserStatusBadgeProps {
  status: UserBidStatus
}

const CONFIG: Record<UserBidStatus, { label: string; classes: string; icon: string } | null> = {
  neutral: null,
  winning:    { label: "You're Winning",    classes: 'bg-green-950 text-green-400 border border-green-900', icon: '✓' },
  losing:     { label: "You've Been Outbid", classes: 'bg-red-950 text-red-400 border border-red-900',       icon: '✗' },
  closed_won: { label: 'You Won',           classes: 'bg-green-950 text-green-400 border border-green-800', icon: '🏆' },
  closed_lost:{ label: 'Auction Ended',     classes: 'bg-zinc-800 text-zinc-400 border border-zinc-700',    icon: '' },
}

export const UserStatusBadge: FC<UserStatusBadgeProps> = ({ status }) => {
  const cfg = CONFIG[status]

  // Reserve space even when hidden
  return (
    <div style={{ minHeight: 32 }}>
      <AnimatePresence mode="wait">
        {cfg && (
          <motion.div
            key={status}
            role={status === 'losing' ? 'alert' : undefined}
            aria-live={status === 'losing' ? 'assertive' : 'polite'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${cfg.classes}`}
          >
            {cfg.icon && <span>{cfg.icon}</span>}
            {cfg.label}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
