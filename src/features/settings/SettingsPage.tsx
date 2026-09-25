import { useRef, useState } from 'react'
import { useApp } from '@/app/providers'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { exportBackup, importBackup, parseBackupText } from '@/persistence/backup'
import { clearAll } from '@/persistence/storage'
import { clearHistory } from '@/persistence/history'
import { clearSaved } from '@/persistence/saved'
import { resetSettings } from '@/persistence/settings'
import type { AppSettings } from '@/calculators/types'

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}

export default function SettingsPage() {
  const { settings, updateSettings, reloadFromStorage } = useApp()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cleared, setCleared] = useState(false)
  const [historyCleared, setHistoryCleared] = useState(false)
  const [backupMessage, setBackupMessage] = useState<string | null>(null)
  const [backupError, setBackupError] = useState<string | null>(null)

  const handleChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    updateSettings({ [key]: value })
  }

  const handleClearHistory = async () => {
    if (!confirm('Clear all calculation history? Saved calculations will not be affected.')) return
    await clearHistory()
    setHistoryCleared(true)
    setTimeout(() => setHistoryCleared(false), 3000)
  }

  const handleClearAll = async () => {
    if (!confirm('Clear all local data including favorites, settings, history, and saved calculations?')) return
    clearAll()
    await clearHistory()
    await clearSaved()
    resetSettings()
    reloadFromStorage()
    setCleared(true)
    setTimeout(() => setCleared(false), 3000)
  }

  const handleExport = async () => {
    setBackupError(null)
    try {
      const backup = await exportBackup()
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `calchub-backup-${backup.exportedAt.slice(0, 10)}.json`
      link.click()
      URL.revokeObjectURL(url)
      setBackupMessage('Backup downloaded.')
    } catch {
      setBackupMessage(null)
      setBackupError('Could not export your data.')
    }
  }

  const handleImportFile = async (file: File) => {
    setBackupError(null)
    setBackupMessage(null)
    let parsed
    try {
      parsed = parseBackupText(await file.text())
    } catch {
      setBackupError('This file is not a CalcHub backup.')
      return
    }
    if (
      !confirm(
        'Replace all local data with this backup? Current settings, favorites, history, and saved calculations will be overwritten.',
      )
    ) {
      return
    }
    try {
      await importBackup(parsed.backup)
      reloadFromStorage()
      const skipped =
        parsed.skippedCount > 0
          ? ` Skipped ${countLabel(parsed.skippedCount, 'invalid record', 'invalid records')}.`
          : ''
      setBackupMessage(
        `Restored ${countLabel(parsed.backup.history.length, 'history entry', 'history entries')} and ${countLabel(parsed.backup.saved.length, 'saved calculation', 'saved calculations')}.${skipped}`,
      )
    } catch {
      setBackupError('Could not import this backup.')
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 lg:py-12 space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-secondary mt-1">Defaults for calculators and display preferences.</p>
      </div>

      <section className="space-y-4 rounded-2xl border border-border bg-white p-6">
        <h2 className="font-semibold text-text-primary">Regional defaults</h2>
        <Select
          label="Country / region"
          value={settings.country}
          onChange={(v) => handleChange('country', v as AppSettings['country'])}
          options={[
            { value: 'US', label: 'United States' },
            { value: 'CA', label: 'Canada' },
          ]}
        />
        <Select
          label="Currency"
          value={settings.currency}
          onChange={(v) => handleChange('currency', v as AppSettings['currency'])}
          options={[
            { value: 'USD', label: 'USD ($)' },
            { value: 'CAD', label: 'CAD ($)' },
            { value: 'EUR', label: 'EUR (€)' },
            { value: 'GBP', label: 'GBP (£)' },
          ]}
        />
        <Select
          label="Measurement system"
          value={settings.measurementSystem}
          onChange={(v) => handleChange('measurementSystem', v as AppSettings['measurementSystem'])}
          options={[
            { value: 'imperial', label: 'Imperial' },
            { value: 'metric', label: 'Metric' },
          ]}
        />
        <Select
          label="Number formatting"
          value={settings.numberFormat}
          onChange={(v) => handleChange('numberFormat', v as AppSettings['numberFormat'])}
          options={[
            { value: 'en-US', label: 'US (1,234.56)' },
            { value: 'en-CA', label: 'Canada (1,234.56)' },
          ]}
        />
        <Select
          label="Default tax year"
          value={String(settings.defaultTaxYear)}
          onChange={(v) => handleChange('defaultTaxYear', parseInt(v, 10))}
          options={[{ value: '2026', label: '2026' }]}
        />
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-white p-6">
        <h2 className="font-semibold text-text-primary">History & export</h2>
        <label className="flex items-center gap-3 text-sm text-text-primary cursor-pointer">
          <input
            type="checkbox"
            checked={settings.historyEnabled}
            onChange={(e) => handleChange('historyEnabled', e.target.checked)}
            className="rounded border-border"
          />
          Save calculation history automatically
        </label>
        <Select
          label="PDF table export"
          value={settings.pdfTableMode}
          onChange={(v) => handleChange('pdfTableMode', v as AppSettings['pdfTableMode'])}
          options={[
            { value: 'summary', label: 'Summary only (first 20 rows)' },
            { value: 'full', label: 'Full schedule / table' },
          ]}
        />
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-white p-6">
        <h2 className="font-semibold text-text-primary">Data</h2>
        <p className="text-sm text-text-secondary">
          Your calculations are stored locally in this browser unless you explicitly export or share them.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={handleExport}>
            Export data
          </Button>
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            Import data
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) void handleImportFile(file)
            }}
          />
          <Button variant="secondary" onClick={handleClearHistory}>
            Clear history
          </Button>
          <Button variant="secondary" onClick={handleClearAll}>
            Clear all local data
          </Button>
        </div>
        {backupMessage && <p className="text-sm text-primary">{backupMessage}</p>}
        {backupError && <p className="text-sm text-red-700">{backupError}</p>}
        {historyCleared && (
          <p className="text-sm text-primary">Calculation history has been cleared.</p>
        )}
        {cleared && (
          <p className="text-sm text-primary">All local data has been cleared.</p>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-white p-6">
        <h2 className="font-semibold text-text-primary mb-2">About CalcHub</h2>
        <p className="text-sm text-text-secondary leading-relaxed">
          CalcHub is a premium all-in-one calculator hub for financial, tax, investment, math, and conversion tools.
          All calculations run entirely in your browser. No account required.
        </p>
        <p className="text-xs text-text-muted mt-4">
          Calculations are for informational purposes only and are not tax, legal, or investment advice.
        </p>
      </section>
    </div>
  )
}
