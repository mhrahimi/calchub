import { useState } from 'react'
import { CalendarDays, Wallet } from 'lucide-react'
import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { CalcSection, HeroResult, KeyMetrics, Note, Panel } from '@/components/calculator/sections'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { JurisdictionSelect } from '@/components/ui/JurisdictionSelect'
import { MetricRow } from '@/components/ui/ResultBlock'
import { useApp } from '@/app/providers'
import { useCalculatorPage } from './useCalculatorPage'
import {
  calculateRetirement,
  explainRetirement,
  buildRetirementCharts,
  buildRetirementTable,
} from '@/calculators/finance/retirement/calculate'
import { validateRetirement } from '@/calculators/finance/retirement/validation'
import { RETURN_PRESETS, type ContributionPath, type ContributionTaxTreatment, type InvestMode, type RetirementInput, type ReturnPreset } from '@/calculators/finance/retirement/types'
import type { FilingStatus, TaxCountry } from '@/tax/types'

function withIncomeDefaults(current: RetirementInput, countryDefault: TaxCountry, taxYear: number): RetirementInput {
  const country = current.country ?? countryDefault
  return {
    ...current,
    contributionPath: 'income',
    grossIncome: current.grossIncome ?? 100000,
    country,
    jurisdictionId: current.jurisdictionId ?? (country === 'US' ? 'texas' : 'ontario'),
    filingStatus: current.filingStatus ?? 'single',
    taxYear: current.taxYear ?? taxYear,
    otherPretaxDeductions: current.otherPretaxDeductions ?? 0,
    investMode: current.investMode ?? 'percent-gross',
    investPercent: current.investPercent ?? 10,
    investAmount: current.investAmount ?? 10000,
    contributionTaxTreatment: current.contributionTaxTreatment ?? 'pretax',
    employerMatchPercent: current.employerMatchPercent ?? 0,
    employerMatchCapPercent: current.employerMatchCapPercent ?? 0,
  }
}

