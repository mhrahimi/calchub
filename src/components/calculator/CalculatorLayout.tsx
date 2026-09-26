import type { ReportField } from '@/exports/reportFields'
import type { ExportPayload } from '@/exports/types'
import type { ComparisonSnapshot } from '@/features/comparison/model'
import { ComparisonPanel } from './ComparisonPanel'
import { ResultSummary } from './ResultSummary'
import { ResultDetailsContext } from './ResultDetailsContext'
import { SnapshotFormatContext } from './SnapshotFormat'
import type { CalculationProvenance } from '@/exports/provenance'
import { useState, useEffect, useRef, type ReactNode } from 'react'
import { Star, ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/Button'
import type { CalculationExplanation, ChartData, TableData } from '@/calculators/types'
import { DataTable } from '@/components/calculator/DataTable'
import { ChartPanel } from '@/components/calculator/ChartPanel'
import { type ShareMenuActions } from '@/components/calculator/ShareMenu'

interface CalculatorLayoutProps {
  resultPresentation?: 'details' | 'inline'
  calculateLabel?: string
  resultFields?: ReportField[]
  resultWarnings?: string[]
  currentPayload?: ExportPayload|null
  baseline?: ComparisonSnapshot|null
  onBaseline?: (snapshot:ComparisonSnapshot|null)=>void
  comparisonOpen?:boolean
  onCompare?:()=>void

  title: string
  description: string
  isFavorite: boolean
  onFavoriteToggle: () => void
  inputs: ReactNode
  results: ReactNode | null
  explanation?: CalculationExplanation | null
  charts?: ChartData[]
  table?: TableData | null
  onExportCsv?: () => void
  onExportPdf?: () => void | Promise<void>
  onSave?: () => void | Promise<void>
  shareActions?: ShareMenuActions
  pdfLoading?: boolean
  copyNotice?: boolean
  onCalculate: () => void
  calculating?: boolean
  calculationError?: string
  inputsChanged?: boolean
  provenance?: CalculationProvenance
  resultAnnouncement?: string
  saveOpen?: boolean
  savedNotice?: string
  onSaveCancel?: () => void
  onSaveConfirm?: (name:string) => Promise<void>
}

export function CalculatorLayout({
  resultPresentation = 'details', calculateLabel = 'Calculate',
  resultFields, resultWarnings, currentPayload, baseline, onBaseline, comparisonOpen, onCompare,
  title,
  description,
  isFavorite,
  onFavoriteToggle,
  inputs,
  results,
  explanation,
  charts,
  table,
  onExportCsv,
  onExportPdf,
  onSave,
  shareActions,
  pdfLoading,
  copyNotice,
  onCalculate,
  calculationError, inputsChanged, provenance, resultAnnouncement, saveOpen, savedNotice, onSaveCancel, onSaveConfirm,
}: CalculatorLayoutProps) {
  const [methodOpen, setMethodOpen] = useState(false)
  const [name, setName] = useState(title)
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { if (saveOpen) { setName(title); setSaveError(''); dialog.current?.showModal() } else dialog.current?.close() },[saveOpen,title])

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 lg:py-8 min-w-0">
      <header className="calculator-header mb-8 pb-6 border-b border-border">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-text-primary">{title}</h1>
            <p className="text-text-secondary mt-1 max-w-2xl">{description}</p>
          </div>
          <button
            onClick={onFavoriteToggle}
            className="min-h-11 min-w-11 inline-flex items-center justify-center p-2.5 rounded-full border border-border hover:border-primary hover:bg-surface-lighter transition-colors shrink-0"
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star
              className={cn('w-5 h-5', isFavorite ? 'fill-primary text-primary' : 'text-text-muted')}
            />
          </button>
        </div>
      </header>

      <div className="calculator-grid grid lg:grid-cols-[minmax(280px,0.7fr)_minmax(0,1.4fr)] gap-8 lg:gap-12 min-w-0">
        <section className="calculator-inputs min-w-0 space-y-6" aria-label="Calculator inputs">
          <div className="bg-background-secondary/60 rounded-xl p-4 sm:p-5 space-y-5">{inputs}</div>
          <Button onClick={onCalculate} className="calculator-submit w-full lg:w-auto">
            {calculateLabel}
          </Button>
        </section>

        <section className="min-w-0 space-y-6" aria-label="Calculation results">
          <p role="status" className="sr-only">{resultAnnouncement}</p>
          {inputsChanged && <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Inputs changed — recalculate. The results below belong to the previous input snapshot. Save, compare, copy, and export become available after recalculation.{resultPresentation === 'inline' && <button type="button" className="block mt-2 min-h-11 font-semibold underline underline-offset-4" onClick={onCalculate}>Update estimate</button>}</p>}
          {provenance && results && <p className="text-xs text-text-secondary">Calculated {provenance.calculatedAt ? new Date(provenance.calculatedAt).toLocaleString(provenance.locale ?? 'en-US') : 'at an unrecorded time'} · {provenance.currency ?? 'Currency not recorded'}</p>}
          {calculationError && <p role="alert" className="text-red-700">{calculationError}</p>}
          {results ? (
            <>
              <ResultSummary fields={resultPresentation === 'inline' ? [] : resultFields??[]} disabled={inputsChanged} loading={pdfLoading} comparing={comparisonOpen} onSave={onSave} onCompare={onCompare??(()=>{})} onCopy={shareActions?.onCopySummary} onPdf={onExportPdf} onCsv={onExportCsv} onShare={shareActions?.canShareNative?shareActions.onNativeShare:undefined} notice={copyNotice?'Copied to clipboard.':savedNotice} />
              {resultWarnings?.map((warning,index)=><p key={index} className="text-sm text-amber-900">{warning}</p>)}
              {comparisonOpen&&currentPayload&&onBaseline&&<ComparisonPanel current={currentPayload} baseline={baseline??null} onBaseline={onBaseline} refreshKey={savedNotice} disabled={inputsChanged}/>}
              {resultPresentation === 'inline' ? (
                <SnapshotFormatContext.Provider value={provenance}>{results}</SnapshotFormatContext.Provider>
              ) : <details className="result-details border-b border-border pb-4">
                <summary className="cursor-pointer py-2 font-medium text-sm text-primary">All results and breakdown</summary>
                <SnapshotFormatContext.Provider value={provenance}><ResultDetailsContext.Provider value={!!resultFields?.length}>{results}</ResultDetailsContext.Provider></SnapshotFormatContext.Provider>
              </details>}

              <SnapshotFormatContext.Provider value={provenance}>
              {charts && charts.length > 0 && (
                <div className="space-y-4">
                  {charts.map((chart, i) => (
                    <ChartPanel key={i} data={chart} />
                  ))}
                </div>
              )}

              {table && table.rows.length > 0 && <DataTable table={table} />}

              </SnapshotFormatContext.Provider>

              {pdfLoading && (
                <div className="rounded-2xl border border-border bg-surface-lighter/50 p-4 animate-pulse">
                  <p className="text-sm text-text-muted">Generating PDF report…</p>
                </div>
              )}



              {explanation && (
                <div className="border-t border-border overflow-hidden">
                  <button
                    aria-expanded={methodOpen}
                    onClick={() => setMethodOpen(!methodOpen)}
                    className="w-full flex items-center justify-between px-0 py-4 text-left hover:bg-surface-lighter transition-colors"
                  >
                    <span className="font-medium text-text-primary">How this was calculated</span>
                    <ChevronDown
                      className={cn('w-5 h-5 text-text-muted transition-transform', methodOpen && 'rotate-180')}
                    />
                  </button>
                  {methodOpen && (
                    <div className="pb-6 space-y-4 pt-4">
                      {explanation.steps.map((step, i) => (
                        <div key={i}>
                          <p className="text-sm font-medium text-text-primary">{step.label}</p>
                          {step.expression && (
                            <pre className="text-sm text-text-secondary font-mono mt-1 whitespace-pre-wrap break-all [overflow-wrap:anywhere]">
                              {step.expression}
                            </pre>
                          )}
                          {step.result && (
                            <p className="text-sm text-primary tabular-nums mt-1 break-all [overflow-wrap:anywhere]">
                              {step.result}
                            </p>
                          )}
                        </div>
                      ))}
                      {explanation.assumptions?.map((a, i) => (
                        <p key={i} className="text-xs text-text-muted italic">
                          {a}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-surface-lighter/50 p-12 text-center">
              <p className="text-text-muted">Enter your values and click Calculate to see results.</p>
            </div>
          )}
        </section>
      </div>
      <dialog ref={dialog} onCancel={onSaveCancel} aria-labelledby="save-title" className="m-auto w-[min(92vw,28rem)] rounded-2xl p-6 shadow-xl backdrop:bg-black/30">
        <form onSubmit={async e => { e.preventDefault(); setSaving(true); try { await onSaveConfirm?.(name) } catch { setSaveError('Could not save. Check available browser storage and try again.') } finally { setSaving(false) } }} className="space-y-4">
          <h2 id="save-title" className="text-lg font-semibold">Save calculation</h2>
          <label htmlFor="calculation-name" className="block text-sm">Calculation name</label>
          <input id="calculation-name" autoFocus required maxLength={160} value={name} onChange={e=>setName(e.target.value)} className="w-full border border-border rounded-lg p-3" />
          {saveError && <p role="alert" className="text-red-700">{saveError}</p>}
          <div className="flex gap-3"><Button type="submit" disabled={saving || !name.trim()}>Save calculation</Button><Button type="button" variant="secondary" onClick={onSaveCancel}>Cancel</Button></div>
        </form>
      </dialog>
    </div>
  )
}
