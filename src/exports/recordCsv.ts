import type { HistoryRecord, SavedCalculation } from '@/calculators/types'
import type { ExportPayload } from './types'
import { buildExportPayloadFromRecord } from './buildPayload'
import { downloadCsv } from '@/utils/csv'

/** A single rectangular, long-form table. Raw numeric values remain spreadsheet-ready. */
export function payloadToCsv(payload:ExportPayload):string {
  const rows:string[][]=[['Section','Row','Field','Value','Unit','Type','Status']]
  const add=(section:string,row:string,key:string,value:unknown,unit='',type='text')=>{
    const absent=value===null||value===undefined||typeof value==='number'&&!Number.isFinite(value)
    let text=absent?'':String(value)
    // Prevent spreadsheet formula execution in user-supplied text without changing numbers.
    if(type==='text'&&/^[=+\-@]/.test(text))text="'"+text
    rows.push([section,row,key,text,unit,type,absent?'not applicable':'available'])
  }
  add('Provenance','','Calculator',payload.title)
  add('Provenance','','Scenario',payload.label??'')
  add('Provenance','','Calculated at',payload.date)
  add('Provenance','','Exported at',payload.exportedAt??new Date().toISOString())
  const p=payload.provenance
  for(const [key,value] of Object.entries({Currency:p?.currency,Locale:p?.locale,'Measurement system':p?.measurementSystem,'Model version':p?.modelVersion??payload.metadata?.modelVersion,'Tax revision':p?.taxConfigVersion,'Data revision':p?.dataRevision,Precision:p?.precision}))add('Provenance','',key,value)
  for(const [key,value] of Object.entries(p?.units??{}))add('Units','',key,value)
  for(const [section,fields] of [['Inputs',payload.inputFields],['Results',payload.fields]] as const) for(const f of fields??[])add(section,'',f.label,f.kind==='fraction'&&typeof f.raw==='number'?f.raw*100:f.raw,f.unit,f.kind==='fraction'?'percent':f.kind)
  if(!payload.fields)for(const f of payload.resultsSummary)add('Results','',f.label,f.value)
  for(const [index,table] of [payload.table,...(payload.extraTables??[])].filter(Boolean).entries()) {
    for(const [i,row] of table!.rows.entries())for(const col of table!.columns){const value=row[col.key];add(table!.title??`Schedule ${index+1}`,String(i+1),col.label,col.format==='percent'&&typeof value==='number'?value*100:value,col.format==='currency'?p?.currency??'currency not recorded':col.format==='percent'?'%':'',col.format??(typeof value==='number'?'number':'text'))}
  }
  for(const [i,assumption] of (payload.explanation?.assumptions??[]).entries())add('Assumptions',String(i+1),'Assumption',assumption)
  for(const [i,warning] of (payload.metadata?.warnings??[]).entries())add('Warnings',String(i+1),'Warning',warning)
  for(const [i,source] of (payload.metadata?.sources??[]).entries())add('Sources',String(i+1),'Source',source)
  return rows.map(row=>row.map(v=>`"${v.replace(/"/g,'""')}"`).join(',')).join('\r\n')
}
export async function exportRecordCsv(record:HistoryRecord|SavedCalculation):Promise<void> {
  downloadCsv(`${record.calculatorId}.csv`,payloadToCsv(await buildExportPayloadFromRecord(record)))
}
