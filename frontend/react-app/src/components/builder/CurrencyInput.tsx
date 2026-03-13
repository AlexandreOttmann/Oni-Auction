import type { FC, InputHTMLAttributes } from 'react'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  value:      string
  onChange:   (value: string) => void
  error?:     string
  label?:     string
  optional?:  boolean
}

export const CurrencyInput: FC<Props> = ({ value, onChange, error, label, optional, ...rest }) => {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs text-zinc-400">
          {label}
          {optional && <span className="ml-1 text-zinc-600">(optional)</span>}
        </label>
      )}
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">$</span>
        <input
          type="number"
          step="0.01"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded border bg-zinc-900 pl-7 pr-3 py-2 text-sm tabular-nums text-zinc-100 focus:outline-none transition-colors ${
            error ? 'border-red-700 focus:border-red-500' : 'border-zinc-700 focus:border-orange-500'
          }`}
          {...rest}
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
