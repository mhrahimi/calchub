import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ResultBlock, MetricRow } from '@/components/ui/ResultBlock'
import { useCalculatorPage, formatResultCurrency } from './useCalculatorPage'
import {
  calculateAmortization,
  explainAmortization,
  buildAmortizationCharts,
  buildAmortizationTable,
} from '@/calculators/finance/amortization/calculate'
import { validateAmortization } from '@/calculators/finance/amortization/validation'
import type { AmortizationInput } from '@/calculators/finance/amortization/types'

const defaultInput: AmortizationInput = {
  principal: 200000,
  interestRate: 6,
  term: 30,
  termUnit: 'years',
  paymentFrequency: 'monthly',
  extraPayment: 0,
  extraFrequency: 'every',
}

export default function AmortizationPage() {
  const { form, set, errors, handleCalculate, layoutProps } = useCalculatorPage({
    calculatorId: 'amortization',
    defaultInput,
    validate: validateAmortization,
    calculate: calculateAmortization,
    explain: explainAmortization,
    buildCharts: buildAmortizationCharts,
    buildTable: buildAmortizationTable,
    csvFilename: 'amortization-schedule.csv',
    getShareText: (r) => `Amortization: Payment ${formatResultCurrency(r.payment)}, Total interest ${formatResultCurrency(r.totalInterest)}`,
    renderResults: (r) => (
      <div className="space-y-4">
        <ResultBlock label="Periodic payment" value={formatResultCurrency(r.payment)} primary />
        <div className="rounded-2xl border border-border bg-white p-4">
          <MetricRow label="Total payments" value={formatResultCurrency(r.totalPayments)} />
          <MetricRow label="Total interest" value={formatResultCurrency(r.totalInterest)} />
          <MetricRow label="Payoff periods" value={String(r.payoffPeriod)} />
          {r.interestSaved !== undefined && (
            <MetricRow label="Interest saved" value={formatResultCurrency(r.interestSaved)} />
          )}
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
          <Input label="Principal" prefix="$" type="number" inputMode="decimal" value={form.principal} onChange={(e) => set('principal', +e.target.value)} error={errors.principal} />
          <Input label="Interest rate" suffix="%" type="number" inputMode="decimal" value={form.interestRate} onChange={(e) => set('interestRate', +e.target.value)} error={errors.interestRate} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Term" type="number" inputMode="numeric" value={form.term} onChange={(e) => set('term', +e.target.value)} error={errors.term} />
            <Select label="Term unit" value={form.termUnit} onChange={(v) => set('termUnit', v as 'years' | 'months')} options={[{ value: 'years', label: 'Years' }, { value: 'months', label: 'Months' }]} />
          </div>
          <Select label="Payment frequency" value={form.paymentFrequency} onChange={(v) => set('paymentFrequency', v)} options={[{ value: 'monthly', label: 'Monthly' }, { value: 'bi-weekly', label: 'Bi-weekly' }, { value: 'weekly', label: 'Weekly' }]} />
          <Input label="Extra payment (optional)" prefix="$" type="number" inputMode="decimal" value={form.extraPayment ?? 0} onChange={(e) => set('extraPayment', +e.target.value)} />
        </>
      }
    />
  )
}
