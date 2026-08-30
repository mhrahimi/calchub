import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ResultBlock, MetricRow } from '@/components/ui/ResultBlock'
import { useCalculatorPage, formatResultCurrency } from './useCalculatorPage'
import { calculateInvestment, explainInvestment, buildInvestmentCharts, buildInvestmentTable } from '@/calculators/finance/investment/calculate'
import { validateInvestment } from '@/calculators/finance/investment/validation'
import type { InvestmentInput } from '@/calculators/finance/investment/types'

const defaultInput: InvestmentInput = {
  solveFor: 'fv',
  startingInvestment: 10000,
  periodicContribution: 500,
  contributionFrequency: 'monthly',
  contributionTiming: 'end',
  returnRate: 7,
  period: 20,
  periodUnit: 'years',
}

export default function InvestmentPage() {
  const { form, set, errors, handleCalculate, layoutProps } = useCalculatorPage({
    calculatorId: 'investment',
    defaultInput,
    validate: validateInvestment,
    calculate: calculateInvestment,
    explain: explainInvestment,
    buildCharts: buildInvestmentCharts,
    buildTable: buildInvestmentTable,
    csvFilename: 'investment-growth.csv',
    getShareText: (r) => `Investment ending balance: ${formatResultCurrency(r.endingBalance)}`,
    renderResults: (r) => (
      <div className="space-y-4">
        <ResultBlock label={r.solvedLabel} value={form.solveFor === 'fv' ? formatResultCurrency(r.endingBalance) : String(r.solvedValue)} primary />
        <div className="rounded-2xl border border-border bg-white p-4">
          <MetricRow label="Starting principal" value={formatResultCurrency(r.startingPrincipal)} />
          <MetricRow label="Total contributions" value={formatResultCurrency(r.totalContributions)} />
          <MetricRow label="Investment earnings" value={formatResultCurrency(r.investmentEarnings)} />
          <MetricRow label="Ending balance" value={formatResultCurrency(r.endingBalance)} />
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
          <Select label="Solve for" value={form.solveFor} onChange={(v) => set('solveFor', v as InvestmentInput['solveFor'])} options={[{ value: 'fv', label: 'Future value' }, { value: 'pmt', label: 'Contribution' }, { value: 'rate', label: 'Return rate' }, { value: 'periods', label: 'Time' }]} />
          <Input label="Starting investment" prefix="$" type="number" value={form.startingInvestment} onChange={(e) => set('startingInvestment', +e.target.value)} />
          <Input label="Periodic contribution" prefix="$" type="number" value={form.periodicContribution} onChange={(e) => set('periodicContribution', +e.target.value)} />
          <Input label="Return rate" suffix="%" type="number" value={form.returnRate} onChange={(e) => set('returnRate', +e.target.value)} error={errors.returnRate} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Period" type="number" value={form.period} onChange={(e) => set('period', +e.target.value)} error={errors.period} />
            <Select label="Period unit" value={form.periodUnit} onChange={(v) => set('periodUnit', v as 'years' | 'months')} options={[{ value: 'years', label: 'Years' }, { value: 'months', label: 'Months' }]} />
          </div>
          <SegmentedControl options={[{ value: 'end', label: 'End of period' }, { value: 'begin', label: 'Beginning' }]} value={form.contributionTiming} onChange={(v) => set('contributionTiming', v)} />
          {form.solveFor !== 'fv' && (
            <Input label="Target value" prefix="$" type="number" value={form.targetValue ?? 0} onChange={(e) => set('targetValue', +e.target.value)} />
          )}
        </>
      }
    />
  )
}
