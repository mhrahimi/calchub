import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { Input } from '@/components/ui/Input'
import { ResultBlock, MetricRow } from '@/components/ui/ResultBlock'
import { useCalculatorPage, formatResultCurrency } from './useCalculatorPage'
import {
  calculateRetirement,
  explainRetirement,
  buildRetirementCharts,
  buildRetirementTable,
} from '@/calculators/finance/retirement/calculate'
import { validateRetirement } from '@/calculators/finance/retirement/validation'
import type { RetirementInput } from '@/calculators/finance/retirement/types'

const defaultInput: RetirementInput = {
  currentAge: 35,
  retirementAge: 65,
  currentSavings: 50000,
  annualContribution: 15000,
  contributionGrowth: 2,
  expectedReturn: 7,
  inflation: 2.5,
  retirementSpending: 70000,
  retirementDuration: 25,
  otherRetirementIncome: 20000,
}

export default function RetirementPage() {
  const { form, set, errors, handleCalculate, layoutProps } = useCalculatorPage({
    calculatorId: 'retirement',
    defaultInput,
    validate: validateRetirement,
    calculate: calculateRetirement,
    explain: explainRetirement,
    buildCharts: buildRetirementCharts,
    buildTable: buildRetirementTable,
    csvFilename: 'retirement-projection.csv',
    getShareText: (r) =>
      `Retirement: projected ${formatResultCurrency(r.projectedBalance)} vs required ${formatResultCurrency(r.requiredBalance)}`,
    renderResults: (r) => (
      <div className="space-y-4">
        <ResultBlock
          label={r.shortfallOrSurplus >= 0 ? 'Surplus at retirement' : 'Shortfall at retirement'}
          value={formatResultCurrency(Math.abs(r.shortfallOrSurplus))}
          sublabel={`Projected ${formatResultCurrency(r.projectedBalance)} vs required ${formatResultCurrency(r.requiredBalance)}`}
          primary
        />
        <div className="rounded-2xl border border-border bg-white p-4">
          <MetricRow label="Projected balance" value={formatResultCurrency(r.projectedBalance)} />
          <MetricRow label="Required nest egg" value={formatResultCurrency(r.requiredBalance)} />
          <MetricRow
            label="Required annual contribution"
            value={formatResultCurrency(r.requiredAnnualContribution)}
          />
          <MetricRow label="Years to retirement" value={String(r.yearsToRetirement)} />
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
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Current age"
              type="number"
              value={form.currentAge}
              onChange={(e) => set('currentAge', +e.target.value)}
              error={errors.currentAge}
            />
            <Input
              label="Retirement age"
              type="number"
              value={form.retirementAge}
              onChange={(e) => set('retirementAge', +e.target.value)}
              error={errors.retirementAge}
            />
          </div>
          <Input
            label="Current savings"
            prefix="$"
            type="number"
            value={form.currentSavings}
            onChange={(e) => set('currentSavings', +e.target.value)}
            error={errors.currentSavings}
          />
          <Input
            label="Annual contribution"
            prefix="$"
            type="number"
            value={form.annualContribution}
            onChange={(e) => set('annualContribution', +e.target.value)}
          />
          <Input
            label="Contribution growth"
            suffix="%"
            type="number"
            value={form.contributionGrowth}
            onChange={(e) => set('contributionGrowth', +e.target.value)}
          />
          <Input
            label="Expected return"
            suffix="%"
            type="number"
            value={form.expectedReturn}
            onChange={(e) => set('expectedReturn', +e.target.value)}
            error={errors.expectedReturn}
          />
          <Input
            label="Inflation"
            suffix="%"
            type="number"
            value={form.inflation}
            onChange={(e) => set('inflation', +e.target.value)}
          />
          <Input
            label="Retirement spending (annual)"
            prefix="$"
            type="number"
            value={form.retirementSpending}
            onChange={(e) => set('retirementSpending', +e.target.value)}
          />
          <Input
            label="Retirement duration (years)"
            type="number"
            value={form.retirementDuration}
            onChange={(e) => set('retirementDuration', +e.target.value)}
            error={errors.retirementDuration}
          />
          <Input
            label="Other retirement income (annual)"
            prefix="$"
            type="number"
            value={form.otherRetirementIncome}
            onChange={(e) => set('otherRetirementIncome', +e.target.value)}
          />
        </>
      }
    />
  )
}
