import type { FC } from 'react'
import { motion } from 'motion/react'

interface Props {
  windows:  Array<{ windowStart: number; count: number }>
  loading?: boolean
}

function barColor(count: number) {
  if (count === 0) return '#3f3f46'
  if (count <= 2)  return '#71717a'
  if (count <= 5)  return '#f97316'
  if (count <= 9)  return '#f87171'
  return '#dc2626'
}

export const BidVelocityChart: FC<Props> = ({ windows, loading }) => {
  if (loading) {
    return <div className="h-[100px] w-full animate-pulse rounded-md bg-zinc-800" />
  }

  const height  = 100
  const maxCount = Math.max(...windows.map((w) => w.count), 1)
  const barW    = Math.floor(260 / Math.max(windows.length, 1))

  return (
    <svg width={260} height={height} aria-label="Bid velocity chart">
      {windows.map((w, i) => {
        const barH = Math.max(2, (w.count / maxCount) * (height - 8))
        return (
          <motion.rect
            key={w.windowStart}
            x={i * barW + 1}
            y={height - barH}
            width={Math.max(barW - 2, 1)}
            height={barH}
            fill={barColor(w.count)}
            rx={1}
            initial={{ scaleY: 0, originY: 1 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.15 }}
          />
        )
      })}
    </svg>
  )
}
