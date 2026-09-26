import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { getSavedCalculations } from '@/persistence/saved'
import { buildExportPayloadFromRecord } from '@/exports/buildPayload'
import type { ExportPayload } from '@/exports/types'
import type { SavedCalculation } from '@/calculators/types'
import { comparisonIssue, comparisonRows, type ComparisonSnapshot } from '@/features/comparison/model'

interface Props {
  current:ExportPayload
  baseline:ComparisonSnapshot|null
  onBaseline:(value:ComparisonSnapshot|null)=>void
  refreshKey?:string
  disabled?:boolean
}
export function ComparisonPanel({current,baseline,onBaseline,disabled,refreshKey}:Props) {
  const [saved,setSaved]=useState<SavedCalculation[]>([])
  const [name,setName]=useState('Baseline')
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(false)
  useEffect(()=>{
    let active=true
    getSavedCalculations(500).then(records=>{if(active)setSaved(records.filter(r=>r.calculatorId===current.calculatorId))}).catch(()=>{if(active)setError('Saved calculations could not be loaded. You can still pin the current result.')})
    return ()=>{active=false}
  },[current.calculatorId,refreshKey])
  const issue=baseline?comparisonIssue(current,baseline.payload):null
  const rows=baseline&&!issue?comparisonRows(current,baseline.payload):[]
  return <section aria-label="Scenario comparison" className="bg-surface-lighter rounded-xl p-4 sm:p-5 space-y-4">
    <div className="flex justify-between items-start gap-4">
      <div><h3 className="font-semibold">Compare scenarios</h3><p className="text-sm text-text-secondary mt-1">Pin this result, change your inputs, then calculate again. Or choose a saved result.</p></div>
      {baseline&&<Button variant="ghost" size="sm" onClick={()=>onBaseline(null)}>Clear baseline</Button>}
    </div>
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-sm flex-1 min-w-40">Baseline name<input maxLength={80} value={name} onChange={e=>setName(e.target.value)} className="block mt-1 w-full rounded-lg border border-border bg-white px-3 h-11" /></label>
      <Button variant="secondary" size="sm" disabled={disabled||!name.trim()} onClick={()=>{setError('');onBaseline({name:name.trim(),payload:structuredClone(current)})}}>Use current result</Button>
      <label className="text-sm flex-1 min-w-48">Saved baseline<select value="" disabled={disabled||loading||saved.length===0} className="block mt-1 w-full rounded-lg border border-border bg-white px-3 h-11" onChange={async e=>{
        const record=saved.find(r=>r.id===e.target.value)
        if(!record)return
        setLoading(true);setError('')
        try {const payload=await buildExportPayloadFromRecord(record);const issue=comparisonIssue(current,payload);if(issue)setError(issue);else onBaseline({name:record.name,payload})}
        catch {setError('This saved result could not be compared. Open it and recalculate first.')}
        finally {setLoading(false)}
      }}><option value="">{loading?'Loading…':saved.length?'Choose a saved calculation':'No saved results for this tool'}</option>{saved.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
    </div>
    {(error||issue)&&<p role="alert" className="text-sm text-amber-900">{error||issue}</p>}
    {baseline&&<p className="text-xs text-text-secondary">Baseline: {baseline.name} · calculated {new Date(baseline.payload.date).toLocaleString(current.provenance?.locale??'en-US')}. Changes below are current minus baseline.</p>}
    {rows.length>0&&<div className="overflow-x-auto"><table className="w-full text-sm tabular-nums"><caption className="sr-only">Current result compared with {baseline?.name}</caption><thead><tr className="border-b border-border text-text-secondary"><th className="text-left py-3 pr-4 font-medium">Metric</th><th className="text-right px-3 font-medium">Baseline</th><th className="text-right px-3 font-medium">Current</th><th className="text-right pl-3 font-medium">Change</th></tr></thead><tbody>{rows.map(row=><tr key={row.key} className="border-b border-border/60 last:border-0"><th scope="row" className="text-left py-3 pr-4 font-medium min-w-40">{row.label}</th><td className="text-right px-3 whitespace-nowrap">{row.baseline}</td><td className="text-right px-3 whitespace-nowrap">{row.current}</td><td className="text-right pl-3 whitespace-nowrap font-medium">{row.change}</td></tr>)}</tbody></table></div>}
  </section>
}
