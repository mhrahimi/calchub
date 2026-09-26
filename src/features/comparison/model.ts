import { withBaseline } from '@/utils/chartPresentation'
import type { ExportPayload } from '@/exports/types'
import { makeField } from '@/exports/reportFields'
import { inputsDiffer } from '@/exports/provenance'

export interface ComparisonSnapshot { name: string; payload: ExportPayload }
export function comparisonIssue(current: ExportPayload, baseline: ExportPayload): string | null {
  if (current.calculatorId !== baseline.calculatorId) return 'Choose a result from this calculator.'
  if (!current.provenance?.currency || !baseline.provenance?.currency) return 'Recalculate this saved result to record its currency and units before comparing.'
  if (current.provenance.currency !== baseline.provenance.currency) return 'Currencies differ. CalcHub does not convert currencies for comparison.'
  if (current.metadata?.modelVersion !== baseline.metadata?.modelVersion) return 'Calculation versions differ. Recalculate the saved result before comparing.'
  for (const key of ['mode','solveFor','country','angleUnit','fromUnit','toUnit','category']) {
    if (current.inputs[key] !== baseline.inputs[key]) return 'Choose the same calculation mode, jurisdiction, and units.'
  }
  if (inputsDiffer(current.provenance.units, baseline.provenance.units)) return 'Contribution timing, frequency, or units differ. Match these conventions before comparing.'
  return null
}

export function comparisonRows(current: ExportPayload, baseline: ExportPayload) {
  return (current.fields ?? []).flatMap(field => {
    const before = baseline.fields?.find(f => f.key === field.key && f.kind === field.kind && f.unit === field.unit)
    if (!before) return []
    const numeric = typeof field.raw === 'number' && typeof before.raw === 'number' && Number.isFinite(field.raw) && Number.isFinite(before.raw)
    let change = field.display === before.display ? 'Unchanged' : 'Changed'
    if (numeric) {
      const delta = (field.raw as number) - (before.raw as number)
      const percent = field.kind === 'percent' || field.kind === 'fraction'
      const value = makeField([field.key,field.label,percent?'number':field.kind,percent?'percentage points':field.unit,field.precision],field.kind==='fraction'?delta*100:delta,current.provenance!)
      change = `${delta > 0 ? '+' : ''}${value.display}`
    }
    return [{ key:field.key, label:field.label, current:field.display, baseline:before.display, change, primary:field.primary }]
  })
}

/** Comparison exports carry both the baseline inputs and the displayed differences. */
export function withComparison(current:ExportPayload, baseline:ComparisonSnapshot|null):ExportPayload {
  if (!baseline || comparisonIssue(current,baseline.payload)) return current
  return {...current,
    charts:withBaseline(current.charts??[],baseline.payload.charts??[],baseline.name),
    extraTables:[...(current.extraTables??[]),{
      title:`Comparison with ${baseline.name} (calculated ${baseline.payload.date})`,
      columns:[{key:'label',label:'Metric'},{key:'baseline',label:'Baseline',align:'right'},{key:'current',label:'Current',align:'right'},{key:'change',label:'Change',align:'right'}],
      rows:comparisonRows(current,baseline.payload).map(({label,baseline,current,change})=>({label,baseline,current,change})),
    },{
      title:'Baseline inputs',columns:[{key:'label',label:'Input'},{key:'value',label:'Baseline value'}],
      rows:(baseline.payload.inputFields??[]).map(f=>({label:f.label,value:f.display})),
    }],
  }
}
