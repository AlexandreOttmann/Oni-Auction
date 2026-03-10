import type { FC } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const NAV_ITEMS = [
  { label: 'Dashboard', icon: '▦', path: '/dashboard', enabled: true },
  { label: 'Auctions', icon: '⚒', path: '/auctions', enabled: true },
  { label: 'Lots', icon: '📦', path: '/lots', enabled: false },
  { label: 'Users', icon: '👤', path: '/users', enabled: false },
]

export const AdminSidebar: FC = () => {
  const location = useLocation()
  const { user, logout } = useAuth()

  const initials = user?.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() ?? 'A'

  return (
    <aside className="flex h-full w-[240px] shrink-0 flex-col border-r border-zinc-800 bg-[#18181B]">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-6">
        <span className="text-orange-500">◆</span>
        <span className="text-base font-bold tracking-tight text-zinc-50">ONI</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 px-3">
        <p className="px-3 pb-1 pt-4 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
          Manage
        </p>
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <div key={item.label} className="group relative">
              <Link
                to={item.enabled ? item.path : '#'}
                className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors
                  ${isActive ? 'border-l-2 border-orange-500 bg-zinc-800 text-zinc-50 font-semibold' : ''}
                  ${!isActive && item.enabled ? 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-50' : ''}
                  ${!item.enabled ? 'cursor-not-allowed text-zinc-600' : ''}
                `}
                onClick={(e) => !item.enabled && e.preventDefault()}
                aria-disabled={!item.enabled}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
                {!item.enabled && (
                  <span className="ml-auto text-[10px] text-zinc-700">soon</span>
                )}
              </Link>
            </div>
          )
        })}
      </nav>

      {/* User block */}
      <div className="mt-auto border-t border-zinc-800 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-800 text-xs font-bold text-zinc-50">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-200">{user?.name ?? 'Admin'}</p>
            <span className="rounded-full bg-violet-950 px-2 py-0.5 text-[11px] font-semibold text-violet-400">
              Admin
            </span>
          </div>
          <button
            onClick={logout}
            className="ml-auto text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            title="Sign out"
          >
            ⎋
          </button>
        </div>
      </div>
    </aside>
  )
}
