import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import {
  DEFAULT_SHORTCUTS,
  MAX_DOUBLE_TAP_MS,
  MIN_DOUBLE_TAP_MS,
  SHORTCUT_ACTIONS,
  SHORTCUT_ACTION_IDS,
  clampDoubleTap,
  loadShortcuts,
  newShortcutId,
  parseShortcutsJson,
  saveShortcuts,
  serializeShortcuts,
  validateShortcuts,
  type Shortcut,
  type ShortcutActionId,
  type ShortcutConfig,
  type ShortcutTrigger,
  type ShortcutTriggerKind,
} from './shortcuts'

const fieldClass = 'h-10 rounded-lg border border-border bg-white px-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary'

const KIND_LABELS: Record<ShortcutTriggerKind, string> = {
  press: 'Press',
  double: 'Double-tap',
  hold: 'Hold + press',
}

function KeyCapture({ value, onChange, label, invalid }: { value: string; onChange: (key: string) => void; label: string; invalid?: boolean }) {
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Tab' || event.key === 'Escape' || event.metaKey || event.ctrlKey || event.altKey) return
    event.preventDefault()
    event.stopPropagation()
    if (event.key === 'Backspace' || event.key === 'Delete') onChange('')
    else if ([...event.key].length === 1 && event.key !== ' ') onChange(event.key)
  }
  return <input type="text" readOnly value={value} onKeyDown={onKeyDown} aria-label={label} aria-invalid={invalid} placeholder="Key"
    title="Click, then press a key"
    className={cn(fieldClass, 'w-14 text-center font-mono caret-transparent cursor-pointer', invalid && 'border-red-400')} />
}

function retrigger(trigger: ShortcutTrigger, kind: ShortcutTriggerKind, fallbackHold: string): ShortcutTrigger {
  if (kind === 'hold') return { kind, hold: trigger.kind === 'hold' ? trigger.hold : fallbackHold, key: trigger.key }
  return { kind, key: trigger.key }
}

