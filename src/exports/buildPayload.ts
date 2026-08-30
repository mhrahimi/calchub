import { getCalculatorById } from '@/calculators/registry'
import type { CalculationExplanation, ChartData, TableData } from '@/calculators/types'
import type { ExportPayload, ExportRecord } from './types'

const DISCLAIMER =
  'Calculations are for informational purposes only and are not tax, legal, or investment advice.'

function flattenInputs(inputs: unknown): Record<string, unknown> {
  if (!inputs || typeof inputs !== 'object') return { value: inputs }
  const out: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(inputs as Record<string, unknown>)) {
    if (val === null || val === undefined) continue
    if (typeof val === 'object' && !Array.isArray(val)) {
      out[key] = JSON.stringify(val)
    } else if (Array.isArray(val)) {
      out[key] = val.length > 3 ? `[${val.length} items]` : JSON.stringify(val)
    } else {
      out[key] = val
    }
  }
  return out
}

function flattenResults(results: unknown): Array<{ label: string; value: string }> {
  if (!results || typeof results !== 'object') {
    return [{ label: 'Result', value: String(results ?? '') }]
  }
  const rows: Array<{ label: string; value: string }> = []
  for (const [key, val] of Object.entries(results as Record<string, unknown>)) {
    if (val === null || val === undefined) continue
    if (Array.isArray(val)) {
      if (val.length <= 5 && val.every((v) => typeof v !== 'object')) {
        rows.push({ label: key, value: val.join(', ') })
      }
      continue
    }
    if (typeof val === 'object') continue
    if (typeof val === 'number') {
      rows.push({
        label: key,
        value: Number.isInteger(val) ? val.toLocaleString() : val.toLocaleString(undefined, { maximumFractionDigits: 4 }),
      })
    } else {
      rows.push({ label: key, value: String(val) })
    }
  }
  return rows.slice(0, 20)
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
    resultsSummary?: Array<{ label: string; value: string }>
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

  return {
    title: options?.title ?? calc?.title ?? record.calculatorId,
    calculatorId: record.calculatorId,
    date: record.createdAt,
    label: options?.label ?? record.label,
    inputs: flattenInputs(record.inputs),
    resultsSummary: options?.resultsSummary ?? flattenResults(record.results),
    explanation,
    table,
    charts,
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
  resultsSummary?: Array<{ label: string; value: string }>
}): ExportPayload {
  const calc = getCalculatorById(params.calculatorId)
  return {
    title: calc?.title ?? params.calculatorId,
    calculatorId: params.calculatorId,
    date: new Date().toISOString(),
    inputs: flattenInputs(params.inputs),
    resultsSummary: params.resultsSummary ?? flattenResults(params.results),
    explanation: params.explain(params.inputs, params.results),
    table: params.buildTable?.(params.results),
    charts: params.buildCharts?.(params.results),
    shareText: params.shareText,
    disclaimer: DISCLAIMER,
  }
}
