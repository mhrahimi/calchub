import { Percent, Wallet } from 'lucide-react'
import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { CalcSection, HeroResult, KeyMetrics, Note, Panel } from '@/components/calculator/sections'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { MetricRow } from '@/components/ui/ResultBlock'
import { useCalculatorPage } from './useCalculatorPage'
import { calculateInterestRate, explainInterestRate, buildInterestRateCharts, buildInterestRateTable } from '@/calculators/finance/interestRate/calculate'
import { validateInterestRate } from '@/calculators/finance/interestRate/validation'
import type { InterestRateInput } from '@/calculators/finance/interestRate/types'

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
    live: true,
    csvFilename: 'interest-rate-schedule.csv',
    getShareText: (r, _input, _formatResultCurrency) => `Implied annual rate: ${(r.annualRate * 100).toFixed(4)}%`,
    renderResults: (r, _input, formatResultCurrency) => (
      <div className="calc-results">
        <HeroResult eyebrow="IMPLIED RATE" eyebrowRight="nominal annual" title="Nominal annual rate" amount={`${(r.annualRate * 100).toFixed(4)}%`} />
        <KeyMetrics items={[
          { icon: <Percent aria-hidden="true" />, label: 'Effective annual rate', value: `${(r.effectiveAnnualRate * 100).toFixed(4)}%` },
          { icon: <Wallet aria-hidden="true" />, label: 'Total interest', value: formatResultCurrency(r.totalInterest) },
        ]} />
        <Panel title="Rate details">
          <MetricRow label="Effective annual rate" value={`${(r.effectiveAnnualRate * 100).toFixed(4)}%`} />
          <MetricRow label="Periodic rate" value={`${(r.periodicRate * 100).toFixed(4)}%`} />
          <MetricRow label="Total interest" value={formatResultCurrency(r.totalInterest)} />
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
          <CalcSection index={1} title="Loan and payment">
            <Input label="Principal" prefix="$" grouped value={form.principal} onValueChange={(n) => set('principal', n)} error={errors.principal} />
            <Input label="Payment" prefix="$" grouped value={form.payment} onValueChange={(n) => set('payment', n)} error={errors.payment} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Term" type="number" value={form.term} onChange={(e) => set('term', +e.target.value)} error={errors.term} />
              <Select label="Term unit" value={form.termUnit} onChange={(v) => set('termUnit', v as 'years' | 'months')} options={[{ value: 'years', label: 'Years' }, { value: 'months', label: 'Months' }]} />
            </div>
            <Input label="Balloon (optional)" prefix="$" grouped value={form.balloon ?? 0} onValueChange={(n) => set('balloon', n)} />
            <Note>Your estimate updates automatically as you edit.</Note>
          </CalcSection>
        </div>
      }
    />
  )
}