export default function RetirementPage() {
  const { settings } = useApp()
  const [defaultInput] = useState<RetirementInput>(() => ({
    contributionPath: 'direct',
    returnPreset: 'moderate',
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
  }))

  const { form, set, setForm, errors, handleCalculate, layoutProps } = useCalculatorPage({
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
    getShareText: (r, input, formatResultCurrency) =>
      input.contributionPath === 'income' && r.investedThisYear != null
        ? `Retirement: investing ${formatResultCurrency(r.investedThisYear)} this year, projected ${formatResultCurrency(r.projectedBalance)}`
        : `Retirement: projected ${formatResultCurrency(r.projectedBalance)} vs required ${formatResultCurrency(r.requiredBalance)}`,
    renderResults: (r, input, formatResultCurrency) => (
      <div className="calc-results">
        {input.contributionPath === 'income' && r.estimatedNetAnnual != null && (
          <Panel title="From your paycheck">
            <MetricRow label="Estimated take-home" value={formatResultCurrency(r.estimatedNetAnnual)} />
            <MetricRow label="You invest this year" value={formatResultCurrency(r.employeeContribution ?? 0)} />
            <MetricRow label="Employer match" value={formatResultCurrency(r.employerMatch ?? 0)} />
            <MetricRow label="Invested this year" value={formatResultCurrency(r.investedThisYear ?? 0)} />
            <MetricRow label="Projected balance in today's dollars" value={formatResultCurrency(r.projectedBalanceToday ?? 0)} />
            {(input.investMode === 'percent-net' || input.contributionTaxTreatment === 'aftertax') && (
              <Note>After-tax investment is paid from this take-home.</Note>
            )}
          </Panel>
        )}
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

  const income = form.contributionPath === 'income'
  const investMode = form.investMode ?? 'percent-gross'

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
            <Input label="Current investments" prefix="$" grouped value={form.currentSavings} onValueChange={(n) => set('currentSavings', n)} error={errors.currentSavings} />
          </CalcSection>
          <CalcSection index={2} title="What you invest">
            <SegmentedControl
              label="Contribution path"
              options={[
                { value: 'direct', label: 'Dollar amount' },
                { value: 'income', label: 'From income' },
              ]}
              value={form.contributionPath ?? 'direct'}
              onChange={(value: ContributionPath) => {
                if (value === 'income') setForm((current) => withIncomeDefaults(current, settings.country, settings.defaultTaxYear))
                else set('contributionPath', 'direct')
              }}
            />
            {income ? (
              <>
                <Input label="Gross annual income" prefix="$" grouped value={form.grossIncome ?? 0} onValueChange={(n) => set('grossIncome', n)} error={errors.grossIncome} />
                <Select
                  label="Country"
                  value={form.country ?? 'US'}
                  onChange={(value) => {
                    const country = value as TaxCountry
                    setForm((current) => ({
                      ...current,
                      country,
                      jurisdictionId: country === 'US' ? 'texas' : 'ontario',
                    }))
                  }}
                  options={[
                    { value: 'US', label: 'United States' },
                    { value: 'CA', label: 'Canada' },
                  ]}
                />
                <JurisdictionSelect
                  country={form.country ?? 'US'}
                  value={form.jurisdictionId ?? ''}
                  onChange={(id) => set('jurisdictionId', id)}
                  error={errors.jurisdictionId}
                />
                {form.country === 'US' && (
                  <Select
                    label="Filing status"
                    value={form.filingStatus ?? 'single'}
                    onChange={(value) => set('filingStatus', value as FilingStatus)}
                    options={[
                      { value: 'single', label: 'Single' },
                      { value: 'married_joint', label: 'Married filing jointly' },
                      { value: 'married_separate', label: 'Married filing separately' },
                      { value: 'head_of_household', label: 'Head of household' },
                    ]}
                  />
                )}
                {errors.taxYear && <p role="alert" className="text-sm text-red-600">{errors.taxYear}</p>}
                <Input
                  label="Other pre-tax deductions"
                  prefix="$"
                  grouped
                  value={form.otherPretaxDeductions ?? 0}
                  onValueChange={(n) => set('otherPretaxDeductions', n)}
                  hint="Health premiums and similar amounts. Do not include the investment below."
                  error={errors.otherPretaxDeductions}
                />
                <Select
                  label="Investment from pay"
                  value={investMode}
                  onChange={(value) => set('investMode', value as InvestMode)}
                  error={errors.investMode}
                  options={[
                    { value: 'percent-gross', label: 'Percent of gross' },
                    { value: 'percent-net', label: 'Percent of take-home' },
                    { value: 'fixed', label: 'Fixed annual amount' },
                  ]}
                />
                {investMode === 'fixed' ? (
                  <Input label="Annual amount to invest" prefix="$" grouped value={form.investAmount ?? 0} onValueChange={(n) => set('investAmount', n)} error={errors.investAmount} />
                ) : (
                  <Input
                    label={investMode === 'percent-net' ? 'Percent of take-home' : 'Percent of gross'}
                    suffix="%"
                    type="number"
                    value={form.investPercent ?? 0}
                    onChange={(e) => set('investPercent', +e.target.value)}
                    hint={investMode === 'percent-net' ? 'Taken from take-home after tax.' : undefined}
                    error={errors.investPercent}
                  />
                )}
                {investMode !== 'percent-net' && (
                  <SegmentedControl
                    label="Investment tax treatment"
                    options={[
                      { value: 'pretax', label: 'Pre-tax' },
                      { value: 'aftertax', label: 'After-tax' },
                    ]}
                    value={form.contributionTaxTreatment ?? 'pretax'}
                    onChange={(value: ContributionTaxTreatment) => set('contributionTaxTreatment', value)}
                    error={errors.contributionTaxTreatment}
                  />
                )}
                <Input
                  label="Employer match"
                  suffix="%"
                  type="number"
                  value={form.employerMatchPercent ?? 0}
                  onChange={(e) => set('employerMatchPercent', +e.target.value)}
                  hint="Share of your contribution the employer adds."
                  error={errors.employerMatchPercent}
                />
                <Input
                  label="Match cap"
                  suffix="%"
                  type="number"
                  value={form.employerMatchCapPercent ?? 0}
                  onChange={(e) => set('employerMatchCapPercent', +e.target.value)}
                  hint="Contributions above this percent of gross are not matched. Zero adds no match."
                  error={errors.employerMatchCapPercent}
                />
                <Input
                  label="Annual raise"
                  suffix="%"
                  type="number"
                  signed
                  value={form.contributionGrowth}
                  onChange={(e) => set('contributionGrowth', +e.target.value)}
                  hint="Applied to this year's investment. Later years do not recalculate taxes."
                  error={errors.contributionGrowth}
                />
              </>
            ) : (
              <>
                <Input label="Annual contribution" prefix="$" grouped signed value={form.annualContribution} onValueChange={(n) => set('annualContribution', n)} hint="Negative amounts are withdrawals." error={errors.annualContribution} />
                <Input label="Contribution growth" suffix="%" type="number" signed value={form.contributionGrowth} onChange={(e) => set('contributionGrowth', +e.target.value)} error={errors.contributionGrowth} />
              </>
            )}
          </CalcSection>
          <CalcSection index={3} title="Growth and spending">
            <SegmentedControl
              label="Return preset"
              options={[
                { value: 'conservative', label: 'Conservative' },
                { value: 'moderate', label: 'Moderate' },
                { value: 'growth', label: 'Growth' },
                { value: 'custom', label: 'Custom' },
              ]}
              value={form.returnPreset ?? 'custom'}
              onChange={(preset: ReturnPreset) => {
                setForm((current) => ({
                  ...current,
                  returnPreset: preset,
                  expectedReturn: preset === 'custom' ? current.expectedReturn : RETURN_PRESETS[preset],
                }))
              }}
              error={errors.returnPreset}
            />
            <Input
              label="Expected return"
              suffix="%"
              type="number"
              value={form.expectedReturn}
              onChange={(e) => setForm((current) => ({ ...current, expectedReturn: +e.target.value, returnPreset: 'custom' }))}
              hint="Conservative is 5%, moderate is 7%, and growth is 9%."
              error={errors.expectedReturn}
            />
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
