import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { Input } from '@/components/ui/Input'
import { ResultBlock, MetricRow } from '@/components/ui/ResultBlock'
import { useCalculatorPage } from './useCalculatorPage'
import { calculateDti, explainDti, buildDtiCharts, buildDtiTable } from '@/calculators/finance/dti/calculate'
import { validateDti } from '@/calculators/finance/dti/validation'
import type { DtiInput } from '@/calculators/finance/dti/types'
import { formatResultCurrency } from './useCalculatorPage'

const defaultInput: DtiInput = {
  grossMonthlyIncome: 8000,
  housingCost: 2000,
  debtPayments: 500,
  guideline: 43,
}

export default function DtiPage() {
  const { form, set, errors, handleCalculate, layoutProps } = useCalculatorPage({
    calculatorId: 'dti',
    defaultInput,
    validate: validateDti,
    calculate: calculateDti,
    explain: explainDti,
    buildCharts: buildDtiCharts,
    buildTable: buildDtiTable,
    csvFilename: 'dti-summary.csv',
    getShareText: (r) => `DTI: Front-end ${r.frontEndDti}%, Back-end ${r.backEndDti}%`,
    renderResults: (r) => (
      <div className="space-y-4">
        <ResultBlock label="Back-end DTI" value={`${r.backEndDti}%`} sublabel={r.withinGuideline ? 'Within guideline' : 'Above guideline'} primary />
        <div className="rounded-2xl border border-border bg-white p-4">
          <MetricRow label="Front-end DTI" value={`${r.frontEndDti}%`} />
          <MetricRow label="Housing cost" value={formatResultCurrency(r.housingCost)} />
          <MetricRow label="Total debt payments" value={formatResultCurrency(r.totalDebt)} />
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
          <Input label="Gross monthly income" prefix="$" type="number" value={form.grossMonthlyIncome} onChange={(e) => set('grossMonthlyIncome', +e.target.value)} error={errors.grossMonthlyIncome} />
          <Input label="Housing cost" prefix="$" type="number" value={form.housingCost} onChange={(e) => set('housingCost', +e.target.value)} error={errors.housingCost} />
          <Input label="Other monthly debt payments" prefix="$" type="number" value={form.debtPayments} onChange={(e) => set('debtPayments', +e.target.value)} />
          <Input label="Lender guideline (back-end)" suffix="%" type="number" value={form.guideline} onChange={(e) => set('guideline', +e.target.value)} />
        </>
      }
    />
  )
}
