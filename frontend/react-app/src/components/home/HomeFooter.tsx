import type { FC } from 'react'

export const HomeFooter: FC = () => (
  <footer className="flex h-20 items-center justify-between border-t border-zinc-800 bg-[#18181B] px-8">
    <div className="flex items-center gap-2">
      <span className="text-orange-500">◆</span>
      <span className="text-sm font-bold tracking-tight text-zinc-50">ONI</span>
    </div>
    <p className="text-xs text-zinc-600">© 2026 Oni. All rights reserved.</p>
  </footer>
)
