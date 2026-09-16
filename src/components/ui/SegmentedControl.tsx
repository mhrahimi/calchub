import { cn } from '@/utils/cn'

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  className?: string
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        'flex w-full max-w-full rounded-full bg-surface-lighter p-1 border border-border',
        className,
      )}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex-1 min-w-0 min-h-11 px-2 sm:px-4 py-2 text-xs sm:text-sm leading-tight text-center rounded-full transition-all duration-200 whitespace-normal',
            value === opt.value
              ? 'bg-white text-primary font-medium shadow-sm border border-border'
              : 'text-text-secondary hover:text-text-primary',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
