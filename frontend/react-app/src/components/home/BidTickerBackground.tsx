import { useMemo, type FC } from 'react'
import { motion } from 'motion/react'

const TICK_AMOUNTS = [
  '$12,400', '$8,900', '$31,200', '$5,600', '$14,200',
  '$9,100', '$22,000', '$6,300', '$18,750', '$41,000',
  '$7,800', '$25,500', '$11,300', '$3,900', '$16,600',
]

interface Tick {
  id: number
  text: string
  x: string
  y: string
  delay: number
  duration: number
  size: number
}

export const BidTickerBackground: FC<{ density?: number }> = ({ density = 20 }) => {
  const ticks = useMemo<Tick[]>(() =>
    Array.from({ length: density }, (_, i) => ({
      id: i,
      text: TICK_AMOUNTS[i % TICK_AMOUNTS.length],
      x: `${Math.random() * 100}%`,
      y: `${20 + Math.random() * 70}%`,
      delay: Math.random() * 8,
      duration: 8 + Math.random() * 6,
      size: 10 + Math.random() * 4,
    })), [density])

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {ticks.map((tick) => (
        <motion.div
          key={tick.id}
          className="absolute rounded px-2 py-0.5 bg-zinc-800/40 font-mono font-semibold text-zinc-300"
          style={{ left: tick.x, top: tick.y, fontSize: tick.size }}
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: [0, 0.08, 0.07, 0], y: -80 }}
          transition={{
            duration: tick.duration,
            delay: tick.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          {tick.text}
        </motion.div>
      ))}
    </div>
  )
}
