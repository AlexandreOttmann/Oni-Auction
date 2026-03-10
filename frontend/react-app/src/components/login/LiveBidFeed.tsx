import { useState, useEffect, useRef, type FC } from 'react'
import { motion, AnimatePresence } from 'motion/react'

interface BidFeedItem {
  id: number
  amount: number
  lot: string
  timeAgo: string
}

const LOTS = ['Coil 304', 'Titanium Sheet', 'Aluminum Extrusion', 'Copper Wire', 'Carbon Fiber']
const AMOUNTS = [14200, 9800, 6100, 14100, 28500, 4200, 7800, 31000, 5600]

const INITIAL: BidFeedItem[] = [
  { id: 1, amount: 14200, lot: 'Coil 304', timeAgo: 'just now' },
  { id: 2, amount: 9800, lot: 'Titanium Sheet', timeAgo: '2s ago' },
  { id: 3, amount: 6100, lot: 'Aluminum Extrusion', timeAgo: '5s ago' },
  { id: 4, amount: 14100, lot: 'Coil 304', timeAgo: '8s ago' },
  { id: 5, amount: 31000, lot: 'Carbon Fiber', timeAgo: '12s ago' },
]

export const LiveBidFeed: FC = () => {
  const [items, setItems] = useState<BidFeedItem[]>(INITIAL)
  const nextId = useRef(100)

  useEffect(() => {
    // Tick existing items' timestamps
    const ticker = setInterval(() => {
      setItems(prev =>
        prev.map((item, i) => {
          const s = (i * 3) + Math.floor(Date.now() / 1000) % 60
          const secAgo = Math.min(s, 59)
          return { ...item, timeAgo: secAgo === 0 ? 'just now' : `${secAgo}s ago` }
        })
      )
    }, 1000)

    // New bids at random intervals 3–6s
    const scheduleNext = () => {
      const delay = 3000 + Math.random() * 3000
      return setTimeout(() => {
        const newItem: BidFeedItem = {
          id: nextId.current++,
          amount: AMOUNTS[Math.floor(Math.random() * AMOUNTS.length)],
          lot: LOTS[Math.floor(Math.random() * LOTS.length)],
          timeAgo: 'just now',
        }
        setItems(prev => [newItem, ...prev].slice(0, 5))
        timeoutRef.current = scheduleNext()
      }, delay)
    }

    const timeoutRef = { current: scheduleNext() }

    return () => {
      clearInterval(ticker)
      clearTimeout(timeoutRef.current)
    }
  }, [])

  return (
    <div className="space-y-1">
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.18, ease: [0, 0, 0.2, 1] }}
            className="flex items-baseline gap-3 rounded px-2 py-1.5"
          >
            <span className="tabular-nums text-sm font-bold text-orange-500">
              ${item.amount.toLocaleString()}
            </span>
            <span className="text-sm text-zinc-400 truncate">{item.lot}</span>
            <span className="ml-auto text-xs text-zinc-600 shrink-0">{item.timeAgo}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
