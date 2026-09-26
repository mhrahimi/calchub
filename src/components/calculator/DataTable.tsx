import { displayNumber, displayMetric } from '@/utils/numberFormat'
import { useContext } from 'react'
import { CurrencyDisplayContext, SnapshotFormatContext } from './SnapshotFormat'
import { snapshotCurrency, type CalculationProvenance, type CurrencyDisplay } from '@/exports/provenance'
import { useEffect, useRef, useState } from 'react'
import type { TableData } from '@/calculators/types'
import { cn } from '@/utils/cn'

interface DataTableProps {
  table: TableData
  maxRows?: number
  scrollable?: boolean
}

function formatCell(value: string | number, format?: string, p?: CalculationProvenance, precision?: number, unit?:string, currencyDisplay: CurrencyDisplay = 'code'): string {
  if (typeof value === 'string') return format==='text'||format==='date'?value:displayMetric(value,p?.locale??'en-US')
  if (!Number.isFinite(value)) return value===Infinity?'No upper limit':'Not defined'
  if (format === 'currency') return snapshotCurrency(value,p,currencyDisplay)
  if (format === 'percent') return displayNumber(value*100,p?.locale??'en-US',precision??2,true)+'%'
  return displayNumber(value,p?.locale??'en-US',precision??(Number.isInteger(value)?0:4))+(unit?` ${unit}`:'')
}

export function DataTable({ table, maxRows = 120, scrollable = false }: DataTableProps) {
  const provenance = useContext(SnapshotFormatContext)
  const currencyDisplay = useContext(CurrencyDisplayContext)
  const [page,setPage] = useState(0)
  useEffect(()=>setPage(0),[table.title,table.rows.length])
  const currentPage = Math.min(page, Math.max(0, Math.ceil(table.rows.length / maxRows)-1))
  const rows = scrollable ? table.rows : table.rows.slice(currentPage * maxRows, (currentPage + 1) * maxRows)
  const hasMore = !scrollable && table.rows.length > maxRows
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
    <div className="border-t border-border overflow-hidden">
      {table.title && (
        <div className="py-4">
          <h3 className="text-sm font-semibold text-text-primary">{table.title}</h3>
        </div>
      )}
      <div className="relative min-w-0">
        <div
          ref={scrollerRef}
          className={cn('overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]', scrollable && 'h-96 overflow-y-auto overscroll-y-contain rounded-lg border border-border')}
          role={scrollable ? 'region' : undefined}
          aria-label={scrollable ? table.title ?? 'Scrollable data table' : undefined}
          tabIndex={scrollable ? 0 : undefined}
        >
          <table className="w-max min-w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-lighter/30">
                {table.columns.map((col, colIndex) => (
                  <th
                    key={col.key}
                    className={cn(
                      'px-3 sm:px-4 py-3 font-medium text-text-secondary whitespace-nowrap',
                      scrollable && 'sticky top-0 z-20 bg-surface-lighter',
                      (col.align === 'right' || (!col.align && table.rows.some(row=>typeof row[col.key]==='number'))) ? 'text-right' : 'text-left',
                      colIndex === 0 &&
                        cn(
                          scrollable ? 'sticky left-0 top-0 z-30 bg-surface-lighter' : 'sticky left-0 z-20 bg-surface-lighter',
                          hasScrolled && 'shadow-[4px_0_8px_-4px_rgba(16,42,102,0.18)]',
                        ),
                    )}
                  >
                    {col.label}{col.format==='currency'&&currencyDisplay==='code'?` (${provenance?.currency??'currency not recorded'})`:''}
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
                        (col.align === 'right' || (!col.align && table.rows.some(row=>typeof row[col.key]==='number'))) ? 'text-right' : 'text-left',
                        colIndex === 0 &&
                          cn(
                            'sticky left-0 z-10 bg-white',
                            hasScrolled && 'shadow-[4px_0_8px_-4px_rgba(16,42,102,0.18)]',
                          ),
                      )}
                    >
                      {formatCell(row[col.key], col.format, provenance, col.precision, col.unit, currencyDisplay)}
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
          Rows {currentPage * maxRows + 1}–{Math.min((currentPage+1)*maxRows,table.rows.length)} of {table.rows.length}.
          <button className="ml-3 underline min-h-11" disabled={currentPage===0} onClick={()=>setPage(currentPage-1)}>Previous rows</button>
          <button className="ml-3 underline min-h-11" disabled={(currentPage+1)*maxRows>=table.rows.length} onClick={()=>setPage(currentPage+1)}>Next rows</button>
        </p>
      )}
    </div>
  )
}
