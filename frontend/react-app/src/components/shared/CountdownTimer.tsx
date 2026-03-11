import { useState, useEffect, type FC } from 'react'

interface CountdownTimerProps {
  endsAt: string
  status: 'SCHEDULED' | 'ACTIVE' | 'CLOSING' | 'CLOSED'
  startsAt?: string  // required for meaningful SCHEDULED display
  className?: string
}

function formatSeconds(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0:00'
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export const CountdownTimer: FC<CountdownTimerProps> = ({ endsAt, startsAt, status, className = '' }) => {
  // For SCHEDULED use startsAt; for active/closing use endsAt
  const targetIso = status === 'SCHEDULED' ? (startsAt ?? '') : endsAt

  const [secondsLeft, setSecondsLeft] = useState(() =>
    targetIso ? Math.max(0, Math.floor((new Date(targetIso).getTime() - Date.now()) / 1000)) : 0
  )

  useEffect(() => {
    if (status === 'CLOSED' || !targetIso) return
    setSecondsLeft(Math.max(0, Math.floor((new Date(targetIso).getTime() - Date.now()) / 1000)))
    const interval = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.floor((new Date(targetIso).getTime() - Date.now()) / 1000)))
    }, 1000)
    return () => clearInterval(interval)
  }, [targetIso, status])

  if (status === 'CLOSED') {
    return <span className={`tabular-nums text-zinc-500 ${className}`}>—</span>
  }

  if (status === 'SCHEDULED') {
    if (!startsAt || secondsLeft <= 0) {
      return <span className={`text-violet-400 ${className}`}>Starting soon</span>
    }
    const h = Math.floor(secondsLeft / 3600)
    const label = h > 0 ? `starts in ${h}h` : `starts in ${Math.ceil(secondsLeft / 60)}m`
    return <span className={`text-violet-400 ${className}`}>{label}</span>
  }

  const isClosing = secondsLeft < 60
  const isWarning = secondsLeft < 5 * 60

  const colorClass = isClosing
    ? 'text-red-500'
    : isWarning
    ? 'text-amber-400'
    : 'text-zinc-400'

  const pulseClass = isClosing ? 'animate-pulse' : ''

  const ariaLabel = `Time remaining: ${Math.floor(secondsLeft / 60)} minutes ${secondsLeft % 60} seconds`

  return (
    <span
      className={`tabular-nums font-bold font-mono ${colorClass} ${pulseClass} ${className}`}
      aria-label={ariaLabel}
    >
      {formatSeconds(secondsLeft)}
      {status === 'CLOSING' && <span className="ml-1 text-xs">· CLOSING</span>}
    </span>
  )
}
