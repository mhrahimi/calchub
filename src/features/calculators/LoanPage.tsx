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
            <Input label="Loan amount" prefix="$" grouped value={form.loanAmount ?? 0} onValueChange={(n) => set('loanAmount', n)} error={errors.loanAmount} />
          ) : (
            <>
              <Input label="Vehicle price" prefix="$" grouped value={form.vehiclePrice ?? 0} onValueChange={(n) => set('vehiclePrice', n)} error={errors.vehiclePrice} />
              <Input label="Cash down" prefix="$" grouped value={form.cashDown ?? 0} onValueChange={(n) => set('cashDown', n)} />
              <Input label="Trade-in value" prefix="$" grouped value={form.tradeIn ?? 0} onValueChange={(n) => set('tradeIn', n)} />
              <Input label="Rebates" prefix="$" grouped value={form.rebates ?? 0} onValueChange={(n) => set('rebates', n)} />
              <Input label="Sales tax rate" suffix="%" type="number" value={form.salesTaxRate ?? 0} onChange={(e) => set('salesTaxRate', +e.target.value)} />
              <Input label="Fees" prefix="$" grouped value={form.taxableFees ?? 0} onValueChange={(n) => set('taxableFees', n)} />
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
