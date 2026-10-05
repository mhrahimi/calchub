import { useEffect, useState } from 'react'
import { TrendingUp, Wallet } from 'lucide-react'
import { ValidationSummary } from '@/components/calculator/ValidationSummary'
import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { CalcSection, HeroResult, KeyMetrics, Note, Panel, Toggle } from '@/components/calculator/sections'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { MetricRow } from '@/components/ui/ResultBlock'
import { useCalculatorPage } from './useCalculatorPage'
import { calculateCompoundInterest, explainCompoundInterest, buildCompoundInterestCharts, buildCompoundInterestTable } from '@/calculators/finance/compoundInterest/calculate'
import { validateCompoundInterest } from '@/calculators/finance/compoundInterest/validation'
import type { CompoundInterestInput } from '@/calculators/finance/compoundInterest/types'

const defaultInput: CompoundInterestInput = {
  principal: 10000,
  interestRate: 7,
  duration: 10,
  durationUnit: 'years',
  compoundingFrequency: 'monthly',
  contribution: 200,
  contributionFrequency: 'monthly',
  contributionTiming: 'end',
  continuous: false,
  adjustForInflation: false,
  inflationRate: 3,
}

type CashFlowKind = 'deposit' | 'withdrawal'

function signedContribution(kind: CashFlowKind, magnitude: number): number {
  if (Number.isNaN(magnitude)) return NaN
  const amount = Math.abs(magnitude)
  return kind === 'withdrawal' ? -amount : amount
}

