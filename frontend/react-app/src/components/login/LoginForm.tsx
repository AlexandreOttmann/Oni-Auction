import { useState, type FC, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useAuth } from '../../hooks/useAuth'

export const LoginForm: FC = () => {
  const [email, setEmail] = useState('admin@oni.local')
  const [password, setPassword] = useState('oni-dev-password')
  const [showPassword, setShowPassword] = useState(false)
  const { login, isLoading, error, setError } = useAuth()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    await login(email, password)
  }

  const clearError = () => setError(null)

  return (
    <div className="flex h-full flex-col border-r border-zinc-800 bg-[#18181B] px-10 py-8">
      {/* Logo */}
      <div className="mb-16 flex items-center gap-2">
        <motion.span
          className="text-xl text-orange-500"
          initial={{ opacity: 0, rotate: 0 }}
          animate={{ opacity: 1, rotate: 45 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30, delay: 0.1 }}
        >
          ◆
        </motion.span>
        <span className="text-lg font-bold tracking-tight text-zinc-50">ONI</span>
      </div>

      {/* Headline */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <h1 className="text-[1.75rem] font-bold text-zinc-50">Welcome back.</h1>
        <p className="mt-1 text-sm text-zinc-400">Sign in to your workspace.</p>
      </motion.div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Email */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            Email address
          </label>
          <input
            type="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => { setEmail(e.target.value); clearError() }}
            placeholder="you@company.com"
            className="h-11 w-full rounded bg-[#27272A] border border-zinc-700 px-4 text-sm text-zinc-50 placeholder-zinc-600 focus:border-orange-600 focus:outline-none focus:ring-0 transition-colors"
          />
        </motion.div>

        {/* Password */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.38 }}
        >
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); clearError() }}
              placeholder="••••••••"
              className="h-11 w-full rounded bg-[#27272A] border border-zinc-700 px-4 pr-10 text-sm text-zinc-50 placeholder-zinc-600 focus:border-orange-600 focus:outline-none focus:ring-0 transition-colors"
            />
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              {showPassword ? '◎' : '●'}
            </button>
          </div>
        </motion.div>

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              role="alert"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="flex items-center gap-2 rounded border border-red-900 bg-red-950 px-4 py-3 text-xs text-red-400"
            >
              <span>✕</span>
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit */}
        <motion.button
          type="submit"
          disabled={isLoading}
          aria-busy={isLoading}
          aria-label={isLoading ? 'Signing in...' : 'Sign In'}
          className="mt-2 flex h-12 w-full items-center justify-center rounded-lg bg-orange-500 text-[15px] font-bold text-[#09090B] transition-colors hover:bg-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-[#18181B] disabled:cursor-not-allowed disabled:bg-orange-500/50"
          whileHover={isLoading ? {} : { scale: 1.01 }}
          whileTap={isLoading ? {} : { scale: 0.99 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          // @ts-expect-error motion types
          motionTransition={{ delay: 0.46 }}
        >
          {isLoading ? (
            <svg className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            'Sign In'
          )}
        </motion.button>
      </form>

      {/* Footer links */}
      <div className="mt-auto pt-8">
        <p className="text-center text-xs text-zinc-600">
          <button
            type="button"
            onClick={() => alert('Contact your admin to reset your password.')}
            className="hover:text-zinc-400 transition-colors"
          >
            Forgot password?
          </button>
        </p>
        <p className="mt-4 text-center text-xs text-zinc-600">
          New to Oni?{' '}
          <Link to="/" className="text-orange-500 hover:underline transition-colors">
            Request access →
          </Link>
        </p>
      </div>
    </div>
  )
}
