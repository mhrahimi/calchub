import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ResultBlock, MetricRow } from '@/components/ui/ResultBlock'
import { useCalculatorPage, formatResultCurrency } from './useCalculatorPage'
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
    csvFilename: 'inflation-schedule.csv',
    getShareText: (r) =>
      r.mode === 'historical'
        ? `Equivalent purchasing power: ${formatResultCurrency(r.primaryAmount)}`
        : `Future price: ${formatResultCurrency(r.futurePrice ?? 0)} (assumption)`,
    renderResults: (r) => (
      <div className="space-y-4">
        {r.mode === 'historical' ? (
          <>
            <ResultBlock
              label="Equivalent amount"
              value={formatResultCurrency(r.primaryAmount)}
              sublabel="Historical purchasing power (US CPI-U)"
              primary
            />
            <div className="rounded-2xl border border-border bg-white p-4">
              <MetricRow label="Percent change" value={`${r.percentChange.toFixed(2)}%`} />
              <MetricRow
                label="Purchasing power reduction"
                value={`${(r.purchasingPowerReduction ?? 0).toFixed(2)}%`}
              />
              <MetricRow label="Base CPI" value={String(r.baseCpi)} />
              <MetricRow label="Target CPI" value={String(r.targetCpi)} />
            </div>
          </>
        ) : (
          <>
            <ResultBlock
              label="Future equivalent cost"
              value={formatResultCurrency(r.futurePrice ?? 0)}
              sublabel="Assumed inflation projection, not a forecast"
              primary
            />
            <div className="rounded-2xl border border-border bg-white p-4">
              <MetricRow
                label="Purchasing power of original amount"
                value={formatResultCurrency(r.realValue ?? 0)}
              />
              <MetricRow label="Percent change" value={`${r.percentChange.toFixed(2)}%`} />
            </div>
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
        <>
          <SegmentedControl
            options={[
              { value: 'historical', label: 'Historical' },
              { value: 'projection', label: 'Future projection' },
            ]}
            value={form.mode}
            onChange={(v) => set('mode', v)}
          />
          <Input
            label="Amount"
            prefix="$"
            type="number"
            value={form.amount}
            onChange={(e) => set('amount', +e.target.value)}
            error={errors.amount}
          />
          {form.mode === 'historical' ? (
            <>
              <Select
                label="Base year"
                value={String(form.baseYear ?? years[0])}
                onChange={(v) => set('baseYear', +v)}
                options={yearOptions}
                error={errors.baseYear}
              />
              <Select
                label="Target year"
                value={String(form.targetYear ?? years.at(-1))}
                onChange={(v) => set('targetYear', +v)}
                options={yearOptions}
                error={errors.targetYear}
              />
            </>
          ) : (
            <>
              <Input
                label="Assumed inflation rate"
                suffix="%"
                type="number"
                value={form.inflationRate ?? 3}
                onChange={(e) => set('inflationRate', +e.target.value)}
                error={errors.inflationRate}
              />
              <Input
                label="Duration (years)"
                type="number"
                value={form.durationYears ?? 10}
                onChange={(e) => set('durationYears', +e.target.value)}
                error={errors.durationYears}
              />
            </>
          )}
        </>
      }
    />
  )
}
