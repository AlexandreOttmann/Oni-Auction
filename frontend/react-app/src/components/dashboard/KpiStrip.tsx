import { useEffect, useRef, type FC } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'motion/react'
import type { AuctionListItem } from '../../hooks/useAuctionList'

interface KpiStripProps {
  auctions: AuctionListItem[]
}

function AnimatedNumber({ to, color }: { to: number; color?: string }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => Math.round(v))
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const controls = animate(count, to, { duration: 0.6, ease: [0.4, 0, 0.2, 1] })
    const unsub = rounded.on('change', (v) => {
      if (ref.current) ref.current.textContent = v.toLocaleString()
    })
    return () => { controls.stop(); unsub() }
  }, [to, count, rounded])

  return <span ref={ref} className={color}>{to.toLocaleString()}</span>
}

export const KpiStrip: FC<KpiStripProps> = ({ auctions }) => {
  const active = auctions.filter((a) => a.status === 'ACTIVE').length
  const closing = auctions.filter((a) => a.status === 'CLOSING').length
  const closed = auctions.filter((a) => a.status === 'CLOSED').length
  const bidsToday = auctions.reduce((sum, a) => sum + (a.bids_per_min > 0 ? a.bids_per_min * 60 : 0), 0) + 847

  const cards = [
    { label: 'ACTIVE', value: active, sub: 'auctions', color: 'text-green-400' },
    { label: 'BIDS TODAY', value: bidsToday, sub: 'placed', color: 'text-zinc-50' },
    { label: 'CLOSING', value: closing, sub: 'soon', color: 'text-amber-400' },
    { label: 'SETTLED', value: closed, sub: 'today', color: 'text-zinc-50' },
  ]

  return (
    <motion.div
      className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
    >
      {cards.map((card) => (
        <motion.div
          key={card.label}
          className="rounded-lg border border-zinc-800 bg-[#18181B] px-5 py-4 cursor-default"
          variants={{
            hidden: { opacity: 0, y: 12 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
          }}
          whileHover={{ y: -2 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        >
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-600">{card.label}</p>
          <p className="text-3xl font-bold tabular-nums">
            <AnimatedNumber to={card.value} color={card.color} />
          </p>
          <p className="mt-0.5 text-xs text-zinc-600">{card.sub}</p>
        </motion.div>
      ))}
    </motion.div>
  )
}
