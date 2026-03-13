import type { FC } from 'react'

interface Props {
  current: 1 | 2 | 3
  onStep:  (s: 1 | 2 | 3) => void
}

const STEPS = [
  { num: 1, label: 'Setup' },
  { num: 2, label: 'Lots' },
  { num: 3, label: 'Review' },
] as const

export const BuilderStepIndicator: FC<Props> = ({ current, onStep }) => {
  return (
    <div className="flex items-center gap-0 w-full max-w-sm">
      {STEPS.map((step, i) => {
        const done   = step.num < current
        const active = step.num === current

        return (
          <div key={step.num} className="flex flex-1 items-center">
            <button
              onClick={() => done && onStep(step.num)}
              disabled={!done}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                done
                  ? 'bg-orange-500 text-zinc-950 cursor-pointer'
                  : active
                  ? 'bg-zinc-100 text-zinc-900 ring-2 ring-orange-500'
                  : 'border border-zinc-700 bg-zinc-800 text-zinc-500'
              }`}
              title={step.label}
              aria-label={`Step ${step.num}: ${step.label}${done ? ' (completed)' : ''}`}
            >
              {done ? '✓' : step.num}
            </button>

            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 ${done ? 'bg-orange-500' : 'bg-zinc-800'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
