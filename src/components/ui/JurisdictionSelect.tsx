import { useMemo, useState } from 'react'
import { listJurisdictions } from '@/tax/registry'
import type { TaxCountry } from '@/tax/types'
import { cn } from '@/utils/cn'

interface JurisdictionSelectProps {
  country: TaxCountry
  value: string
  onChange: (id: string) => void
  label?: string
  error?: string
  className?: string
}

export function JurisdictionSelect({
  country,
  value,
  onChange,
  label = 'State / province',
  error,
  className,
}: JurisdictionSelectProps) {
  const [query, setQuery] = useState('')
  const options = useMemo(() => listJurisdictions(country), [country])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.name.toLowerCase().includes(q) || o.id.toLowerCase().includes(q))
  }, [options, query])

  const selected = options.find((o) => o.id === value)

  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="block text-sm font-medium text-text-primary">{label}</label>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={selected ? selected.name : 'Search jurisdictions...'}
        className={cn(
          'w-full h-11 rounded-xl border border-border bg-white px-3 text-sm text-text-primary',
          'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
          error && 'border-red-400',
        )}
      />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full h-11 rounded-xl border border-border bg-white px-3 text-sm text-text-primary',
          'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
          error && 'border-red-400',
        )}
      >
        <option value="">Select...</option>
        {filtered.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
