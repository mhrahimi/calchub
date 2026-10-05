import { Plus, Trash2, Users, Wallet } from 'lucide-react'
import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { CalcSection, HeroResult, KeyMetrics, Note, Panel } from '@/components/calculator/sections'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { MetricRow } from '@/components/ui/ResultBlock'
import { useCalculatorPage } from './useCalculatorPage'
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
    { id: '2', name: 'Option pool', type: 'unallocated', shares: 2_000_000 },
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
    live: true,
    csvFilename: 'cap-table.csv',
    getShareText: (r, _input, _formatResultCurrency) => `PPS: $${r.pricePerShare.toFixed(4)}, Post-money FDS: ${r.postMoneyFds}`,
    renderResults: (r, _input, formatResultCurrency) => (
      <div className="calc-results">
        <HeroResult eyebrow="PRICE PER SHARE" title="Price per share" amount={formatResultCurrency(r.pricePerShare)} />
        <KeyMetrics items={[
          { icon: <Wallet aria-hidden="true" />, label: 'Post-money valuation', value: formatResultCurrency(r.postMoneyValuation) },
          { icon: <Users aria-hidden="true" />, label: 'Fully diluted shares', value: r.postMoneyFds.toLocaleString() },
        ]} />
        <Panel title="Round summary">
          <MetricRow label="Post-money valuation" value={formatResultCurrency(r.postMoneyValuation)} />
          <MetricRow label="New investor shares" value={r.newInvestorShares.toLocaleString()} />
          <MetricRow label="Ownership reconciliation" value={`${r.ownershipTotal.toFixed(6)}%`} />
          <MetricRow label="Available pool" value={`${r.availablePoolPercent.toFixed(4)}%`} />
          <MetricRow label="Fully diluted shares" value={r.postMoneyFds.toLocaleString()} />
        </Panel>
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
        <div className="calc-form">
          <CalcSection index={1} title="Current holders">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Holders</span>
              <button type="button" onClick={addHolder} className="min-h-11 inline-flex items-center gap-1 text-sm text-primary">
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
            {form.holders.map((h) => (
              <div key={h.id} className="calc-extra-row">
                <Input id={`holder-${h.id}-name`} label="Name" value={h.name} onChange={(e) => updateHolder(h.id, { name: e.target.value })} />
                <Select label={`Share type — ${h.name} (${h.id})`} value={h.type} onChange={(v) => updateHolder(h.id, {type: v as CapTableHolder['type']})} options={[{value:'common',label:'Common shares'},{value:'options',label:'Granted options'},{value:'unallocated',label:'Available option pool'}]} />
                <Input id={`holder-${h.id}-shares`} label="Shares" type="number" value={h.shares} onChange={(e) => updateHolder(h.id, { shares: +e.target.value })} />
                <button
                  type="button"
                  onClick={() => removeHolder(h.id)}
                  className="h-11 w-11 inline-flex items-center justify-center justify-self-start text-text-muted hover:text-red-600"
                  aria-label="Remove holder"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {errors.holders && <p className="text-sm text-red-600">{errors.holders}</p>}
          </CalcSection>
          <CalcSection index={2} title="New round">
            <Input label="Pre-money valuation" prefix="$" grouped value={form.preMoneyValuation} onValueChange={(n) => setForm((f) => ({ ...f, preMoneyValuation: n }))} error={errors.preMoneyValuation} />
            <Input label="Investment amount" prefix="$" grouped value={form.investmentAmount} onValueChange={(n) => setForm((f) => ({ ...f, investmentAmount: n }))} error={errors.investmentAmount} />
            <Input label="Target available pool after financing" suffix="%" type="number" value={form.optionPoolTopUpPercent} onChange={(e) => setForm((f) => ({ ...f, optionPoolTopUpPercent: +e.target.value }))} error={errors.optionPoolTopUpPercent} />
            <Note>Your estimate updates automatically as you edit.</Note>
          </CalcSection>
        </div>
      }
    />
  )
}
