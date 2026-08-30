import type { TableData } from '@/calculators/types'
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

  return (
    <div className="rounded-2xl border border-border bg-white overflow-hidden">
      {table.title && (
        <div className="px-4 py-3 border-b border-border bg-surface-lighter/50">
          <h3 className="text-sm font-medium text-text-primary">{table.title}</h3>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-lighter/30 sticky top-0">
              {table.columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 font-medium text-text-secondary whitespace-nowrap ${
                    col.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-border/50 last:border-0">
                {table.columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-2.5 tabular-nums text-text-primary whitespace-nowrap ${
                      col.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {formatCell(row[col.key], col.format)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasMore && (
        <p className="px-4 py-2 text-xs text-text-muted border-t border-border">
          Showing {maxRows} of {table.rows.length} rows. Export CSV for the full schedule.
        </p>
      )}
    </div>
  )
}
