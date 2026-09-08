import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ResultBlock, MetricRow } from '@/components/ui/ResultBlock'
import { useCalculatorPage, formatResultCurrency } from './useCalculatorPage'
import { calculateCompoundInterest, explainCompoundInterest, buildCompoundInterestCharts, buildCompoundInterestTable } from '@/calculators/finance/compoundInterest/calculate'
import { validateCompoundInterest } from '@/calculators/finance/compoundInterest/validation'
import type { CompoundInterestInput } from '@/calculators/finance/compoundInterest/types'

const defaultInput: CompoundInterestInput = {
  principal: 10000,
  interestRate: 7,
  duration: 10,
  durationUnit: 'years',
  compoundingFrequency: 'monthly',
  contribution: 200,
  contributionFrequency: 'monthly',
  contributionTiming: 'end',
  continuous: false,
  adjustForInflation: false,
  inflationRate: 3,
}

export default function CompoundInterestPage() {
  const { form, set, errors, handleCalculate, layoutProps } = useCalculatorPage({
    calculatorId: 'compound-interest',
    defaultInput,
    validate: validateCompoundInterest,
    calculate: calculateCompoundInterest,
    explain: explainCompoundInterest,
    buildCharts: buildCompoundInterestCharts,
    buildTable: buildCompoundInterestTable,
    csvFilename: 'compound-interest.csv',
    getShareText: (r) => `Compound interest final balance: ${formatResultCurrency(r.finalBalance)}`,
    renderResults: (r, input) => (
      <div className="space-y-4">
        <ResultBlock label="Final balance" value={formatResultCurrency(r.finalBalance)} primary />
        {input.adjustForInflation && (
          <ResultBlock label="Inflation-adjusted value" value={formatResultCurrency(r.realValue)} />
        )}
        <div className="rounded-2xl border border-border bg-white p-4">
          <MetricRow label="Total contributions" value={formatResultCurrency(r.totalContributions)} />
          <MetricRow label="Interest earned" value={formatResultCurrency(r.interestEarned)} />
        </div>
      </div>
    ),
  })

  return (
    <CalculatorLayout
      {...layoutProps}
      onCalculate={() => handleCalculate(form)}
      inputs={
        <>
          <Input label="Principal" prefix="$" grouped value={form.principal} onValueChange={(n) => set('principal', n)} error={errors.principal} />
          <Input label="Interest rate" suffix="%" type="number" value={form.interestRate} onChange={(e) => set('interestRate', +e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Duration" type="number" value={form.duration} onChange={(e) => set('duration', +e.target.value)} />
            <Select label="Duration unit" value={form.durationUnit} onChange={(v) => set('durationUnit', v as 'years' | 'months')} options={[{ value: 'years', label: 'Years' }, { value: 'months', label: 'Months' }]} />
          </div>
          <Select
            label="Compounding"
            value={form.continuous ? 'continuous' : form.compoundingFrequency}
            onChange={(v) => {
              if (v === 'continuous') {
                set('continuous', true)
                set('compoundingFrequency', 'continuous')
              } else {
                set('continuous', false)
                set('compoundingFrequency', v)
              }
            }}
            options={[
              { value: 'daily', label: 'Daily' },
              { value: 'monthly', label: 'Monthly' },
              { value: 'quarterly', label: 'Quarterly' },
              { value: 'annual', label: 'Annual' },
              { value: 'continuous', label: 'Continuous' },
            ]}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Contribution"
              prefix="$"
              grouped
              value={form.contribution}
              onValueChange={(n) => set('contribution', n)}
              hint="Negative amounts are withdrawals."
            />
            <Select
              label="Contribution frequency"
              value={form.contributionFrequency}
              onChange={(v) => set('contributionFrequency', v)}
              options={[
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'bi-weekly', label: 'Bi-weekly' },
                { value: 'bi-monthly', label: 'Bi-monthly (twice a month)' },
                { value: 'monthly', label: 'Monthly' },
                { value: 'yearly', label: 'Yearly' },
              ]}
            />
          </div>
          <SegmentedControl options={[{ value: 'end', label: 'End of period' }, { value: 'begin', label: 'Beginning' }]} value={form.contributionTiming} onChange={(v) => set('contributionTiming', v)} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.adjustForInflation} onChange={(e) => set('adjustForInflation', e.target.checked)} />
            Adjust for inflation
          </label>
          {form.adjustForInflation && (
            <Input label="Inflation rate" suffix="%" type="number" value={form.inflationRate} onChange={(e) => set('inflationRate', +e.target.value)} />
          )}
        </>
      }
    />
  )
}
