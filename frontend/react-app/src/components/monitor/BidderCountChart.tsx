import type { FC } from 'react'

interface Props {
  series:  Array<{ time: number; count: number }>
  loading?: boolean
}

export const BidderCountChart: FC<Props> = ({ series, loading }) => {
  if (loading) {
    return <div className="h-[120px] w-full animate-pulse rounded-md bg-zinc-800" />
  }

  const height = 120
  const width  = 260
  const pad    = 4

  if (series.length < 2) {
    return (
      <div className="flex h-[120px] items-center justify-center rounded-md bg-zinc-900 text-xs text-zinc-600">
        Collecting data…
      </div>
    )
  }

  const counts = series.map((s) => s.count)
  const maxC   = Math.max(...counts, 1)
  const points = series.map((s, i) => {
    const x = pad + (i / (series.length - 1)) * (width - 2 * pad)
    const y = pad + ((maxC - s.count) / maxC) * (height - 2 * pad)
    return `${x},${y}`
  })

  const polyline = points.join(' ')
  const firstPt  = points[0].split(',')
  const lastPt   = points[points.length - 1].split(',')
  const area     = `${points.join(' ')} ${lastPt[0]},${height} ${firstPt[0]},${height}`

  return (
    <svg width={width} height={height} aria-label="Bidder count over time">
      <polygon points={area} fill="rgba(167,139,250,0.08)" />
      <polyline points={polyline} fill="none" stroke="#A78BFA" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
