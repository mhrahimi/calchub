import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ResultBlock, MetricRow } from '@/components/ui/ResultBlock'
import { useCalculatorPage } from './useCalculatorPage'
import { calculateInterestRate, explainInterestRate, buildInterestRateCharts, buildInterestRateTable } from '@/calculators/finance/interestRate/calculate'
import { validateInterestRate } from '@/calculators/finance/interestRate/validation'
import type { InterestRateInput } from '@/calculators/finance/interestRate/types'
import { formatResultCurrency } from './useCalculatorPage'

const defaultInput: InterestRateInput = {
  principal: 200000,
  payment: 1199.10,
  term: 30,
  termUnit: 'years',
  paymentFrequency: 'monthly',
}

export default function InterestRatePage() {
  const { form, set, errors, handleCalculate, layoutProps } = useCalculatorPage({
    calculatorId: 'interest-rate',
    defaultInput,
    validate: validateInterestRate,
    calculate: calculateInterestRate,
    explain: explainInterestRate,
    buildCharts: buildInterestRateCharts,
    buildTable: buildInterestRateTable,
    csvFilename: 'interest-rate-schedule.csv',
    getShareText: (r) => `Implied annual rate: ${(r.annualRate * 100).toFixed(4)}%`,
    renderResults: (r) => (
      <div className="space-y-4">
        <ResultBlock label="Nominal annual rate" value={`${(r.annualRate * 100).toFixed(4)}%`} primary />
        <div className="rounded-2xl border border-border bg-white p-4">
          <MetricRow label="Effective annual rate" value={`${(r.effectiveAnnualRate * 100).toFixed(4)}%`} />
          <MetricRow label="Periodic rate" value={`${(r.periodicRate * 100).toFixed(4)}%`} />
          <MetricRow label="Total interest" value={formatResultCurrency(r.totalInterest)} />
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
          <Input label="Principal" prefix="$" type="number" value={form.principal} onChange={(e) => set('principal', +e.target.value)} error={errors.principal} />
          <Input label="Payment" prefix="$" type="number" value={form.payment} onChange={(e) => set('payment', +e.target.value)} error={errors.payment} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Term" type="number" value={form.term} onChange={(e) => set('term', +e.target.value)} error={errors.term} />
            <Select label="Term unit" value={form.termUnit} onChange={(v) => set('termUnit', v as 'years' | 'months')} options={[{ value: 'years', label: 'Years' }, { value: 'months', label: 'Months' }]} />
          </div>
          <Input label="Balloon (optional)" prefix="$" type="number" value={form.balloon ?? 0} onChange={(e) => set('balloon', +e.target.value)} />
        </>
      }
    />
  )
}
