import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { searchCalculators } from '@/calculators/registry'
import { cn } from '@/utils/cn'

interface SearchBarProps {
  placeholder?: string
  className?: string
  autoFocus?: boolean
}

export function SearchBar({
  placeholder = 'Search calculators or calculations...',
  className,
  autoFocus,
}: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const results = query.trim() ? searchCalculators(query) : []

  const handleSelect = useCallback(
    (route: string) => {
      navigate(route)
      setQuery('')
      setOpen(false)
    },
    [navigate],
  )

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full h-12 pl-12 pr-4 rounded-full border border-border bg-white text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-border rounded-2xl shadow-[var(--shadow-soft)] overflow-hidden z-50">
          {results.slice(0, 8).map((calc) => (
            <button
              key={calc.id}
              onMouseDown={() => handleSelect(calc.route)}
              className="w-full px-4 py-3 text-left hover:bg-surface-lighter transition-colors border-b border-border last:border-0"
            >
              <p className="font-medium text-text-primary text-sm">{calc.title}</p>
              <p className="text-xs text-text-muted line-clamp-1">{calc.description}</p>
            </button>
          ))}
        </div>
      )}

      {open && query.trim() && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-border rounded-2xl shadow-[var(--shadow-soft)] p-4 z-50">
          <p className="text-sm text-text-secondary text-center">No calculators found for &ldquo;{query}&rdquo;</p>
        </div>
      )}
    </div>
  )
}
