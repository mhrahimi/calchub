import { ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'

interface SelectProps {
  label?: string
  id?: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  error?: string
  className?: string
}

export function Select({ label, id, value, onChange, options, error, className }: SelectProps) {
  const fieldId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className={cn('space-y-1.5 min-w-0', className)}>
      {label && (
        <label htmlFor={fieldId} className="block text-sm font-medium text-text-primary">
          {label}
        </label>
      )}
      <div className="relative min-w-0">
        <select
          id={fieldId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'w-full h-11 rounded-xl border border-border bg-white pl-3 pr-10 text-text-primary text-base',
            'appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
            error && 'border-red-400',
          )}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
          aria-hidden="true"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
