import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ResultBlock, MetricRow } from '@/components/ui/ResultBlock'
import { useCalculatorPage, formatResultCurrency } from './useCalculatorPage'
import { calculateMortgage, explainMortgage, buildMortgageCharts, buildMortgageTable } from '@/calculators/finance/mortgage/calculate'
import { validateMortgage } from '@/calculators/finance/mortgage/validation'
import type { MortgageInput } from '@/calculators/finance/mortgage/types'

const defaultInput: MortgageInput = {
  country: 'US',
  homePrice: 500000,
  downPayment: 20,
  downPaymentIsPercent: true,
  interestRate: 6.5,
  term: 30,
  termUnit: 'years',
  propertyTax: 6000,
  propertyTaxPeriod: 'annual',
  homeInsurance: 150,
  hoa: 0,
  pmi: 0,
  otherCosts: 0,
  extraPayment: 0,
}

export default function MortgagePage() {
  const { form, set, errors, handleCalculate, layoutProps } = useCalculatorPage({
    calculatorId: 'mortgage',
    defaultInput,
    validate: validateMortgage,
    calculate: calculateMortgage,
    explain: explainMortgage,
    buildCharts: buildMortgageCharts,
    buildTable: buildMortgageTable,
    csvFilename: 'mortgage-schedule.csv',
    getShareText: (r) => `Mortgage: P&I ${formatResultCurrency(r.principalAndInterest)}, Total housing ${formatResultCurrency(r.totalMonthlyHousing)}/mo`,
    renderResults: (r) => (
      <div className="space-y-4">
        <ResultBlock label="Principal & interest" value={formatResultCurrency(r.principalAndInterest)} sublabel="per month" primary />
        <ResultBlock label="Total monthly housing" value={formatResultCurrency(r.totalMonthlyHousing)} sublabel="including taxes & insurance" />
        <div className="rounded-2xl border border-border bg-white p-4">
          <MetricRow label="Loan amount" value={formatResultCurrency(r.loanAmount)} />
          <MetricRow label="Total interest" value={formatResultCurrency(r.totalInterest)} />
          {r.interestSaved !== undefined && <MetricRow label="Interest saved (extra)" value={formatResultCurrency(r.interestSaved)} />}
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
          <SegmentedControl options={[{ value: 'US', label: 'United States' }, { value: 'CA', label: 'Canada' }]} value={form.country} onChange={(v) => set('country', v)} />
          <Input label="Home price" prefix="$" type="number" value={form.homePrice} onChange={(e) => set('homePrice', +e.target.value)} error={errors.homePrice} />
          <Input label="Down payment" suffix={form.downPaymentIsPercent ? '%' : undefined} prefix={form.downPaymentIsPercent ? undefined : '$'} type="number" value={form.downPayment} onChange={(e) => set('downPayment', +e.target.value)} error={errors.downPayment} />
          <Input label="Interest rate" suffix="%" type="number" value={form.interestRate} onChange={(e) => set('interestRate', +e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Term" type="number" value={form.term} onChange={(e) => set('term', +e.target.value)} />
            <Select label="Term unit" value={form.termUnit} onChange={(v) => set('termUnit', v as 'years' | 'months')} options={[{ value: 'years', label: 'Years' }, { value: 'months', label: 'Months' }]} />
          </div>
          <Input label="Property tax" prefix="$" type="number" value={form.propertyTax} onChange={(e) => set('propertyTax', +e.target.value)} />
          <Select label="Property tax period" value={form.propertyTaxPeriod} onChange={(v) => set('propertyTaxPeriod', v as 'monthly' | 'annual')} options={[{ value: 'annual', label: 'Annual' }, { value: 'monthly', label: 'Monthly' }]} />
          <Input label="Home insurance" prefix="$" suffix="/mo" type="number" value={form.homeInsurance} onChange={(e) => set('homeInsurance', +e.target.value)} />
          <Input label="HOA / strata" prefix="$" suffix="/mo" type="number" value={form.hoa} onChange={(e) => set('hoa', +e.target.value)} />
          <Input label="PMI" prefix="$" suffix="/mo" type="number" value={form.pmi} onChange={(e) => set('pmi', +e.target.value)} />
          <Input label="Extra payment" prefix="$" type="number" value={form.extraPayment ?? 0} onChange={(e) => set('extraPayment', +e.target.value)} />
        </>
      }
    />
  )
}
