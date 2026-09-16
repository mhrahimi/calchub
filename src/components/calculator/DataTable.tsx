import { useEffect, useRef, useState } from 'react'
import type { TableData } from '@/calculators/types'
import { cn } from '@/utils/cn'
import { formatCurrency, formatPercent, formatNumber } from '@/utils/currency'

interface DataTableProps {
  table: TableData
  maxRows?: number
}

function formatCell(value: string | number, format?: string): string {
  if (typeof value === 'string') return value
  switch (format) {
    case 'currency':
      return formatCurrency(value)
    case 'percent':
      return formatPercent(value)
    case 'number':
      return formatNumber(value)
    default:
      return String(value)
  }
}

export function DataTable({ table, maxRows = 120 }: DataTableProps) {
  const rows = table.rows.slice(0, maxRows)
  const hasMore = table.rows.length > maxRows
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [canScrollMore, setCanScrollMore] = useState(false)
  const [hasScrolled, setHasScrolled] = useState(false)

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return

    const update = () => {
      const overflow = el.scrollWidth > el.clientWidth + 1
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2
      setCanScrollMore(overflow && !atEnd)
      if (el.scrollLeft > 2) setHasScrolled(true)
    }

    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [table.columns, rows.length])

  return (
    <div className="rounded-2xl border border-border bg-white overflow-hidden">
      {table.title && (
        <div className="px-4 py-3 border-b border-border bg-surface-lighter/50">
          <h3 className="text-sm font-medium text-text-primary">{table.title}</h3>
        </div>
      )}
      <div className="relative min-w-0">
        <div
          ref={scrollerRef}
          className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]"
        >
          <table className="w-max min-w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-lighter/30">
                {table.columns.map((col, colIndex) => (
                  <th
                    key={col.key}
                    className={cn(
                      'px-3 sm:px-4 py-3 font-medium text-text-secondary whitespace-nowrap',
                      col.align === 'right' ? 'text-right' : 'text-left',
                      colIndex === 0 &&
                        cn(
                          'sticky left-0 z-20 bg-surface-lighter',
                          hasScrolled && 'shadow-[4px_0_8px_-4px_rgba(16,42,102,0.18)]',
                        ),
                    )}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0">
                  {table.columns.map((col, colIndex) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-3 sm:px-4 py-2.5 tabular-nums text-text-primary whitespace-nowrap',
                        col.align === 'right' ? 'text-right' : 'text-left',
                        colIndex === 0 &&
                          cn(
                            'sticky left-0 z-10 bg-white',
                            hasScrolled && 'shadow-[4px_0_8px_-4px_rgba(16,42,102,0.18)]',
                          ),
                      )}
                    >
                      {formatCell(row[col.key], col.format)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {canScrollMore && (
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white to-transparent"
            aria-hidden="true"
          />
        )}
      </div>
      {canScrollMore && !hasScrolled && (
        <p className="px-4 py-2 text-xs text-text-muted border-t border-border">
          Swipe for more columns
        </p>
      )}
      {hasMore && (
        <p className="px-4 py-2 text-xs text-text-muted border-t border-border">
          Showing {maxRows} of {table.rows.length} rows. Export CSV for the full schedule.
        </p>
      )}
    </div>
  )
}