export default function CompoundInterestPage() {
  const [cashFlow, setCashFlow] = useState<CashFlowKind>(
    defaultInput.contribution < 0 ? 'withdrawal' : 'deposit',
  )

  const { form, set, errors, handleCalculate, layoutProps } = useCalculatorPage({
    calculatorId: 'compound-interest',
    defaultInput,
    validate: validateCompoundInterest,
    calculate: calculateCompoundInterest,
    explain: explainCompoundInterest,
    buildCharts: buildCompoundInterestCharts,
    buildTable: buildCompoundInterestTable,
    live: true,
    autoCalculateDelay: 500,
    csvFilename: 'compound-interest.csv',
    getShareText: (r, _input, formatResultCurrency) => `Compound interest final balance: ${formatResultCurrency(r.finalBalance)}`,
    renderResults: (r, input, formatResultCurrency) => (
      <div className="calc-results">
        <HeroResult
          eyebrow="YOUR BALANCE"
          eyebrowRight={input.adjustForInflation ? 'nominal' : undefined}
          title="Final balance"
          amount={formatResultCurrency(r.finalBalance)}
          caption={input.adjustForInflation ? <p className="calc-hero-caption">Inflation-adjusted value {formatResultCurrency(r.realValue)}.</p> : undefined}
        />
        <KeyMetrics items={[
          { icon: <TrendingUp aria-hidden="true" />, label: 'Interest earned', value: formatResultCurrency(r.interestEarned) },
          { icon: <Wallet aria-hidden="true" />, label: input.contribution < 0 ? 'Net capital' : 'Total contributions', value: formatResultCurrency(r.totalContributions) },
        ]} />
        <Panel title="How the balance is built">
          <MetricRow
            label={input.contribution < 0 ? 'Net capital' : 'Total contributions'}
            value={formatResultCurrency(r.totalContributions)}
          />
          <MetricRow label="Interest earned" value={formatResultCurrency(r.interestEarned)} />
          {r.effectiveAnnualRate !== undefined && <MetricRow label="Effective annual rate" value={`${r.effectiveAnnualRate.toFixed(4)}%`} />}
          {r.depletionDate && <>
            <MetricRow label="Funds depleted on" value={r.depletionDate} />
            <MetricRow label="Unmet withdrawals" value={formatResultCurrency(r.unmetWithdrawals)} />
          </>}
        </Panel>
      </div>
    ),
  })

  useEffect(() => {
    if (form.contribution < 0) setCashFlow('withdrawal')
    else if (form.contribution > 0) setCashFlow('deposit')
  }, [form.contribution])

  const withdrawing = cashFlow === 'withdrawal'
  const amountMagnitude = Number.isNaN(form.contribution) ? NaN : Math.abs(form.contribution)

  return (
    <CalculatorLayout
      {...layoutProps}
      onCalculate={() => handleCalculate(form)}
      inputs={
        <div className="calc-form">
          <ValidationSummary errors={errors} />
          <CalcSection index={1} title="Starting point">
            <Input label="Start date" type="date" value={form.startDate ?? '2026-01-01'} onChange={e=>set('startDate',e.target.value)} error={errors.startDate} />
            <Input label="Principal" prefix="$" grouped allowSignedTyping emptyAsNaN value={form.principal} onValueChange={(n) => set('principal', n)} error={errors.principal} />
            <Input id="interest-rate" label="Nominal annual interest rate" suffix="%" type="number" signed allowSignedTyping emptyAsNaN value={form.interestRate} onValueChange={n => set('interestRate', n)} error={errors.interestRate} hint="Nominal annual rate with the compounding selected below; effective annual rate is shown in the results." />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Duration" type="number" allowSignedTyping emptyAsNaN value={form.duration} onValueChange={n => set('duration', n)} error={errors.duration} />
              <Select error={errors.durationUnit} label="Duration unit" value={form.durationUnit} onChange={(v) => set('durationUnit', v as 'years' | 'months')} options={[{ value: 'years', label: 'Years' }, { value: 'months', label: 'Months' }]} />
            </div>
            <Select
              label="Compounding"
              error={errors.compoundingFrequency}
              value={form.continuous ? 'continuous' : form.compoundingFrequency}
              onChange={(v) => {
                if (v === 'continuous') {
                  set('continuous', true)
                  set('compoundingFrequency', 'continuous')
                } else {
                  set('continuous', false)
                  set('compoundingFrequency', v)
                }
              }}
              options={[
                { value: 'daily', label: 'Daily' },
                { value: 'monthly', label: 'Monthly' },
                { value: 'quarterly', label: 'Quarterly' },
                { value: 'annual', label: 'Annual' },
                { value: 'continuous', label: 'Continuous' },
              ]}
            />
          </CalcSection>
          <CalcSection index={2} title="Periodic cash flow">
            <SegmentedControl
              label="Periodic cash flow"
              options={[
                { value: 'deposit', label: 'Deposit' },
                { value: 'withdrawal', label: 'Withdrawal' },
              ]}
              value={cashFlow}
              onChange={(kind) => {
                setCashFlow(kind)
                set('contribution', signedContribution(kind, form.contribution))
              }}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                id="contribution"
                label={withdrawing ? 'Withdrawal amount' : 'Deposit amount'}
                prefix="$"
                grouped
                emptyAsNaN
                error={errors.contribution}
                value={amountMagnitude}
                onValueChange={(n) => set('contribution', signedContribution(cashFlow, n))}
                hint={
                  withdrawing
                    ? 'Withdrawals are capped at available funds; unmet amounts are reported separately.'
                    : 'Added each period at the timing selected below.'
                }
              />
              <Select
                label={withdrawing ? 'Withdrawal frequency' : 'Deposit frequency'}
                error={errors.contributionFrequency}
                value={form.contributionFrequency}
                onChange={(v) => set('contributionFrequency', v)}
                options={[
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'bi-weekly', label: 'Bi-weekly' },
                  { value: 'bi-monthly', label: 'Bi-monthly (twice a month)' },
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'yearly', label: 'Yearly' },
                ]}
              />
            </div>
            <SegmentedControl
              label={withdrawing ? 'Withdrawal timing' : 'Deposit timing'}
              error={errors.contributionTiming}
              options={[{ value: 'end', label: 'End of period' }, { value: 'begin', label: 'Beginning' }]}
              value={form.contributionTiming}
              onChange={(v) => set('contributionTiming', v)}
            />
          </CalcSection>
          <CalcSection index={3} title="Adjustments">
            <Toggle
              checked={form.adjustForInflation}
              onChange={checked => set('adjustForInflation', checked)}
              label="Adjust for inflation"
              description="Show purchasing power of the final balance."
            />
            {errors.adjustForInflation && <p role="alert" className="text-sm text-red-600">{errors.adjustForInflation}</p>}
            {form.adjustForInflation && (
              <Input label="Inflation rate" suffix="%" type="number" signed allowSignedTyping emptyAsNaN value={form.inflationRate} onValueChange={n => set('inflationRate', n)} error={errors.inflationRate} />
            )}
            <Note>Your estimate updates automatically as you edit.</Note>
          </CalcSection>
        </div>
      }
    />
  )
}
