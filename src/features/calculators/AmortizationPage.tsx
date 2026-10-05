import { CalendarDays, Percent } from 'lucide-react'
import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { CalcSection, HeroResult, KeyMetrics, Note, Panel } from '@/components/calculator/sections'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { MetricRow } from '@/components/ui/ResultBlock'
import { useCalculatorPage } from './useCalculatorPage'
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
    live: true,
    csvFilename: 'amortization-schedule.csv',
    getShareText: (r, _input, formatResultCurrency) => `Amortization: Payment ${formatResultCurrency(r.payment)}, Total interest ${formatResultCurrency(r.totalInterest)}`,
    renderResults: (r, _input, formatResultCurrency) => (
      <div className="calc-results">
        <HeroResult eyebrow="YOUR PAYMENT" eyebrowRight="per period" title="Periodic payment" amount={formatResultCurrency(r.payment)} />
        <KeyMetrics items={[
          { icon: <Percent aria-hidden="true" />, label: 'Total interest', value: formatResultCurrency(r.totalInterest) },
          { icon: <CalendarDays aria-hidden="true" />, label: 'Payoff periods', value: String(r.payoffPeriod) },
        ]} />
        <Panel title="Loan totals">
          <MetricRow label="Total payments" value={formatResultCurrency(r.totalPayments)} />
          <MetricRow label="Total interest" value={formatResultCurrency(r.totalInterest)} />
          <MetricRow label="Payoff periods" value={String(r.payoffPeriod)} />
          {r.interestSaved !== undefined && (
            <MetricRow label="Interest saved" value={formatResultCurrency(r.interestSaved)} />
          )}
        </Panel>
      </div>
    ),
  })

  return (
    <CalculatorLayout
      {...layoutProps}
      onCalculate={() => handleCalculate(form)}
      inputs={
        <div className="calc-form">
          <CalcSection index={1} title="Loan">
            <Input label="Principal" prefix="$" grouped value={form.principal} onValueChange={(n) => set('principal', n)} error={errors.principal} />
            <Input label="Interest rate" suffix="%" type="number" inputMode="decimal" value={form.interestRate} onChange={(e) => set('interestRate', +e.target.value)} error={errors.interestRate} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Term" type="number" inputMode="numeric" value={form.term} onChange={(e) => set('term', +e.target.value)} error={errors.term} />
              <Select label="Term unit" value={form.termUnit} onChange={(v) => set('termUnit', v as 'years' | 'months')} options={[{ value: 'years', label: 'Years' }, { value: 'months', label: 'Months' }]} />
            </div>
            <Select label="Payment frequency" value={form.paymentFrequency} onChange={(v) => set('paymentFrequency', v)} options={[{ value: 'monthly', label: 'Monthly' }, { value: 'bi-weekly', label: 'Bi-weekly' }, { value: 'weekly', label: 'Weekly' }]} />
          </CalcSection>
          <CalcSection index={2} title="Extra payments">
            <Input label="Extra payment (optional)" prefix="$" grouped value={form.extraPayment ?? 0} onValueChange={(n) => set('extraPayment', n)} />
            <Note>Your estimate updates automatically as you edit.</Note>
          </CalcSection>
        </div>
      }
    />
  )
}
