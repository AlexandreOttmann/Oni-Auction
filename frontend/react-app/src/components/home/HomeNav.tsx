import { useState, useEffect, type FC } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'

export const HomeNav: FC = () => {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 flex h-[60px] items-center justify-between px-6"
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
        backgroundColor: scrolled ? 'rgba(24,24,27,0.9)' : 'rgba(9,9,11,0)',
        backdropFilter: scrolled ? 'blur(12px)' : 'blur(0px)',
      }}
      transition={{ duration: 0.25 }}
    >
      <Link to="/" className="flex items-center gap-2">
        <motion.span
          className="text-xl text-orange-500"
          initial={{ rotate: 0 }}
          animate={{ rotate: 45 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30, delay: 0.1 }}
          whileHover={{ rotate: 90 }}
        >
          ◆
        </motion.span>
        <span className="text-lg font-bold tracking-tight text-zinc-50">ONI</span>
      </Link>

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
    </motion.nav>
  )
}
