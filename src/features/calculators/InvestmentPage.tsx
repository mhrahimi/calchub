import { ValidationSummary } from '@/components/calculator/ValidationSummary'
import { CONTRIBUTION_OPTIONS, contributionUnit, elapsedTimeLabel, growthFrequency } from '@/utils/growthProjection'
import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ResultBlock, MetricRow } from '@/components/ui/ResultBlock'
import { useCalculatorPage } from './useCalculatorPage'
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
    getShareText: (r, _input, formatResultCurrency) => `Investment ending balance: ${formatResultCurrency(r.endingBalance)}`,
    renderResults: (r, input, formatResultCurrency) => (
      <div className="space-y-4">
        <ResultBlock label={r.solvedLabel} value={input.solveFor === 'rate' ? `${r.solvedValue.toFixed(4)}%` : input.solveFor === 'periods' ? r.elapsedTime ?? `${r.solvedValue} years` : formatResultCurrency(r.solvedValue)} primary />
        <div className="rounded-2xl border border-border bg-white p-4">
          <MetricRow label="Starting principal" value={formatResultCurrency(r.startingPrincipal)} />
          <MetricRow label="Total contributions" value={formatResultCurrency(r.totalContributions)} />
          <MetricRow label="Investment earnings" value={formatResultCurrency(r.investmentEarnings)} />
          <MetricRow label="Ending balance" value={formatResultCurrency(r.endingBalance)} />
          {r.effectiveAnnualRate !== undefined && <MetricRow label="Effective annual return" value={`${r.effectiveAnnualRate.toFixed(4)}%`} />}
          {r.depletionPeriod !== undefined && <>
            <MetricRow label="Funds depleted after" value={elapsedTimeLabel(Math.round(r.depletionPeriod * (growthFrequency(input.contributionFrequency)?.periods ?? 12)), input.contributionFrequency)} />
            <MetricRow label="Unmet withdrawals" value={formatResultCurrency(r.unmetWithdrawals)} />
          </>}
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
          <ValidationSummary errors={errors} />
          <Select label="Solve for" error={errors.solveFor} value={form.solveFor} onChange={(v) => set('solveFor', v as InvestmentInput['solveFor'])} options={[{ value: 'fv', label: 'Future value' }, { value: 'pmt', label: 'Contribution' }, { value: 'rate', label: 'Return rate' }, { value: 'periods', label: 'Time' }]} />
          {form.solveFor !== 'pv' && <Input label="Starting investment" prefix="$" grouped allowSignedTyping emptyAsNaN value={form.startingInvestment} onValueChange={(n) => set('startingInvestment', n)} error={errors.startingInvestment} />}
          <Select label="Contribution frequency" value={form.contributionFrequency} onChange={v => set('contributionFrequency', v)} options={CONTRIBUTION_OPTIONS} error={errors.contributionFrequency} />
          {form.solveFor !== 'pmt' && <Input
            id="periodic-contribution"
            label={`Contribution per ${contributionUnit(form.contributionFrequency)}`}
            prefix="$" grouped signed allowSignedTyping emptyAsNaN
            value={form.periodicContribution}
            onValueChange={(n) => set('periodicContribution', n)}
            error={errors.periodicContribution}
            hint="Negative amounts are withdrawals, capped at available funds."
          />}
          {form.solveFor !== 'rate' && <Input id="return-rate" label="Nominal annual return" suffix="%" type="number" signed allowSignedTyping emptyAsNaN value={form.returnRate} onValueChange={n => set('returnRate', n)} error={errors.returnRate} />}
          <p className="text-sm text-text-muted">The nominal annual rate is divided by {growthFrequency(form.contributionFrequency)?.periods ?? 'the number of'} periods per year and compounded at the selected frequency. Effective annual return is shown in the results.</p>
          {form.solveFor !== 'periods' && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Period" type="number" allowSignedTyping emptyAsNaN value={form.period} onValueChange={n => set('period', n)} error={errors.period} />
            <Select label="Period unit" value={form.periodUnit} onChange={(v) => set('periodUnit', v as 'years' | 'months')} error={errors.periodUnit} options={[{ value: 'years', label: 'Years' }, { value: 'months', label: 'Months' }]} />
          </div>}
          <SegmentedControl label="Contribution timing" error={errors.contributionTiming} options={[{ value: 'end', label: 'End of period' }, { value: 'begin', label: 'Beginning' }]} value={form.contributionTiming} onChange={(v) => set('contributionTiming', v)} />
          {form.solveFor !== 'fv' && <>
            <Input label="Target value" prefix="$" grouped allowSignedTyping emptyAsNaN value={form.targetValue ?? ''} onValueChange={(n) => set('targetValue', Number.isNaN(n) ? undefined : n)} error={errors.targetValue} />
            <p className="text-sm text-text-muted">{form.solveFor === 'periods' ? 'Lower targets with withdrawals or negative returns are drawdown goals. Time is measured at contribution and period-end events.' : 'The selected unknown is calculated from your target and the inputs above.'}</p>
          </>}

        </>
      }
    />
  )
}
