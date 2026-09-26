import { displayNumber } from '@/utils/numberFormat'
import { CPI_VERSION } from '@/data/cpi/us-cpi-u'
import type { AppSettings, CalculationExplanation } from '@/calculators/types'
import type { ResultMetadata } from './resultMetadata'
import { stringifyCalculationData } from '@/utils/calculationJson'

export interface CalculationProvenance {
  currency: string | null
  locale: string | null
  measurementSystem: string | null
  calculatedAt: string
  modelVersion: string
  taxConfigVersion?: string
  dataRevision?: string
  units: Record<string, string>
  precision: string
  assumptions: string[]
}

export function captureProvenance(id: string, inputs: object, metadata: ResultMetadata, settings: AppSettings, results: unknown, calculatedAt = new Date().toISOString()): CalculationProvenance {
  const input = inputs as Record<string, unknown>
  const r = results as Record<string, unknown>
  const units = Object.fromEntries(Object.entries(input).filter(([key,value]) => /(?:Unit|Frequency|Timing|System)$/.test(key) && typeof value === 'string').map(([key,value])=>[key,String(value)]))
  // Jurisdiction-specific calculations are denominated in that jurisdiction's money.
  const currency = ['income-tax','salary','mortgage'].includes(id) && input.country ? (input.country === 'CA' ? 'CAD' : 'USD') : id === 'inflation' && input.mode === 'historical' ? 'USD' : settings.currency
  return { currency, locale: settings.numberFormat, measurementSystem: settings.measurementSystem, calculatedAt, modelVersion: metadata.modelVersion,
    taxConfigVersion: typeof r.taxConfigVersion === 'string' ? r.taxConfigVersion : undefined,
    dataRevision: id === 'inflation' && input.mode === 'historical' ? CPI_VERSION : undefined,
    units, precision: 'Currency displayed to 2 decimals; calculations retain model precision. Payment ledgers round to cents at events.', assumptions: [...metadata.assumptions] }
}

export function legacyProvenance(modelVersion: string, calculatedAt = ''): CalculationProvenance {
  return { currency:null, locale:null, measurementSystem:null, calculatedAt, modelVersion, units:{}, precision:'Not recorded', assumptions:[] }
}

export function snapshotCurrency(value: number, p?: CalculationProvenance): string {
  const locale = p?.locale ?? 'en-US'
  if (!Number.isFinite(value)) return 'Not defined'
  const number = displayNumber(value, locale, 2, true)
  return `${p?.currency ?? 'Currency not recorded'} ${number}`
}

export function snapshotExplanation(explanation: CalculationExplanation, p: CalculationProvenance): CalculationExplanation {
  const text = (v: string) => v.replace(/\$/g, `${p.currency ?? '[currency not recorded]'} `)
  return { ...explanation, steps: explanation.steps.map(s=>({...s, expression:s.expression && text(s.expression), result:s.result && text(s.result)})), assumptions:explanation.assumptions?.map(text) }
}

export function inputsDiffer(a: unknown, b: unknown): boolean {
  const canonical = (v: unknown): unknown => Array.isArray(v) ? v.map(canonical) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,canonical(x)])) : v
  return stringifyCalculationData(canonical(a)) !== stringifyCalculationData(canonical(b))
}
