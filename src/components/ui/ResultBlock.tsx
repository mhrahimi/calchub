import { useContext } from 'react'
import { SnapshotFormatContext } from '@/components/calculator/SnapshotFormat'
import { ResultDetailsContext } from '@/components/calculator/ResultDetailsContext'
import { displayMetric } from '@/utils/numberFormat'
import { cn } from '@/utils/cn'

interface ResultBlockProps {
  label: string
  value: string | number
  sublabel?: string
  primary?: boolean
  className?: string
}

export function ResultBlock({ label, value, sublabel, primary, className }: ResultBlockProps) {
  const provenance = useContext(SnapshotFormatContext)
  const details = useContext(ResultDetailsContext)
  if (primary && details) return null
  return (
    <div
      className={cn(
        'py-3',
        primary
          ? 'bg-surface-lighter p-5 rounded-xl'
          : 'border-b border-border/60',
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
        {displayMetric(value, provenance?.locale ?? 'en-US')}
      </p>
      {sublabel && <p className="text-sm text-text-muted mt-1">{sublabel}</p>}
    </div>
  )
}

interface MetricRowProps {
  label: string
  value: string | number
}

export function MetricRow({ label, value }: MetricRowProps) {
  const provenance = useContext(SnapshotFormatContext)
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-baseline gap-4 py-2.5 border-b border-border/60 last:border-0">
      <span className="text-sm text-text-secondary shrink-0">{label}</span>
      <span className="text-sm font-medium tabular-nums text-text-primary min-w-0 break-all [overflow-wrap:anywhere] text-right">
        {displayMetric(value, provenance?.locale ?? 'en-US')}
      </span>
    </div>
  )
}
