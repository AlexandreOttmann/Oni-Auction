import type { FC } from 'react'
import { motion } from 'motion/react'

interface HeatBarProps {
  bidsPerMin: number
}

function heatColor(bpm: number): string {
  if (bpm >= 13) return '#DC2626'
  if (bpm >= 6) return '#EF4444'
  if (bpm >= 2) return '#F97316'
  return '#71717A'
}

function heatHeight(bpm: number): number {
  const max = 16
  if (bpm >= 13) return max
  if (bpm >= 6) return Math.round(max * 0.75)
  if (bpm >= 2) return Math.round(max * 0.5)
  return Math.round(max * 0.25)
}

export const HeatBar: FC<HeatBarProps> = ({ bidsPerMin }) => {
  const color = heatColor(bidsPerMin)
  const fillH = heatHeight(bidsPerMin)
  const totalH = 32

  return (
    <div
      className="flex w-1 items-end rounded-sm overflow-hidden"
      style={{ height: totalH, backgroundColor: '#27272A' }}
      title={`${bidsPerMin} bids/min`}
    >
      <motion.div
        className="w-full rounded-sm"
        initial={{ height: 0 }}
        animate={{ height: fillH }}
        transition={{ type: 'spring', stiffness: 200, damping: 28 }}
        style={{ backgroundColor: color }}
      />
    </div>
  )
}
