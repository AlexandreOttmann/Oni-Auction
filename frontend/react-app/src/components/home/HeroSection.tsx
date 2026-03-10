import { useState, useEffect, type FC } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { BidTickerBackground } from './BidTickerBackground'

const HEADLINE_WORDS_L1 = ['The', 'auction', 'room,']
const HEADLINE_WORDS_L2 = ['rebuilt', 'for', 'procurement.']

export const HeroSection: FC = () => {
  const [showScrollHint, setShowScrollHint] = useState(true)

  useEffect(() => {
    const onScroll = () => { if (window.scrollY > 20) setShowScrollHint(false) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#09090B]">
      {/* Grid dot pattern */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <BidTickerBackground density={20} />

      <div className="relative z-10 mx-auto max-w-[680px] px-6 text-center">
        {/* Diamond */}
        <motion.div
          className="mb-8 text-4xl text-orange-500"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: [1, 1.08, 1], opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1, scale: { repeat: Infinity, duration: 2, ease: 'easeInOut', repeatDelay: 0 } }}
        >
          ◆
        </motion.div>

        {/* Headline line 1 */}
        <h1 className="mb-2 text-[clamp(2.5rem,6vw,4.5rem)] font-extrabold leading-tight text-zinc-50">
          <span className="flex flex-wrap justify-center gap-x-3">
            {HEADLINE_WORDS_L1.map((word, i) => (
              <motion.span
                key={word}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 + i * 0.06, ease: [0, 0, 0.2, 1] }}
              >
                {word}
              </motion.span>
            ))}
          </span>
          {/* Line 2 with gradient "rebuilt" */}
          <span className="flex flex-wrap justify-center gap-x-3">
            {HEADLINE_WORDS_L2.map((word, i) => (
              <motion.span
                key={word}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.38 + i * 0.06, ease: [0, 0, 0.2, 1] }}
                className={word === 'rebuilt' ? 'bg-gradient-to-r from-orange-400 to-violet-400 bg-clip-text text-transparent' : ''}
              >
                {word}
              </motion.span>
            ))}
          </span>
        </h1>

        {/* Subline */}
        <motion.p
          className="mx-auto mt-6 max-w-[480px] text-base leading-relaxed text-zinc-400"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.6, ease: [0, 0, 0.2, 1] }}
        >
          Real-time English and Dutch auctions for supply chain teams.
          Live bids. Instant updates. No refresh needed.
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="mt-10 flex items-center justify-center gap-6"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.75 }}
        >
          <motion.button
            className="rounded-full bg-orange-500 px-8 py-3 text-sm font-bold text-[#09090B] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-[#09090B]"
            whileHover={{ scale: 1.02, backgroundColor: '#FB923C' }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            Request Access
          </motion.button>

          <Link to="/login">
            <motion.span
              className="flex items-center gap-1 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
              whileHover="hover"
              initial="rest"
            >
              Sign In
              <motion.span
                variants={{ rest: { x: 0 }, hover: { x: 4 } }}
                transition={{ duration: 0.15 }}
              >
                →
              </motion.span>
            </motion.span>
          </Link>
        </motion.div>
      </div>

      {/* Scroll chevron */}
      <AnimatePresence>
        {showScrollHint && (
          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 text-zinc-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, y: [0, 6, 0] }}
            exit={{ opacity: 0 }}
            transition={{ y: { repeat: Infinity, duration: 1.4 }, opacity: { duration: 0.3 } }}
          >
            ⌄
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
