import { NavLink } from 'react-router-dom'
import {
  Home,
  Star,
  History,
  Bookmark,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { CATEGORIES } from '@/calculators/registry'
import { useState } from 'react'

const mainNav = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/favorites', label: 'Favorites', icon: Star },
  { to: '/history', label: 'History', icon: History },
  { to: '/saved', label: 'Saved', icon: Bookmark },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col border-r border-border bg-white/80 backdrop-blur-sm h-full transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-64',
      )}
    >
      <div className="p-5 border-b border-border flex items-center justify-between">
        {!collapsed && (
          <div>
            <h1 className="font-bold text-primary text-lg">CalcHub</h1>
            <p className="text-xs text-text-muted">Calculator hub</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg hover:bg-surface-lighter text-text-muted"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {mainNav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors',
                isActive
                  ? 'bg-surface-light text-primary font-medium'
                  : 'text-text-secondary hover:bg-surface-lighter hover:text-text-primary',
              )
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}

        {!collapsed && (
          <div className="pt-4 pb-2">
            <p className="px-3 text-xs uppercase tracking-wider text-text-muted mb-2">Categories</p>
            {CATEGORIES.map((cat) => (
              <NavLink
                key={cat.slug}
                to={`/category/${cat.slug}`}
                className={({ isActive }) =>
                  cn(
                    'block px-3 py-2 rounded-lg text-sm transition-colors',
                    isActive
                      ? 'text-primary font-medium bg-surface-light'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-lighter',
                  )
                }
              >
                {cat.title}
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      <div className="p-3 border-t border-border">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors',
              isActive
                ? 'bg-surface-light text-primary font-medium'
                : 'text-text-secondary hover:bg-surface-lighter',
            )
          }
        >
          <Settings className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </NavLink>
      </div>
    </aside>
  )
}
