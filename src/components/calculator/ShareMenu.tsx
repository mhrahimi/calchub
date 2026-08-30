import { useState, useRef, useEffect } from 'react'
import { Share2, ChevronDown, Copy, Download, FileText } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'

export interface ShareMenuActions {
  onNativeShare?: () => Promise<void>
  onCopySummary?: () => Promise<void>
  onDownloadPdf?: () => Promise<void>
  onDownloadCsv?: () => void
  canShareNative?: boolean
  canPdf?: boolean
  canCsv?: boolean
}

interface ShareMenuProps {
  actions: ShareMenuActions
  variant?: 'primary' | 'secondary'
  size?: 'sm' | 'md'
  label?: string
}

export function ShareMenu({
  actions,
  variant = 'secondary',
  size = 'sm',
  label = 'Share',
}: ShareMenuProps) {
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
    actions.canShareNative && actions.onNativeShare
      ? { id: 'share', label: 'Share…', icon: Share2, onClick: actions.onNativeShare }
      : null,
    actions.onCopySummary
      ? { id: 'copy', label: 'Copy summary', icon: Copy, onClick: actions.onCopySummary }
      : null,
    actions.canPdf && actions.onDownloadPdf
      ? { id: 'pdf', label: 'Download PDF', icon: FileText, onClick: actions.onDownloadPdf }
      : null,
    actions.canCsv && actions.onDownloadCsv
      ? { id: 'csv', label: 'Download CSV', icon: Download, onClick: async () => actions.onDownloadCsv?.() }
      : null,
  ].filter(Boolean) as Array<{
    id: string
    label: string
    icon: typeof Share2
    onClick: () => void | Promise<void>
  }>

  if (items.length === 0) return null

  if (items.length === 1 && items[0].id === 'share') {
    return (
      <Button variant={variant} size={size} onClick={() => items[0].onClick()}>
        <Share2 className="w-4 h-4 mr-2" />
        {label}
      </Button>
    )
  }

  return (
    <div className="relative" ref={ref}>
      <Button variant={variant} size={size} onClick={() => setOpen(!open)}>
        <Share2 className="w-4 h-4 mr-2" />
        {label}
        <ChevronDown className={cn('w-4 h-4 ml-1 transition-transform', open && 'rotate-180')} />
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 min-w-[180px] rounded-xl border border-border bg-white shadow-lg py-1">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-text-primary hover:bg-surface-lighter text-left"
              onClick={async () => {
                setOpen(false)
                await item.onClick()
              }}
            >
              <item.icon className="w-4 h-4 text-text-muted shrink-0" />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
