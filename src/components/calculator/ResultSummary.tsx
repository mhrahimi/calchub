import { useRef, useState } from 'react'
import { Bookmark, Columns2, Copy, Download, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { ReportField } from '@/exports/reportFields'

interface Props {
  fields:ReportField[]
  disabled?:boolean
  loading?:boolean
  comparing?:boolean
  onSave?:()=>void|Promise<void>
  onCompare:()=>void
  onCopy?:()=>void|Promise<void>
  onPdf?:()=>void|Promise<void>
  onCsv?:()=>void|Promise<void>
  onShare?:()=>void|Promise<void>
  notice?:string
}
export function ResultSummary({fields,disabled,loading,comparing,onSave,onCompare,onCopy,onPdf,onCsv,onShare,notice}:Props) {
  const [error,setError]=useState('')
  const exportMenu=useRef<HTMLDetailsElement>(null)
  const exportButton=useRef<HTMLElement>(null)
  const run=async(action?:()=>void|Promise<void>)=>{setError('');try{await action?.()}catch{setError('This action could not be completed. Please try again.')}}
  const primary=fields.filter(f=>f.primary)
  const intervalKeys=['ciLower','ciUpper','confidenceLevel']
  const ordered=primary.some(f=>f.key==='estimate') ? [...fields.filter(f=>intervalKeys.includes(f.key)),...fields.filter(f=>!intervalKeys.includes(f.key))] : fields
  const supporting=ordered.filter(f=>!f.primary&&!primary.some(p=>p.raw===f.raw&&p.unit===f.unit)).slice(0,3)
  return <section aria-label="Result summary" className="result-summary border-b border-border pb-5 space-y-5">
    <div className="grid sm:grid-cols-[minmax(0,1fr)_auto] items-start gap-x-5 gap-y-4">
      <div className="flex-1 min-w-48 space-y-3">{primary.map(field=><div key={field.key}><h2 className="text-sm text-text-secondary">{field.label}</h2><p className="text-3xl sm:text-4xl leading-tight tracking-tight font-semibold tabular-nums text-primary mt-2 break-words">{field.display}</p></div>)}</div>
      <div className="grid grid-cols-4 sm:grid-cols-2 gap-1 items-center" aria-label="Result actions">
        {onSave&&<Button variant="ghost" size="sm" disabled={disabled} onClick={()=>run(onSave)}><Bookmark className="hidden sm:block w-4 h-4 mr-1.5"/>Save</Button>}
        <Button variant="ghost" size="sm" disabled={disabled} aria-expanded={comparing} onClick={onCompare}><Columns2 className="hidden sm:block w-4 h-4 mr-1.5"/>Compare</Button>
        {onCopy&&<Button variant="ghost" size="sm" disabled={disabled} onClick={()=>run(onCopy)}><Copy className="hidden sm:block w-4 h-4 mr-1.5"/>Copy</Button>}
        <details ref={exportMenu} className="relative" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))e.currentTarget.open=false}} onKeyDown={e=>{if(e.key==='Escape'){e.currentTarget.open=false;exportButton.current?.focus()}}}>
          <summary ref={exportButton} aria-disabled={disabled||loading} onClick={e=>{if(disabled||loading)e.preventDefault()}} className={`list-none flex items-center h-11 px-3 rounded-lg text-sm text-text-secondary hover:bg-surface-lighter cursor-pointer ${disabled||loading?'opacity-50':''}`}><Download className="hidden sm:block w-4 h-4 mr-1.5"/>{loading?'Preparing…':'Export'}<ChevronDown className="w-3.5 h-3.5 ml-1"/></summary>
          <div className="absolute z-30 right-0 top-full mt-1 bg-white shadow-lg border border-border rounded-xl p-1 min-w-48">
            {[[onPdf,'PDF report'],[onCsv,'CSV data'],[onShare,'Share summary']].map(([action,label])=>action&&<button key={String(label)} disabled={disabled||loading} className="block w-full text-left text-sm rounded-lg px-3 py-3 hover:bg-surface-lighter" onClick={()=>{if(exportMenu.current)exportMenu.current.open=false;exportButton.current?.focus();run(action as ()=>void|Promise<void>)}}>{String(label)}</button>)}
          </div>
        </details>
      </div>
    </div>
    {supporting.length>0&&<dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">{supporting.map(field=><div key={field.key}><dt className="text-xs text-text-secondary mb-1">{field.label}</dt><dd className="text-base font-medium tabular-nums break-words">{field.display}</dd></div>)}</dl>}
    {(notice||error)&&<p role={error?'alert':'status'} className={`text-sm ${error?'text-red-700':'text-primary'}`}>{error||notice}</p>}
  </section>
}
