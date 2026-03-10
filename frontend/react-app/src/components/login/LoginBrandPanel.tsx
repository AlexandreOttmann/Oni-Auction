import { useEffect, useRef, type FC } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'motion/react'
import { ActivityHeatmap } from './ActivityHeatmap'
import { LiveBidFeed } from './LiveBidFeed'

const CountUp: FC<{ to: number; duration?: number }> = ({ to, duration = 0.8 }) => {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => Math.round(v))
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const controls = animate(count, to, { duration, ease: [0.4, 0, 0.2, 1] })
    const unsubscribe = rounded.on('change', (v) => {
      if (ref.current) ref.current.textContent = String(v)
    })
    return () => { controls.stop(); unsubscribe() }
  }, [to, duration, count, rounded])

  return <span ref={ref}>0</span>
}

export const LoginBrandPanel: FC = () => (
  <div className="relative hidden h-full flex-col justify-center overflow-hidden bg-[#09090B] px-12 lg:flex">
    {/* Grid dot texture */}
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    />

    <div className="relative z-10 max-w-lg">
      {/* Live stats header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <h2 className="mb-4 text-2xl font-bold text-zinc-50">
          <CountUp to={14} /> auctions running right now.
        </h2>

        <div className="mb-8 flex gap-6">
          {[
            { value: 47, label: 'active bidders' },
            { value: 312, label: 'bids this hour' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              className="flex items-center gap-2 text-sm text-zinc-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 + i * 0.15 }}
            >
              <span className="h-2 w-2 rounded-full bg-green-400" />
              <span className="tabular-nums font-semibold text-zinc-200">
                <CountUp to={stat.value} />
              </span>
              <span>{stat.label}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Heatmap */}
      <div className="mb-6">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
          Past 20 minutes
        </p>
        <ActivityHeatmap />
      </div>

      {/* Live bid feed */}
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
          Live activity
        </p>
        <LiveBidFeed />
      </div>
    </div>
  </div>
)