export function ShortcutsDialog({ open, onClose: notifyClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  // Close natively first so the dialog's own focus restore can't override where the caller moves focus.
  const onClose = () => {
    dialogRef.current?.close()
    notifyClose()
  }
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState<ShortcutConfig>(loadShortcuts)
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null)
  const issues = useMemo(() => validateShortcuts(draft), [draft])
  const hasErrors = issues.some((issue) => issue.severity === 'error')

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      setDraft(loadShortcuts())
      setMessage(null)
      dialog.showModal?.()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  const updateRow = (id: string, patch: Partial<Shortcut>) =>
    setDraft((current) => ({ ...current, shortcuts: current.shortcuts.map((row) => (row.id === id ? { ...row, ...patch } : row)) }))
  const removeRow = (id: string) =>
    setDraft((current) => ({ ...current, shortcuts: current.shortcuts.filter((row) => row.id !== id) }))
  const addRow = () =>
    setDraft((current) => ({ ...current, shortcuts: [...current.shortcuts, { id: newShortcutId(), trigger: { kind: 'press', key: '' }, action: 'sqrt' }] }))

  const handleExport = () => {
    const blob = new Blob([serializeShortcuts(draft)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'calchub-shortcuts.json'
    link.click()
    URL.revokeObjectURL(url)
    setMessage({ text: 'Shortcuts downloaded.' })
  }

  const handleImport = async (file: File) => {
    try {
      const { config, skippedCount } = parseShortcutsJson(await file.text())
      setDraft(config)
      const skipped = skippedCount ? ` Skipped ${skippedCount} invalid ${skippedCount === 1 ? 'row' : 'rows'}.` : ''
      setMessage({ text: `Imported ${config.shortcuts.length} ${config.shortcuts.length === 1 ? 'shortcut' : 'shortcuts'}.${skipped} Review them, then click Save.` })
    } catch {
      setMessage({ text: 'This file is not a CalcHub shortcuts file.', error: true })
    }
  }

  const handleReset = () => {
    if (!confirm('Reset shortcuts to the defaults? Your custom shortcuts will be removed when you save.')) return
    setDraft(DEFAULT_SHORTCUTS)
    setMessage({ text: 'Defaults restored. Click Save to keep them.' })
  }

  const handleSave = () => {
    if (hasErrors) return
    saveShortcuts({ ...draft, doubleTapMs: clampDoubleTap(draft.doubleTapMs) })
    onClose()
  }

  const globalIssues = issues.filter((issue) => issue.index === null)

  return (
    <dialog ref={dialogRef} aria-labelledby="shortcuts-dialog-title" onCancel={(event) => { event.preventDefault(); onClose() }}
      className="m-auto w-[min(42rem,calc(100vw-2rem))] max-h-[calc(100vh-2rem)] rounded-2xl border border-border bg-white p-0 text-text-primary shadow-soft backdrop:bg-black/40">
      <div className="flex flex-col max-h-[calc(100vh-2rem)]">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 id="shortcuts-dialog-title" className="font-semibold">Your shortcuts</h2>
            <p className="text-xs text-text-muted mt-1">Click a key box, then press the key you want. Changes apply after you save.</p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><X className="h-4 w-4" aria-hidden /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {!draft.shortcuts.length && <p className="text-sm text-text-muted text-center py-4">No shortcuts yet.</p>}
          <ul className="space-y-3">
            {draft.shortcuts.map((row, index) => {
              const rowIssues = issues.filter((issue) => issue.index === index)
              const rowError = rowIssues.some((issue) => issue.severity === 'error')
              const n = index + 1
              return <li key={row.id} className="rounded-xl border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-text-muted w-5">{n}.</span>
                  <select aria-label={`Shortcut ${n} type`} value={row.trigger.kind} className={fieldClass}
                    onChange={(event) => updateRow(row.id, { trigger: retrigger(row.trigger, event.target.value as ShortcutTriggerKind, draft.holdDigitZeros ?? '0') })}>
                    {(Object.keys(KIND_LABELS) as ShortcutTriggerKind[]).map((kind) => <option key={kind} value={kind}>{KIND_LABELS[kind]}</option>)}
                  </select>
                  {row.trigger.kind === 'hold' ? <>
                    <KeyCapture label={`Shortcut ${n} key to hold`} value={row.trigger.hold} invalid={rowError}
                      onChange={(hold) => updateRow(row.id, { trigger: { ...row.trigger, hold } as ShortcutTrigger })} />
                    <span className="text-sm text-text-muted">+</span>
                  </> : null}
                  <KeyCapture label={`Shortcut ${n} key`} value={row.trigger.key} invalid={rowError}
                    onChange={(key) => updateRow(row.id, { trigger: { ...row.trigger, key } })} />
                  <span className="text-sm text-text-muted" aria-hidden>→</span>
                  <select aria-label={`Shortcut ${n} action`} value={row.action} className={cn(fieldClass, 'flex-1 min-w-40')}
                    onChange={(event) => updateRow(row.id, { action: event.target.value as ShortcutActionId })}>
                    {SHORTCUT_ACTION_IDS.map((id) => <option key={id} value={id}>{SHORTCUT_ACTIONS[id].label}</option>)}
                  </select>
                  <button type="button" aria-label={`Remove shortcut ${n}`} onClick={() => removeRow(row.id)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-light hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Trash2 className="h-4 w-4" aria-hidden /></button>
                </div>
                {rowIssues.map((issue) => <p key={issue.message} className={cn('text-xs mt-2 ml-7', issue.severity === 'error' ? 'text-red-700' : 'text-amber-700')}>{issue.message}</p>)}
              </li>
            })}
          </ul>
          <Button variant="secondary" size="sm" onClick={addRow}><Plus className="h-4 w-4 mr-1.5" aria-hidden />Add shortcut</Button>

          <div className="space-y-3 border-t border-border pt-4">
            <label className="flex flex-wrap items-center gap-2 text-sm">
              <input type="checkbox" checked={draft.holdDigitZeros !== null} className="rounded border-border"
                onChange={(event) => setDraft((current) => ({ ...current, holdDigitZeros: event.target.checked ? '0' : null }))} />
              Hold a key + 1–9 to insert that many zeros
            </label>
            {draft.holdDigitZeros !== null && <div className="flex items-center gap-2 text-sm ml-6">
              <span className="text-text-secondary">Key to hold</span>
              <KeyCapture label="Key to hold for zeros" value={draft.holdDigitZeros} invalid={globalIssues.some((issue) => issue.severity === 'error')}
                onChange={(key) => setDraft((current) => ({ ...current, holdDigitZeros: key }))} />
            </div>}
            {globalIssues.map((issue) => <p key={issue.message} className="text-xs text-red-700 ml-6">{issue.message}</p>)}
            <label className="flex flex-wrap items-center gap-2 text-sm">
              Double-tap speed
              <input type="number" min={MIN_DOUBLE_TAP_MS} max={MAX_DOUBLE_TAP_MS} step={50} value={draft.doubleTapMs} className={cn(fieldClass, 'w-24')}
                onChange={(event) => setDraft((current) => ({ ...current, doubleTapMs: Number(event.target.value) }))}
                onBlur={() => setDraft((current) => ({ ...current, doubleTapMs: clampDoubleTap(current.doubleTapMs) }))} />
              <span className="text-text-muted">ms between taps</span>
            </label>
          </div>
          {message && <p role="status" className={cn('text-sm', message.error ? 'text-red-700' : 'text-primary')}>{message.text}</p>}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>Import</Button>
            <Button variant="ghost" size="sm" onClick={handleExport} disabled={hasErrors}>Export</Button>
            <Button variant="ghost" size="sm" onClick={handleReset}>Reset to defaults</Button>
            <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (file) void handleImport(file)
              }} />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={hasErrors}>Save</Button>
          </div>
        </div>
      </div>
    </dialog>
  )
}
