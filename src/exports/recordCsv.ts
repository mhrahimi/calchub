import type { HistoryRecord, SavedCalculation } from '@/calculators/types'
import type { ExportPayload } from './types'
import { buildExportPayloadFromRecord } from './buildPayload'
import { downloadCsv, tableToCsv } from '@/utils/csv'
export function payloadToCsv(payload:ExportPayload):string {
  const rows=[['Field','Value'], ...Object.entries(payload.inputs).map(([k,v])=>[k,String(v)]),
    ...Object.entries(payload.metadata??{}).map(([k,v])=>[k,JSON.stringify(v)]),
    ...payload.resultsSummary.map(r=>[r.label,r.value]),['Full result (JSON)',JSON.stringify(payload.rawResults??null)]]
  return rows.map(r=>r.map(v=>`"${v.replace(/"/g,'""')}"`).join(',')).join('\n') + (payload.table?'\n\n'+tableToCsv(payload.table):'')
}
export async function exportRecordCsv(record:HistoryRecord|SavedCalculation):Promise<void> {
  const payload=await buildExportPayloadFromRecord(record)
  downloadCsv(`${record.calculatorId}-export.csv`,payloadToCsv(payload))
}
