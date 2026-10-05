import { CalendarDays, Wallet } from 'lucide-react'
import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { CalcSection, HeroResult, KeyMetrics, Note, Panel } from '@/components/calculator/sections'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { MetricRow } from '@/components/ui/ResultBlock'
import { useCalculatorPage } from './useCalculatorPage'
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
    live: true,
    csvFilename: 'savings-goal.csv',
    getShareText: (r, _input, formatResultCurrency) => `Savings goal: contribute ${formatResultCurrency(r.requiredContribution)}/period`,
    renderResults: (r, input, formatResultCurrency) => (
      <div className="calc-results">
        <HeroResult
          eyebrow="YOUR GOAL"
          title={input.solveFor === 'contribution' ? 'Required contribution' : input.solveFor === 'time' ? 'Time to goal' : 'Projected balance'}
          amount={input.solveFor === 'contribution' ? formatResultCurrency(r.requiredContribution) : input.solveFor === 'time' ? `${Number(r.timeToGoal.toFixed(4))} years` : formatResultCurrency(r.projectedBalance)}
          unit={input.solveFor === 'contribution' ? '/period' : undefined}
        />
        <KeyMetrics items={[
          { icon: <Wallet aria-hidden="true" />, label: 'Projected balance', value: formatResultCurrency(r.projectedBalance) },
          { icon: <CalendarDays aria-hidden="true" />, label: 'Time horizon', value: `${Number(r.timeToGoal.toFixed(4))} years` },
        ]} />
        <Panel title="Path to the goal">
          {input.solveFor !== 'contribution' && (
            <MetricRow label="Contribution per period" value={formatResultCurrency(r.requiredContribution)} />
          )}
          {input.solveFor !== 'balance' && (
            <MetricRow label="Projected balance" value={formatResultCurrency(r.projectedBalance)} />
          )}
          {input.solveFor !== 'time' && (
            <MetricRow label="Time horizon" value={`${Number(r.timeToGoal.toFixed(4))} years`} />
          )}
          <MetricRow label="Total contributions" value={formatResultCurrency(r.totalContributions)} />
          {r.unmetWithdrawals > 0 && (
            <MetricRow label="Unmet withdrawals" value={formatResultCurrency(r.unmetWithdrawals)} />
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
          <CalcSection index={1} title="What to find">
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
          </CalcSection>
          <CalcSection index={2} title="Known values">
            <Input label="Current savings" prefix="$" grouped value={form.currentSavings} onValueChange={(n) => set('currentSavings', n)} error={errors.currentSavings} />
            <Input label="Goal amount" prefix="$" grouped value={form.goalAmount} onValueChange={(n) => set('goalAmount', n)} error={errors.goalAmount} />
            {form.solveFor !== 'contribution' && (
              <Input
                label="Contribution per period"
                prefix="$"
                grouped
                signed
                value={form.periodicContribution ?? 0}
                onValueChange={(n) => set('periodicContribution', n)}
                error={errors.periodicContribution}
                hint="Negative amounts are withdrawals."
              />
            )}
            <Input label="Return rate" suffix="%" type="number" value={form.returnRate} onChange={(e) => set('returnRate', +e.target.value)} />
            {form.solveFor !== 'time' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <Note>Your estimate updates automatically as you edit.</Note>
          </CalcSection>
        </div>
      }
    />
  )
}
