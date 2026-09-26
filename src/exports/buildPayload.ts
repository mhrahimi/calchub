import { presentCharts } from '@/utils/chartPresentation'
import { inputFields, resultFields } from './reportFields'
export { humanizeKey } from './reportFields'
import { legacyProvenance, snapshotExplanation } from './provenance'
import { resultMetadata } from './resultMetadata'
import { stringifyCalculationData } from '@/utils/calculationJson'
import { getCalculatorById } from '@/calculators/registry'
import type { CalculationExplanation, ChartData, TableData } from '@/calculators/types'
import type { ExportPayload, ExportRecord, ResultSummaryItem } from './types'

const DISCLAIMER =
  'Calculations are for informational purposes only and are not tax, legal, or investment advice.'

function flattenInputs(inputs: unknown): Record<string, unknown> {
  if (!inputs || typeof inputs !== 'object') return { value: inputs }
  const out: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(inputs as Record<string, unknown>)) {
    if (val === null || val === undefined) continue
    if (typeof val === 'object' && !Array.isArray(val)) {
      out[key] = stringifyCalculationData(val)
    } else if (Array.isArray(val)) {
      out[key] = stringifyCalculationData(val)
    } else {
      out[key] = val
    }
  }
  return out
}

export async function buildExportPayloadFromRecord(
  record: ExportRecord,
  options?: {
    title?: string
    label?: string
    shareText?: string
    explanation?: CalculationExplanation
    table?: TableData
    charts?: ChartData[]
    resultsSummary?: ResultSummaryItem[]
  },
): Promise<ExportPayload> {
  const calc = getCalculatorById(record.calculatorId)
  const { getEngineExportFns } = await import('./engineRegistry')
  const engine = getEngineExportFns(record.calculatorId)
  const explanation =
    options?.explanation ??
    (engine ? engine.explain(record.inputs, record.results) : undefined)
  const table = options?.table ?? (engine?.buildTable ? engine.buildTable(record.results) : undefined)
  const charts = options?.charts ?? (engine?.buildCharts ? engine.buildCharts(record.results) : undefined)

  const metadata = resultMetadata(record.calculatorId, record.results, explanation, true)
  const provenance = metadata.provenance ?? legacyProvenance(metadata.modelVersion,record.createdAt)
  const fields = resultFields(record.calculatorId,record.inputs,record.results,provenance,metadata.primaryResult)
  return {
    metadata, rawResults: record.results, provenance, fields, inputFields:inputFields(record.inputs,provenance), exportedAt:new Date().toISOString(),
    extraTables: additionalTables(record.calculatorId,record.results),
    title: options?.title ?? calc?.title ?? record.calculatorId,
    calculatorId: record.calculatorId,
    date: provenance.calculatedAt || record.createdAt,
    label: options?.label ?? (record as {name?:string}).name ?? record.label,
    inputs: flattenInputs(record.inputs),
    resultsSummary: options?.resultsSummary ?? fields.map(f=>({label:f.label,value:f.display,primary:f.primary})),
    explanation: metadata.explanation ?? snapshotExplanation(explanation ?? {title:"Method not recorded",steps:[]},provenance),
    table,
    charts: charts && presentCharts(record.calculatorId,record.inputs,record.results,charts,provenance),
    shareText: options?.shareText,
    disclaimer: DISCLAIMER,
  }
}

export function buildLiveExportPayload<TInput, TResult>(params: {
  calculatorId: string
  inputs: TInput
  results: TResult
  shareText?: string
  explain: (input: TInput, result: TResult) => CalculationExplanation
  buildTable?: (result: TResult) => TableData
  buildCharts?: (result: TResult) => ChartData[]
  resultsSummary?: ResultSummaryItem[]
}): ExportPayload {
  const calc = getCalculatorById(params.calculatorId)
  const metadata = resultMetadata(params.calculatorId, params.results, params.explain(params.inputs, params.results))
  const provenance = metadata.provenance ?? legacyProvenance(metadata.modelVersion)
  const fields = resultFields(params.calculatorId,params.inputs,params.results,provenance,metadata.primaryResult)
  return {
    metadata, rawResults: params.results, provenance, fields, inputFields:inputFields(params.inputs,provenance), exportedAt:new Date().toISOString(),
    extraTables: additionalTables(params.calculatorId,params.results),
    title: calc?.title ?? params.calculatorId,
    calculatorId: params.calculatorId,
    date: provenance.calculatedAt,
    inputs: flattenInputs(params.inputs),
    resultsSummary: params.resultsSummary ?? fields.map(f=>({label:f.label,value:f.display,primary:f.primary})),
    explanation: metadata.explanation ?? snapshotExplanation(params.explain(params.inputs, params.results),provenance),
    table: params.buildTable?.(params.results),
    charts: params.buildCharts ? presentCharts(params.calculatorId,params.inputs,params.results,params.buildCharts(params.results),provenance) : undefined,
    shareText: params.shareText,
    disclaimer: DISCLAIMER,
  }
}

function additionalTables(id:string,result:unknown):TableData[] {
  const r=result as Record<string,unknown>
  const tables:TableData[]=[]
  if ((id==='dcf'||id==='dcf-lbo')&&Array.isArray(r.sensitivity)&&r.sensitivity.length) tables.push({title:'Enterprise value sensitivity',columns:[{key:'wacc',label:'WACC (%)',format:'number'},{key:'growth',label:r.terminalMethod==='exitMultiple'?'Exit multiple (x)':'Growth (%)',format:'number'},{key:'ev',label:'Enterprise value',format:'currency'}],rows:r.sensitivity})
  if ((id==='lbo'||id==='dcf-lbo')&&Array.isArray(r.sourcesUses)) tables.push({title:'Sources and uses',columns:[{key:'item',label:'Item'},{key:'amount',label:'Amount',format:'currency'}],rows:r.sourcesUses})
  if(id==='gcf-lcm'&&Array.isArray(r.primeFactors))tables.push({title:'Prime factorizations',columns:[{key:'value',label:'Integer'},{key:'factors',label:'Factors'}],rows:r.primeFactors})
  return tables
}
