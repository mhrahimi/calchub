import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ResultBlock, MetricRow } from '@/components/ui/ResultBlock'
import { useCalculatorPage, formatResultCurrency } from './useCalculatorPage'
import { calculateSavingsGoal, explainSavingsGoal, buildSavingsGoalCharts, buildSavingsGoalTable } from '@/calculators/finance/savingsGoal/calculate'
import { validateSavingsGoal } from '@/calculators/finance/savingsGoal/validation'
import type { SavingsGoalInput } from '@/calculators/finance/savingsGoal/types'

const defaultInput: SavingsGoalInput = {
  solveFor: 'contribution',
  currentSavings: 5000,
  goalAmount: 50000,
  returnRate: 6,
  period: 10,
  periodUnit: 'years',
  contributionFrequency: 'monthly',
  periodicContribution: 300,
}

export default function SavingsGoalPage() {
  const { form, set, errors, handleCalculate, layoutProps } = useCalculatorPage({
    calculatorId: 'savings-goal',
    defaultInput,
    validate: validateSavingsGoal,
    calculate: calculateSavingsGoal,
    explain: explainSavingsGoal,
    buildCharts: buildSavingsGoalCharts,
    buildTable: buildSavingsGoalTable,
    csvFilename: 'savings-goal.csv',
    getShareText: (r) => `Savings goal: contribute ${formatResultCurrency(r.requiredContribution)}/period`,
    renderResults: (r, input) => (
      <div className="space-y-4">
        {input.solveFor === 'contribution' && (
          <ResultBlock label="Required contribution" value={formatResultCurrency(r.requiredContribution)} sublabel="per period" primary />
        )}
        {input.solveFor === 'time' && (
          <ResultBlock label="Time to goal" value={`${r.timeToGoal} years`} primary />
        )}
        {input.solveFor === 'balance' && (
          <ResultBlock label="Projected balance" value={formatResultCurrency(r.projectedBalance)} primary />
        )}
        <div className="rounded-2xl border border-border bg-white p-4">
          {input.solveFor !== 'contribution' && (
            <MetricRow label="Contribution per period" value={formatResultCurrency(r.requiredContribution)} />
          )}
          {input.solveFor !== 'balance' && (
            <MetricRow label="Projected balance" value={formatResultCurrency(r.projectedBalance)} />
          )}
          {input.solveFor !== 'time' && (
            <MetricRow label="Time to goal" value={`${r.timeToGoal} years`} />
          )}
          <MetricRow label="Total contributions" value={formatResultCurrency(r.totalContributions)} />
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
          <Select
            label="Solve for"
            value={form.solveFor}
            onChange={(v) => set('solveFor', v as SavingsGoalInput['solveFor'])}
            options={[
              { value: 'contribution', label: 'Required contribution' },
              { value: 'time', label: 'Time to goal' },
              { value: 'balance', label: 'Projected balance' },
            ]}
          />
          <Input label="Current savings" prefix="$" type="number" value={form.currentSavings} onChange={(e) => set('currentSavings', +e.target.value)} error={errors.currentSavings} />
          <Input label="Goal amount" prefix="$" type="number" value={form.goalAmount} onChange={(e) => set('goalAmount', +e.target.value)} error={errors.goalAmount} />
          {form.solveFor !== 'contribution' && (
            <Input
              label="Contribution per period"
              prefix="$"
              type="number"
              value={form.periodicContribution ?? 0}
              onChange={(e) => set('periodicContribution', +e.target.value)}
              error={errors.periodicContribution}
            />
          )}
          <Input label="Return rate" suffix="%" type="number" value={form.returnRate} onChange={(e) => set('returnRate', +e.target.value)} />
          {form.solveFor !== 'time' && (
            <div className="grid grid-cols-2 gap-3">
              <Input label="Period" type="number" value={form.period} onChange={(e) => set('period', +e.target.value)} />
              <Select label="Period unit" value={form.periodUnit} onChange={(v) => set('periodUnit', v as 'years' | 'months')} options={[{ value: 'years', label: 'Years' }, { value: 'months', label: 'Months' }]} />
            </div>
          )}
          <Select
            label="Contribution frequency"
            value={form.contributionFrequency}
            onChange={(v) => set('contributionFrequency', v)}
            options={[
              { value: 'monthly', label: 'Monthly' },
              { value: 'bi-weekly', label: 'Bi-weekly' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'quarterly', label: 'Quarterly' },
              { value: 'annual', label: 'Annual' },
            ]}
          />
        </>
      }
    />
  )
}
