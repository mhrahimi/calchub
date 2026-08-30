import { useNavigate } from 'react-router-dom'
import {
  ExternalLink,
  RefreshCw,
  Pencil,
  Bookmark,
  Copy,
  Trash2,
  MoreHorizontal,
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { getCalculatorById } from '@/calculators/registry'
import type { HistoryRecord, SavedCalculation } from '@/calculators/types'
import { Button } from '@/components/ui/Button'
import { ShareMenu } from '@/components/calculator/ShareMenu'
import { cn } from '@/utils/cn'
import { buildExportPayloadFromRecord } from '@/exports/buildPayload'
import { downloadPdf } from '@/exports/pdf'
import { exportRecordCsv } from '@/exports/recordCsv'
import { getSettings } from '@/persistence/settings'
import { setPendingRestore, type RestoreMode } from '@/persistence/restore'

export type RecordListVariant = 'history' | 'saved'

interface CalculationRecordListProps {
  variant: RecordListVariant
  records: Array<HistoryRecord | SavedCalculation>
  onRefresh: () => void
  onRename: (id: string, name: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onDuplicate: (id: string) => Promise<unknown>
  onSaveToSaved?: (record: HistoryRecord, name: string) => Promise<void>
}

function getDisplayName(record: HistoryRecord | SavedCalculation): string {
  if ('name' in record && record.name) return record.name
  if (record.label) return record.label
  const calc = getCalculatorById(record.calculatorId)
  return calc?.title ?? record.calculatorId
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function RecordActionsMenu({
  onAction,
}: {
  onAction: (action: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const items = [
    { id: 'open', label: 'Open', icon: ExternalLink },
    { id: 'recalculate', label: 'Recalculate', icon: RefreshCw },
    { id: 'rename', label: 'Rename', icon: Pencil },
    { id: 'duplicate', label: 'Duplicate', icon: Copy },
    { id: 'delete', label: 'Delete', icon: Trash2 },
  ]

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg border border-border hover:bg-surface-lighter"
        aria-label="More actions"
      >
        <MoreHorizontal className="w-4 h-4 text-text-muted" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 min-w-[160px] rounded-xl border border-border bg-white shadow-lg py-1">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                'w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-surface-lighter',
                item.id === 'delete' ? 'text-red-600' : 'text-text-primary',
              )}
              onClick={() => {
                setOpen(false)
                onAction(item.id)
              }}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function CalculationRecordList({
  variant,
  records,
  onRefresh,
  onRename,
  onDelete,
  onDuplicate,
  onSaveToSaved,
}: CalculationRecordListProps) {
  const navigate = useNavigate()
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null)
  const [copyNoticeId, setCopyNoticeId] = useState<string | null>(null)

  const openRecord = (record: HistoryRecord | SavedCalculation, mode: RestoreMode) => {
    const calc = getCalculatorById(record.calculatorId)
    if (!calc?.route) return
    setPendingRestore({ mode, record })
    navigate(calc.route)
  }

  const handleRename = async (record: HistoryRecord | SavedCalculation) => {
    const current = getDisplayName(record)
    const next = window.prompt(variant === 'saved' ? 'Rename saved calculation' : 'Rename history entry', current)?.trim()
    if (!next || next === current) return
    await onRename(record.id, next)
    onRefresh()
  }

  const handleDelete = async (record: HistoryRecord | SavedCalculation) => {
    const name = getDisplayName(record)
    if (!confirm(`Delete "${name}"?`)) return
    await onDelete(record.id)
    onRefresh()
  }

  const handleExportPdf = async (record: HistoryRecord | SavedCalculation) => {
    setPdfLoadingId(record.id)
    try {
      const payload = await buildExportPayloadFromRecord(record, {
        label: 'name' in record ? record.name : record.label,
      })
      const settings = getSettings()
      await downloadPdf(payload, `${record.calculatorId}-report.pdf`, {
        tableMode: settings.pdfTableMode,
      })
    } finally {
      setPdfLoadingId(null)
    }
  }

  const getShareText = (record: HistoryRecord | SavedCalculation): string => {
    const calc = getCalculatorById(record.calculatorId)
    const name = getDisplayName(record)
    return `${name} — ${calc?.title ?? record.calculatorId} (CalcHub)`
  }

  return (
    <ul className="space-y-3">
      {records.map((record) => {
        const calc = getCalculatorById(record.calculatorId)
        const title = getDisplayName(record)
        const subtitle = calc?.title ?? record.calculatorId

        return (
          <li
            key={record.id}
            className="rounded-2xl border border-border bg-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4"
          >
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-text-primary truncate">{title}</p>
              <p className="text-sm text-text-secondary truncate">{subtitle}</p>
              <p className="text-xs text-text-muted mt-1">{formatDate(record.updatedAt)}</p>
              {pdfLoadingId === record.id && (
                <p className="text-xs text-text-muted mt-1 animate-pulse">Generating PDF…</p>
              )}
              {copyNoticeId === record.id && (
                <p className="text-xs text-primary mt-1" role="status">
                  Copied to clipboard.
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button variant="secondary" size="sm" onClick={() => openRecord(record, 'reopen')}>
                <ExternalLink className="w-4 h-4 mr-1.5" />
                Open
              </Button>
              {variant === 'history' && onSaveToSaved && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    const name = window.prompt('Save as', title)?.trim()
                    if (!name) return
                    await onSaveToSaved(record as HistoryRecord, name)
                    onRefresh()
                  }}
                >
                  <Bookmark className="w-4 h-4 mr-1.5" />
                  Save
                </Button>
              )}
              {variant === 'saved' && (
                <Button variant="secondary" size="sm" onClick={() => openRecord(record, 'edit')}>
                  <Pencil className="w-4 h-4 mr-1.5" />
                  Edit
                </Button>
              )}
              <ShareMenu
                label="Export"
                actions={{
                  canShareNative: !!navigator.share,
                  onNativeShare: async () => {
                    await navigator.share({ title, text: getShareText(record) })
                  },
                  onCopySummary: async () => {
                    await navigator.clipboard.writeText(getShareText(record))
                    setCopyNoticeId(record.id)
                    window.setTimeout(() => setCopyNoticeId(null), 2000)
                  },
                  onDownloadPdf: () => handleExportPdf(record),
                  onDownloadCsv: () => exportRecordCsv(record),
                  canPdf: true,
                  canCsv: true,
                }}
              />
              <RecordActionsMenu
                onAction={async (action) => {
                  if (action === 'open') openRecord(record, 'reopen')
                  else if (action === 'recalculate') openRecord(record, 'recalculate')
                  else if (action === 'rename') await handleRename(record)
                  else if (action === 'duplicate') {
                    await onDuplicate(record.id)
                    onRefresh()
                  } else if (action === 'delete') await handleDelete(record)
                }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
