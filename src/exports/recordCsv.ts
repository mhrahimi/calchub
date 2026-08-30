import { getCalculatorById } from '@/calculators/registry'
import type { HistoryRecord, SavedCalculation } from '@/calculators/types'
import { buildExportPayloadFromRecord } from './buildPayload'
import { downloadCsv, tableToCsv } from '@/utils/csv'

export async function exportRecordCsv(record: HistoryRecord | SavedCalculation): Promise<void> {
  const calc = getCalculatorById(record.calculatorId)
  const { getEngineExportFns } = await import('./engineRegistry')
  const engine = getEngineExportFns(record.calculatorId)
  const table = engine?.buildTable?.(record.results)
  if (table && table.rows.length > 0) {
    const name = 'name' in record ? record.name : record.label
    const base = name ?? calc?.title ?? record.calculatorId
    downloadCsv(`${base.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()}.csv`, tableToCsv(table))
    return
  }
  const payload = await buildExportPayloadFromRecord(record)
  const rows = [
    ['Field', 'Value'],
    ...Object.entries(payload.inputs).map(([k, v]) => [k, String(v)]),
    ['', ''],
    ['Metric', 'Value'],
    ...payload.resultsSummary.map((r) => [r.label, r.value]),
  ]
  const csv = rows.map((r) => r.map(escapeCsv).join(',')).join('\n')
  downloadCsv(`${record.calculatorId}-export.csv`, csv)
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
