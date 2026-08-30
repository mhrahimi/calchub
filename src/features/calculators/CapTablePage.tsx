import { Plus, Trash2 } from 'lucide-react'
import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { Input } from '@/components/ui/Input'
import { ResultBlock, MetricRow } from '@/components/ui/ResultBlock'
import { useCalculatorPage, formatResultCurrency } from './useCalculatorPage'
import {
  calculateCapTable,
  explainCapTable,
  buildCapTableCharts,
  buildCapTableTable,
} from '@/calculators/finance/capTable/calculate'
import { validateCapTable } from '@/calculators/finance/capTable/validation'
import type { CapTableHolder, CapTableInput } from '@/calculators/finance/capTable/types'

const defaultInput: CapTableInput = {
  holders: [
    { id: '1', name: 'Founder', type: 'common', shares: 8_000_000 },
    { id: '2', name: 'Option pool', type: 'options', shares: 2_000_000 },
  ],
  preMoneyValuation: 8_000_000,
  investmentAmount: 2_000_000,
  optionPoolTopUpPercent: 10,
}

export default function CapTablePage() {
  const { form, setForm, errors, handleCalculate, layoutProps } = useCalculatorPage({
    calculatorId: 'cap-table',
    defaultInput,
    validate: validateCapTable,
    calculate: calculateCapTable,
    explain: explainCapTable,
    buildCharts: buildCapTableCharts,
    buildTable: buildCapTableTable,
    csvFilename: 'cap-table.csv',
    getShareText: (r) => `PPS: $${r.pricePerShare.toFixed(4)}, Post-money FDS: ${r.postMoneyFds}`,
    renderResults: (r) => (
      <div className="space-y-4">
        <ResultBlock label="Price per share" value={formatResultCurrency(r.pricePerShare)} primary />
        <div className="rounded-2xl border border-border bg-white p-4">
          <MetricRow label="Post-money valuation" value={formatResultCurrency(r.postMoneyValuation)} />
          <MetricRow label="New investor shares" value={r.newInvestorShares.toLocaleString()} />
          <MetricRow label="Fully diluted shares" value={r.postMoneyFds.toLocaleString()} />
        </div>
      </div>
    ),
  })

  const updateHolder = (id: string, patch: Partial<CapTableHolder>) => {
    setForm((f) => ({
      ...f,
      holders: f.holders.map((h) => (h.id === id ? { ...h, ...patch } : h)),
    }))
  }

  const addHolder = () => {
    setForm((f) => ({
      ...f,
      holders: [...f.holders, { id: String(Date.now()), name: 'New holder', type: 'common', shares: 0 }],
    }))
  }

  const removeHolder = (id: string) => {
    setForm((f) => ({ ...f, holders: f.holders.filter((h) => h.id !== id) }))
  }

  return (
    <CalculatorLayout
      {...layoutProps}
      onCalculate={() => handleCalculate(form)}
      inputs={
        <>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Holders</span>
              <button type="button" onClick={addHolder} className="flex items-center gap-1 text-sm text-primary">
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
            {form.holders.map((h) => (
              <div key={h.id} className="flex gap-2 items-end">
                <Input label="Name" value={h.name} onChange={(e) => updateHolder(h.id, { name: e.target.value })} className="flex-1" />
                <Input label="Shares" type="number" value={h.shares} onChange={(e) => updateHolder(h.id, { shares: +e.target.value })} className="w-32" />
                <button type="button" onClick={() => removeHolder(h.id)} className="p-2 text-text-muted hover:text-red-600" aria-label="Remove holder">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {errors.holders && <p className="text-sm text-red-600">{errors.holders}</p>}
          </div>
          <Input label="Pre-money valuation" prefix="$" type="number" value={form.preMoneyValuation} onChange={(e) => setForm((f) => ({ ...f, preMoneyValuation: +e.target.value }))} error={errors.preMoneyValuation} />
          <Input label="Investment amount" prefix="$" type="number" value={form.investmentAmount} onChange={(e) => setForm((f) => ({ ...f, investmentAmount: +e.target.value }))} error={errors.investmentAmount} />
          <Input label="Option pool top-up" suffix="%" type="number" value={form.optionPoolTopUpPercent} onChange={(e) => setForm((f) => ({ ...f, optionPoolTopUpPercent: +e.target.value }))} error={errors.optionPoolTopUpPercent} />
        </>
      }
    />
  )
}
