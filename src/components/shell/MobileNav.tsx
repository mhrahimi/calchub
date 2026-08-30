import { NavLink, useLocation } from 'react-router-dom'
import { Home, Star, History, Bookmark, Settings } from 'lucide-react'
import { cn } from '@/utils/cn'

const tabs = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/favorites', label: 'Favorites', icon: Star },
  { to: '/history', label: 'History', icon: History },
  { to: '/saved', label: 'Saved', icon: Bookmark },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function MobileHeader() {
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <header className="lg:hidden sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-border px-4 py-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-primary">CalcHub</h1>
          {isHome && (
            <p className="text-xs text-text-muted">Every calculation. One place.</p>
          )}
        </div>
      </div>
    </header>
  )
}

export function MobileNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border safe-area-pb" aria-label="Main navigation">
      <div className="flex items-center justify-around py-2">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 px-3 py-2 min-w-[64px] rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                isActive ? 'text-primary' : 'text-text-muted',
              )
            }
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
