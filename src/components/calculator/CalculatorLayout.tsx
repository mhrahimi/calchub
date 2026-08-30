import { useState, type ReactNode } from 'react'
import { Star, ChevronDown, Download, Bookmark, FileText } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/Button'
import type { CalculationExplanation, ChartData, TableData } from '@/calculators/types'
import { DataTable } from '@/components/calculator/DataTable'
import { ChartPanel } from '@/components/calculator/ChartPanel'
import { ShareMenu, type ShareMenuActions } from '@/components/calculator/ShareMenu'

interface CalculatorLayoutProps {
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
}

export function CalculatorLayout({
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
}: CalculatorLayoutProps) {
  const [methodOpen, setMethodOpen] = useState(false)

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 lg:py-10">
      <header className="mb-8 pb-6 border-b border-border">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-text-primary">{title}</h1>
            <p className="text-text-secondary mt-1 max-w-2xl">{description}</p>
          </div>
          <button
            onClick={onFavoriteToggle}
            className="p-2.5 rounded-full border border-border hover:border-primary hover:bg-surface-lighter transition-colors shrink-0"
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star
              className={cn('w-5 h-5', isFavorite ? 'fill-primary text-primary' : 'text-text-muted')}
            />
          </button>
        </div>
      </header>

      <div className="grid lg:grid-cols-[2fr_3fr] gap-8 lg:gap-10">
        <section className="space-y-6">
          <div className="rounded-2xl border border-border bg-white p-6 space-y-5">{inputs}</div>
          <Button onClick={onCalculate} className="w-full lg:w-auto">
            Calculate
          </Button>
        </section>

        <section className="space-y-6 lg:sticky lg:top-6 lg:self-start" aria-live="polite" aria-atomic="true">
          {results ? (
            <>
              {results}

              {charts && charts.length > 0 && (
                <div className="space-y-4">
                  {charts.map((chart, i) => (
                    <ChartPanel key={i} data={chart} />
                  ))}
                </div>
              )}

              {table && table.rows.length > 0 && <DataTable table={table} />}

              {pdfLoading && (
                <div className="rounded-2xl border border-border bg-surface-lighter/50 p-4 animate-pulse">
                  <p className="text-sm text-text-muted">Generating PDF report…</p>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                {onSave && (
                  <Button variant="secondary" size="sm" onClick={onSave}>
                    <Bookmark className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                )}
                {onExportPdf && (
                  <Button variant="secondary" size="sm" onClick={onExportPdf} disabled={pdfLoading}>
                    <FileText className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                )}
                {onExportCsv && (
                  <Button variant="secondary" size="sm" onClick={onExportCsv}>
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                )}
                {shareActions && <ShareMenu actions={shareActions} />}
              </div>

              {copyNotice && (
                <p className="text-sm text-primary" role="status">
                  Copied to clipboard.
                </p>
              )}

              {explanation && (
                <div className="rounded-2xl border border-border bg-white overflow-hidden">
                  <button
                    onClick={() => setMethodOpen(!methodOpen)}
                    className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-surface-lighter transition-colors"
                  >
                    <span className="font-medium text-text-primary">How this was calculated</span>
                    <ChevronDown
                      className={cn('w-5 h-5 text-text-muted transition-transform', methodOpen && 'rotate-180')}
                    />
                  </button>
                  {methodOpen && (
                    <div className="px-6 pb-6 space-y-4 border-t border-border pt-4">
                      {explanation.steps.map((step, i) => (
                        <div key={i}>
                          <p className="text-sm font-medium text-text-primary">{step.label}</p>
                          {step.expression && (
                            <pre className="text-sm text-text-secondary font-mono mt-1 whitespace-pre-wrap">
                              {step.expression}
                            </pre>
                          )}
                          {step.result && (
                            <p className="text-sm text-primary tabular-nums mt-1">{step.result}</p>
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
    </div>
  )
}
