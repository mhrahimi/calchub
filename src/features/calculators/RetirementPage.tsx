import { CalendarDays, Wallet } from 'lucide-react'
import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { CalcSection, HeroResult, KeyMetrics, Note, Panel } from '@/components/calculator/sections'
import { Input } from '@/components/ui/Input'
import { MetricRow } from '@/components/ui/ResultBlock'
import { useCalculatorPage } from './useCalculatorPage'
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
    live: true,
    autoCalculateDelay: 500,
    csvFilename: 'retirement-projection.csv',
    getShareText: (r, _input, formatResultCurrency) =>
      `Retirement: projected ${formatResultCurrency(r.projectedBalance)} vs required ${formatResultCurrency(r.requiredBalance)}`,
    renderResults: (r, _input, formatResultCurrency) => (
      <div className="calc-results">
        <HeroResult
          eyebrow={r.shortfallOrSurplus >= 0 ? 'SURPLUS AT RETIREMENT' : 'SHORTFALL AT RETIREMENT'}
          title={r.shortfallOrSurplus >= 0 ? 'Surplus at retirement' : 'Shortfall at retirement'}
          amount={formatResultCurrency(Math.abs(r.shortfallOrSurplus))}
          caption={<p className="calc-hero-caption">Projected {formatResultCurrency(r.projectedBalance)} vs required {formatResultCurrency(r.requiredBalance)}.</p>}
        />
        <KeyMetrics items={[
          { icon: <Wallet aria-hidden="true" />, label: 'Projected balance', value: formatResultCurrency(r.projectedBalance) },
          { icon: <CalendarDays aria-hidden="true" />, label: 'Years to retirement', value: String(r.yearsToRetirement) },
        ]} />
        <Panel title="What you would need">
          <MetricRow label="Projected balance" value={formatResultCurrency(r.projectedBalance)} />
          <MetricRow label="Required nest egg" value={formatResultCurrency(r.requiredBalance)} />
          <MetricRow label="Required first-year contribution" value={formatResultCurrency(r.requiredAnnualContribution)} />
          <MetricRow label="Years to retirement" value={String(r.yearsToRetirement)} />
          {r.depletionAge != null && <MetricRow label="Savings depleted at age" value={String(r.depletionAge)} />}
          {r.totalUnmetSpending !== undefined && <MetricRow label="Unmet retirement spending" value={formatResultCurrency(r.totalUnmetSpending)} />}
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
          <CalcSection index={1} title="You today">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Current age" type="number" value={form.currentAge} onChange={(e) => set('currentAge', +e.target.value)} error={errors.currentAge} />
              <Input label="Retirement age" type="number" value={form.retirementAge} onChange={(e) => set('retirementAge', +e.target.value)} error={errors.retirementAge} />
            </div>
            <Input label="Current savings" prefix="$" grouped value={form.currentSavings} onValueChange={(n) => set('currentSavings', n)} error={errors.currentSavings} />
            <Input label="Annual contribution" prefix="$" grouped signed value={form.annualContribution} onValueChange={(n) => set('annualContribution', n)} hint="Negative amounts are withdrawals." error={errors.annualContribution} />
            <Input label="Contribution growth" suffix="%" type="number" signed value={form.contributionGrowth} onChange={(e) => set('contributionGrowth', +e.target.value)} error={errors.contributionGrowth} />
          </CalcSection>
          <CalcSection index={2} title="Growth and spending">
            <Input label="Expected return" suffix="%" type="number" value={form.expectedReturn} onChange={(e) => set('expectedReturn', +e.target.value)} error={errors.expectedReturn} />
            <Input label="Inflation" suffix="%" type="number" signed value={form.inflation} onChange={(e) => set('inflation', +e.target.value)} error={errors.inflation} />
            <Input label="Retirement spending (annual)" prefix="$" grouped value={form.retirementSpending} onValueChange={(n) => set('retirementSpending', n)} error={errors.retirementSpending} />
            <Input label="Retirement duration (years)" type="number" value={form.retirementDuration} onChange={(e) => set('retirementDuration', +e.target.value)} error={errors.retirementDuration} />
            <Input label="Other retirement income (annual)" prefix="$" grouped value={form.otherRetirementIncome} onValueChange={(n) => set('otherRetirementIncome', n)} error={errors.otherRetirementIncome} />
            <Note>Your estimate updates automatically as you edit.</Note>
          </CalcSection>
        </div>
      }
    />
  )
}
