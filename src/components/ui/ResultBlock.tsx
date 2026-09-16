import { cn } from '@/utils/cn'

interface ResultBlockProps {
  label: string
  value: string
  sublabel?: string
  primary?: boolean
  className?: string
}

export function ResultBlock({ label, value, sublabel, primary, className }: ResultBlockProps) {
  return (
    <div
      className={cn(
        'rounded-2xl p-6',
        primary
          ? 'bg-surface-light border border-primary/20'
          : 'bg-white border border-border',
        className,
      )}
    >
      <p className="text-sm text-text-secondary mb-1">{label}</p>
      <p
        className={cn(
          'tabular-nums font-semibold text-primary break-all [overflow-wrap:anywhere]',
          primary ? 'text-2xl sm:text-3xl md:text-4xl' : 'text-xl',
        )}
      >
        {value}
      </p>
      {sublabel && <p className="text-sm text-text-muted mt-1">{sublabel}</p>}
    </div>
  )
}

interface MetricRowProps {
  label: string
  value: string
}

export function MetricRow({ label, value }: MetricRowProps) {
  return (
    <div className="flex flex-col items-start gap-0.5 py-3 border-b border-border last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="text-sm text-text-secondary shrink-0">{label}</span>
      <span className="text-sm font-medium tabular-nums text-text-primary min-w-0 break-all [overflow-wrap:anywhere] sm:text-right">
        {value}
      </span>
    </div>
  )
}
