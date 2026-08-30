import { useState } from 'react'
import { useApp } from '@/app/providers'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { clearAll } from '@/persistence/storage'
import { clearHistory } from '@/persistence/history'
import { clearSaved } from '@/persistence/saved'
import { resetSettings } from '@/persistence/settings'
import type { AppSettings } from '@/calculators/types'

export default function SettingsPage() {
  const { settings, updateSettings, refreshFavorites } = useApp()
  const [cleared, setCleared] = useState(false)
  const [historyCleared, setHistoryCleared] = useState(false)

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
    refreshFavorites()
    setCleared(true)
    setTimeout(() => setCleared(false), 3000)
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
          <Button variant="secondary" onClick={handleClearHistory}>
            Clear history
          </Button>
          <Button variant="secondary" onClick={handleClearAll}>
            Clear all local data
          </Button>
        </div>
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
