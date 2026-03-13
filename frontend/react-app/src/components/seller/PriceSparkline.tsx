import type { FC } from 'react'

interface Props {
  history: Array<{ amount: number; timestamp: string }>
}

export const PriceSparkline: FC<Props> = ({ history }) => {
  const height = 80
  const width  = 260

  if (history.length < 2) {
    return (
      <div className="relative" style={{ width, height }}>
        <svg width={width} height={height}>
          <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="#3f3f46" strokeWidth={1} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs text-zinc-600">
          No bids yet
        </span>
      </div>
    )
  }

  const amounts  = history.map((h) => h.amount)
  const minAmt   = Math.min(...amounts)
  const maxAmt   = Math.max(...amounts)
  const range    = maxAmt - minAmt || 1
  const pad      = 4

  const points = history.map((h, i) => {
    const x = pad + (i / (history.length - 1)) * (width - 2 * pad)
    const y = pad + ((maxAmt - h.amount) / range) * (height - 2 * pad)
    return `${x},${y}`
  })

  const polyline = points.join(' ')
  const firstPt  = points[0].split(',')
  const lastPt   = points[points.length - 1].split(',')
  const area = `${points.join(' ')} ${lastPt[0]},${height} ${firstPt[0]},${height}`

  return (
    <svg width={width} height={height} aria-label="Price sparkline">
      <polygon points={area} fill="rgba(249,115,22,0.08)" />
      <polyline points={polyline} fill="none" stroke="#F97316" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
