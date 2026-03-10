import { useState, useEffect, useRef, type FC } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import * as d3 from 'd3'
import { StatusBadge } from '../shared/StatusBadge'
import { AuctionTypeBadge } from '../shared/AuctionTypeBadge'

interface BidPoint {
  time: number
  amount: number
}

const INITIAL_BIDS: BidPoint[] = [
  { time: 0, amount: 13500 },
  { time: 30, amount: 13500 },
  { time: 60, amount: 13900 },
  { time: 90, amount: 13900 },
  { time: 120, amount: 14100 },
  { time: 150, amount: 14200 },
]

const MOCK_BID_HISTORY = [
  { amount: 14200, bidder: 'Bidder 3', time: '14:31' },
  { amount: 13900, bidder: 'Bidder 1', time: '14:29' },
  { amount: 13500, bidder: 'Bidder 6', time: '14:27' },
]

const NEW_BIDS = [
  { amount: 14500, bidder: 'Bidder 2' },
  { amount: 14800, bidder: 'Bidder 5' },
  { amount: 15100, bidder: 'Bidder 3' },
  { amount: 15400, bidder: 'Bidder 8' },
]

function SparklineChart({ bids }: { bids: BidPoint[] }) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || bids.length < 2) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = svgRef.current.clientWidth || 280
    const height = 56

    const xScale = d3.scaleLinear().domain([0, bids[bids.length - 1].time]).range([0, width])
    const yScale = d3.scaleLinear()
      .domain([d3.min(bids, d => d.amount)! * 0.995, d3.max(bids, d => d.amount)! * 1.005])
      .range([height, 0])

    const line = d3.line<BidPoint>()
      .x(d => xScale(d.time))
      .y(d => yScale(d.amount))
      .curve(d3.curveStepAfter)

    const area = d3.area<BidPoint>()
      .x(d => xScale(d.time))
      .y0(height)
      .y1(d => yScale(d.amount))
      .curve(d3.curveStepAfter)

    svg.append('defs').append('linearGradient')
      .attr('id', 'area-gradient')
      .attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%')
      .selectAll('stop')
      .data([
        { offset: '0%', color: 'rgba(249,115,22,0.15)' },
        { offset: '100%', color: 'rgba(249,115,22,0)' },
      ])
      .join('stop')
      .attr('offset', d => d.offset)
      .attr('stop-color', d => d.color)

    svg.append('path')
      .datum(bids)
      .attr('d', area)
      .attr('fill', 'url(#area-gradient)')

    svg.append('path')
      .datum(bids)
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke', '#F97316')
      .attr('stroke-width', 2)
  }, [bids])

  return <svg ref={svgRef} className="w-full" height={56} />
}

export const LivePreviewPanel: FC = () => {
  const [bids, setBids] = useState(INITIAL_BIDS)
  const [history, setHistory] = useState(MOCK_BID_HISTORY)
  const [currentBid, setCurrentBid] = useState(14200)
  const newBidIdx = useRef(0)

  // Countdown from fixed offset
  const [secondsLeft, setSecondsLeft] = useState(272)
  useEffect(() => {
    const t = setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [])

  // Add mock bids every 5s
  useEffect(() => {
    const t = setInterval(() => {
      const next = NEW_BIDS[newBidIdx.current % NEW_BIDS.length]
      newBidIdx.current++
      const now = Date.now()
      const newTime = bids[bids.length - 1].time + 30
      setBids(prev => [...prev, { time: newTime, amount: next.amount }])
      setCurrentBid(next.amount)
      setHistory(prev => [
        { amount: next.amount, bidder: next.bidder, time: new Date(now).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) },
        ...prev.slice(0, 2),
      ])
    }, 5000)
    return () => clearInterval(t)
  }, [bids])

  const m = Math.floor(secondsLeft / 60)
  const s = secondsLeft % 60
  const timerStr = `${m}:${String(s).padStart(2, '0')}`

  return (
    <section className="bg-[#09090B] py-20">
      <div className="mx-auto max-w-[1100px] px-6">
        <div className="flex flex-col items-start gap-12 lg:flex-row lg:items-center">
          {/* Left text */}
          <motion.div
            className="lg:w-2/5"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <h2 className="mb-4 text-3xl font-bold text-zinc-50">See it in motion.</h2>
            <p className="mb-6 text-sm leading-relaxed text-zinc-400">
              Every bid. Every price move. Every second of the countdown.
              Your team watches the same room.
            </p>
            <Link to="/login">
              <motion.span
                className="flex items-center gap-1 text-sm font-medium text-orange-500 hover:text-orange-400 transition-colors"
                whileHover="hover"
                initial="rest"
              >
                Sign In to Explore
                <motion.span variants={{ rest: { x: 0 }, hover: { x: 4 } }} transition={{ duration: 0.15 }}>→</motion.span>
              </motion.span>
            </Link>
          </motion.div>

          {/* Mock auction card */}
          <motion.div
            className="w-full rounded-xl border border-zinc-800 bg-[#18181B] p-5 shadow-xl lg:w-3/5"
            initial={{ opacity: 0, scale: 0.92 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AuctionTypeBadge type="ENGLISH" size="xs" />
                <StatusBadge status="ACTIVE" />
              </div>
            </div>
            <p className="mb-4 text-sm font-medium text-zinc-300">Stainless Steel Coil 304 — 50 MT</p>

            {/* Price + timer */}
            <div className="mb-4 flex items-end justify-between border-b border-zinc-800 pb-4">
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Current Bid</p>
                <motion.p
                  key={currentBid}
                  className="tabular-nums text-3xl font-extrabold text-zinc-50"
                  initial={{ y: -4, opacity: 0.6 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.18 }}
                >
                  ${currentBid.toLocaleString()}
                </motion.p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold tabular-nums font-mono text-zinc-300">{timerStr}</p>
                <span className="h-2 w-2 inline-block rounded-full bg-green-400 animate-pulse" />
              </div>
            </div>

            {/* D3 Sparkline */}
            <div className="mb-4">
              <SparklineChart bids={bids} />
            </div>

            {/* Bid history */}
            <div className="space-y-1.5">
              {history.map((bid, i) => (
                <motion.div
                  key={`${bid.amount}-${i}`}
                  className="flex items-baseline gap-3 rounded px-2 py-1"
                  initial={i === 0 ? { opacity: 0, y: -8 } : {}}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <span className="tabular-nums text-sm font-bold text-zinc-200">${bid.amount.toLocaleString()}</span>
                  <span className="text-xs text-zinc-500">{bid.bidder}</span>
                  <span className="ml-auto text-xs text-zinc-600">{bid.time}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
