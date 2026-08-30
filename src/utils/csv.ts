import type { TableColumn, TableData } from '@/calculators/types'

export function tableToCsv(table: TableData): string {
  const headers = table.columns.map((c) => escapeCsv(c.label))
  const rows = table.rows.map((row) =>
    table.columns.map((col) => escapeCsv(String(row[col.key] ?? ''))).join(','),
  )
  return [headers.join(','), ...rows].join('\n')
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function buildCsvFromColumns(
  columns: TableColumn[],
  rows: Record<string, string | number>[],
): string {
  return tableToCsv({ columns, rows })
}
