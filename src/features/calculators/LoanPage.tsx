import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ResultBlock, MetricRow } from '@/components/ui/ResultBlock'
import { useCalculatorPage, formatResultCurrency } from './useCalculatorPage'
import { calculateLoan, explainLoan, buildLoanCharts, buildLoanTable } from '@/calculators/finance/loan/calculate'
import { validateLoan } from '@/calculators/finance/loan/validation'
import type { LoanInput } from '@/calculators/finance/loan/types'

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
    csvFilename: 'loan-schedule.csv',
    getShareText: (r) => `Loan payment: ${formatResultCurrency(r.payment)}/period`,
    renderResults: (r) => (
      <div className="space-y-4">
        <ResultBlock label="Payment" value={formatResultCurrency(r.payment)} primary />
        <div className="rounded-2xl border border-border bg-white p-4">
          <MetricRow label="Financed amount" value={formatResultCurrency(r.financedAmount)} />
          <MetricRow label="Total interest" value={formatResultCurrency(r.totalInterest)} />
          <MetricRow label="Total cost" value={formatResultCurrency(r.totalCost)} />
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
          <SegmentedControl options={[{ value: 'standard', label: 'Standard Loan' }, { value: 'auto', label: 'Auto Loan' }]} value={form.mode} onChange={(v) => set('mode', v)} />
          {form.mode === 'standard' ? (
            <Input label="Loan amount" prefix="$" type="number" value={form.loanAmount ?? 0} onChange={(e) => set('loanAmount', +e.target.value)} error={errors.loanAmount} />
          ) : (
            <>
              <Input label="Vehicle price" prefix="$" type="number" value={form.vehiclePrice ?? 0} onChange={(e) => set('vehiclePrice', +e.target.value)} error={errors.vehiclePrice} />
              <Input label="Cash down" prefix="$" type="number" value={form.cashDown ?? 0} onChange={(e) => set('cashDown', +e.target.value)} />
              <Input label="Trade-in value" prefix="$" type="number" value={form.tradeIn ?? 0} onChange={(e) => set('tradeIn', +e.target.value)} />
              <Input label="Rebates" prefix="$" type="number" value={form.rebates ?? 0} onChange={(e) => set('rebates', +e.target.value)} />
              <Input label="Sales tax rate" suffix="%" type="number" value={form.salesTaxRate ?? 0} onChange={(e) => set('salesTaxRate', +e.target.value)} />
              <Input label="Fees" prefix="$" type="number" value={form.taxableFees ?? 0} onChange={(e) => set('taxableFees', +e.target.value)} />
            </>
          )}
          <Input label="Interest rate" suffix="%" type="number" value={form.interestRate} onChange={(e) => set('interestRate', +e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Term" type="number" value={form.term} onChange={(e) => set('term', +e.target.value)} />
            <Select label="Term unit" value={form.termUnit} onChange={(v) => set('termUnit', v as 'years' | 'months')} options={[{ value: 'years', label: 'Years' }, { value: 'months', label: 'Months' }]} />
          </div>
        </>
      }
    />
  )
}
