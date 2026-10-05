import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { CalcSection, HeroResult, KeyMetrics, Note, Panel } from '@/components/calculator/sections'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { MetricRow } from '@/components/ui/ResultBlock'
import { useCalculatorPage } from './useCalculatorPage'
import { calculateLoan, explainLoan, buildLoanCharts, buildLoanTable } from '@/calculators/finance/loan/calculate'
import { validateLoan } from '@/calculators/finance/loan/validation'
import type { LoanInput } from '@/calculators/finance/loan/types'
import { Wallet, Percent } from 'lucide-react'

const defaultInput: LoanInput = {
  mode: 'standard',
  loanAmount: 25000,
  interestRate: 5.9,
  term: 5,
  termUnit: 'years',
  paymentFrequency: 'monthly',
}

export default function LoanPage() {
  const { form, set, errors, handleCalculate, layoutProps } = useCalculatorPage({
    calculatorId: 'loan',
    defaultInput,
    validate: validateLoan,
    calculate: calculateLoan,
    explain: explainLoan,
    buildCharts: buildLoanCharts,
    buildTable: buildLoanTable,
    live: true,
    csvFilename: 'loan-schedule.csv',
    getShareText: (r, _input, formatResultCurrency) => `Loan payment: ${formatResultCurrency(r.payment)}/period`,
    renderResults: (r, _input, formatResultCurrency) => (
      <div className="calc-results">
        <HeroResult
          eyebrow="YOUR PAYMENT"
          eyebrowRight="per period"
          title="Periodic payment"
          amount={formatResultCurrency(r.payment)}
        />
        <KeyMetrics items={[
          { icon: <Percent aria-hidden="true" />, label: 'Total interest', value: formatResultCurrency(r.totalInterest) },
          { icon: <Wallet aria-hidden="true" />, label: 'Total cost', value: formatResultCurrency(r.totalCost) },
        ]} />
        <Panel title="Loan snapshot">
          <MetricRow label="Financed amount" value={formatResultCurrency(r.financedAmount)} />
          <MetricRow label="Total interest" value={formatResultCurrency(r.totalInterest)} />
          <MetricRow label="Total cost" value={formatResultCurrency(r.totalCost)} />
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
          <CalcSection index={1} title="What you are financing">
            <SegmentedControl options={[{ value: 'standard', label: 'Standard Loan' }, { value: 'auto', label: 'Auto Loan' }]} value={form.mode} onChange={(v) => set('mode', v)} />
            {form.mode === 'standard' ? (
              <Input label="Loan amount" prefix="$" grouped value={form.loanAmount ?? 0} onValueChange={(n) => set('loanAmount', n)} error={errors.loanAmount} />
            ) : (
              <>
                <Input label="Vehicle price" prefix="$" grouped value={form.vehiclePrice ?? 0} onValueChange={(n) => set('vehiclePrice', n)} error={errors.vehiclePrice} />
                <Input label="Cash down" prefix="$" grouped value={form.cashDown ?? 0} onValueChange={(n) => set('cashDown', n)} error={errors.cashDown} />
                <Input label="Trade-in value" prefix="$" grouped value={form.tradeIn ?? 0} onValueChange={(n) => set('tradeIn', n)} />
                <Input label="Rebates" prefix="$" grouped value={form.rebates ?? 0} onValueChange={(n) => set('rebates', n)} />
                <Input label="Sales tax rate" suffix="%" type="number" value={form.salesTaxRate ?? 0} onChange={(e) => set('salesTaxRate', +e.target.value)} />
                <Input label="Fees (financed)" prefix="$" grouped value={form.taxableFees ?? 0} onValueChange={(n) => set('taxableFees', n)} />
              </>
            )}
          </CalcSection>
          <CalcSection index={2} title="Rate and term">
            <Input label="Interest rate" suffix="%" type="number" value={form.interestRate} onChange={(e) => set('interestRate', +e.target.value)} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Term" type="number" value={form.term} onChange={(e) => set('term', +e.target.value)} />
              <Select label="Term unit" value={form.termUnit} onChange={(v) => set('termUnit', v as 'years' | 'months')} options={[{ value: 'years', label: 'Years' }, { value: 'months', label: 'Months' }]} />
            </div>
            <Note>Your estimate updates automatically as you edit.</Note>
          </CalcSection>
        </div>
      }
    />
  )
}
