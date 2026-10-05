import { Percent, Wallet } from 'lucide-react'
import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { CalcSection, HeroResult, KeyMetrics, Note, Panel } from '@/components/calculator/sections'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { MetricRow } from '@/components/ui/ResultBlock'
import { useCalculatorPage } from './useCalculatorPage'
import {
  calculateInflation,
  explainInflation,
  buildInflationCharts,
  buildInflationTable,
} from '@/calculators/finance/inflation/calculate'
import { validateInflation } from '@/calculators/finance/inflation/validation'
import type { InflationInput } from '@/calculators/finance/inflation/types'
import { getAvailableYears } from '@/data/cpi/us-cpi-u'

const years = getAvailableYears()

const defaultInput: InflationInput = {
  mode: 'historical',
  amount: 1000,
  baseYear: 2000,
  targetYear: 2024,
  inflationRate: 3,
  durationYears: 10,
}

export default function InflationPage() {
  const { form, set, errors, handleCalculate, layoutProps } = useCalculatorPage({
    calculatorId: 'inflation',
    defaultInput,
    validate: validateInflation,
    calculate: calculateInflation,
    explain: explainInflation,
    buildCharts: buildInflationCharts,
    buildTable: buildInflationTable,
    live: true,
    csvFilename: 'inflation-schedule.csv',
    getShareText: (r, _input, formatResultCurrency) =>
      r.mode === 'historical'
        ? `Equivalent purchasing power: ${formatResultCurrency(r.primaryAmount)}`
        : `Future price: ${formatResultCurrency(r.futurePrice ?? 0)} (assumption)`,
    renderResults: (r, _input, formatResultCurrency) => (
      <div className="calc-results">
        {r.mode === 'historical' ? (
          <>
            <HeroResult eyebrow="PURCHASING POWER" title="Equivalent amount" amount={formatResultCurrency(r.primaryAmount)} caption={<p className="calc-hero-caption">Historical purchasing power (US CPI-U).</p>} />
            <KeyMetrics items={[
              { icon: <Percent aria-hidden="true" />, label: 'Percent change', value: `${r.percentChange.toFixed(2)}%` },
              { icon: <Wallet aria-hidden="true" />, label: 'Purchasing power reduction', value: `${(r.purchasingPowerReduction ?? 0).toFixed(2)}%` },
            ]} />
            <Panel title="CPI used">
              <MetricRow label="Percent change" value={`${r.percentChange.toFixed(2)}%`} />
              <MetricRow label="Purchasing power reduction" value={`${(r.purchasingPowerReduction ?? 0).toFixed(2)}%`} />
              <MetricRow label="Base CPI" value={String(r.baseCpi)} />
              <MetricRow label="Target CPI" value={String(r.targetCpi)} />
            </Panel>
          </>
        ) : (
          <>
            <HeroResult eyebrow="PROJECTION" title="Future equivalent cost" amount={formatResultCurrency(r.futurePrice ?? 0)} caption={<p className="calc-hero-caption">Assumed inflation projection, not a forecast.</p>} />
            <KeyMetrics items={[
              { icon: <Wallet aria-hidden="true" />, label: 'Purchasing power of original amount', value: formatResultCurrency(r.realValue ?? 0) },
              { icon: <Percent aria-hidden="true" />, label: 'Percent change', value: `${r.percentChange.toFixed(2)}%` },
            ]} />
            <Panel title="Projection details">
              <MetricRow label="Purchasing power of original amount" value={formatResultCurrency(r.realValue ?? 0)} />
              <MetricRow label="Percent change" value={`${r.percentChange.toFixed(2)}%`} />
            </Panel>
          </>
        )}
      </div>
    ),
  })

  const yearOptions = years.map((y) => ({ value: String(y), label: String(y) }))

  return (
    <CalculatorLayout
      {...layoutProps}
      onCalculate={() => handleCalculate(form)}
      inputs={
        <div className="calc-form">
          <CalcSection index={1} title="What to compare">
            <SegmentedControl
              options={[
                { value: 'historical', label: 'Historical' },
                { value: 'projection', label: 'Future projection' },
              ]}
              value={form.mode}
              onChange={(v) => set('mode', v)}
            />
            <Input label="Amount" prefix="$" grouped value={form.amount} onValueChange={(n) => set('amount', n)} error={errors.amount} />
            {form.mode === 'historical' ? (
              <>
                <Select label="Base year" value={String(form.baseYear ?? years[0])} onChange={(v) => set('baseYear', +v)} options={yearOptions} error={errors.baseYear} />
                <Select label="Target year" value={String(form.targetYear ?? years.at(-1))} onChange={(v) => set('targetYear', +v)} options={yearOptions} error={errors.targetYear} />
              </>
            ) : (
              <>
                <Input label="Assumed inflation rate" suffix="%" type="number" signed value={form.inflationRate ?? 3} onChange={(e) => set('inflationRate', +e.target.value)} error={errors.inflationRate} />
                <Input label="Duration (years)" type="number" value={form.durationYears ?? 10} onChange={(e) => set('durationYears', +e.target.value)} error={errors.durationYears} />
              </>
            )}
            <Note>Your estimate updates automatically as you edit.</Note>
          </CalcSection>
        </div>
      }
    />
  )
}
