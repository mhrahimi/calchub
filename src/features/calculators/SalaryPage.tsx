import { useState } from 'react'
import { Landmark, Wallet } from 'lucide-react'
import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { CalcSection, HeroResult, KeyMetrics, Note, Panel } from '@/components/calculator/sections'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { JurisdictionSelect } from '@/components/ui/JurisdictionSelect'
import { MetricRow } from '@/components/ui/ResultBlock'
import { useCalculatorPage } from './useCalculatorPage'
import { useApp } from '@/app/providers'
import {
  calculateSalary,
  explainSalary,
  buildSalaryCharts,
  buildSalaryTable,
} from '@/calculators/finance/salary/calculate'
import { validateSalary } from '@/calculators/finance/salary/validation'
import type { PayFrequency, SalaryInput } from '@/calculators/finance/salary/types'
import type { FilingStatus, TaxCountry } from '@/tax/types'

const FREQ_OPTIONS = [
  { value: 'annual', label: 'Annual' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'semi-monthly', label: 'Semi-monthly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'daily', label: 'Daily' },
  { value: 'hourly', label: 'Hourly' },
]

export default function SalaryPage() {
  const { settings } = useApp()
  const [defaultInput] = useState<SalaryInput>(() => ({
    mode: 'conversion',
    amount: 100000,
    fromFrequency: 'annual',
    toFrequency: 'monthly',
    hoursPerWeek: 40,
    weeksPerYear: 52,
    country: settings.country,
    jurisdictionId: settings.country === 'US' ? 'texas' : 'ontario',
    filingStatus: 'single',
    pretaxDeductions: 0,
    taxYear: settings.defaultTaxYear,
  }))

  const { form, set, errors, handleCalculate, layoutProps } = useCalculatorPage({
    calculatorId: 'salary',
    defaultInput,
    validate: validateSalary,
    calculate: calculateSalary,
    explain: explainSalary,
    buildCharts: buildSalaryCharts,
    buildTable: buildSalaryTable,
    live: true,
    csvFilename: 'salary-breakdown.csv',
    getShareText: (r, _input, formatResultCurrency) =>
      r.mode === 'take-home'
        ? `Estimated take-home: ${formatResultCurrency(r.estimatedNetAnnual ?? 0)}/year`
        : `Converted salary: ${formatResultCurrency(r.convertedAmount)}`,
    renderResults: (r, input, formatResultCurrency) => (
      <div className="calc-results">
        {r.mode === 'take-home' ? (
          <>
            <HeroResult
              eyebrow="ESTIMATED TAKE-HOME"
              eyebrowRight="annual"
              title="Estimated take-home (annual)"
              amount={formatResultCurrency(r.estimatedNetAnnual ?? 0)}
              caption={<p className="calc-hero-caption">Rough annual estimate; review the exclusions below.</p>}
            />
            <KeyMetrics items={[
              { icon: <Wallet aria-hidden="true" />, label: 'Gross', value: formatResultCurrency(r.annualGross) },
              { icon: <Landmark aria-hidden="true" />, label: 'Per selected frequency', value: formatResultCurrency(r.convertedAmount) },
            ]} />
            <Panel title="Taxes and payroll">
              <MetricRow label="Gross" value={formatResultCurrency(r.annualGross)} />
              <MetricRow label="Federal tax" value={formatResultCurrency(r.federalTax ?? 0)} />
              <MetricRow label="State / provincial" value={formatResultCurrency(r.regionalTax ?? 0)} />
              <MetricRow label="Payroll" value={formatResultCurrency(r.payrollTotal ?? 0)} />
              {r.payrollLabels?.map((item) => <MetricRow key={item.label} label={item.label} value={formatResultCurrency(item.amount)} />)}
              <MetricRow label="Per selected frequency" value={formatResultCurrency(r.convertedAmount)} />
            </Panel>
          </>
        ) : (
          <>
            <HeroResult
              eyebrow="EQUIVALENT PAY"
              eyebrowRight={input.toFrequency}
              title={`Equivalent (${input.toFrequency})`}
              amount={formatResultCurrency(r.convertedAmount)}
            />
            <KeyMetrics items={[
              { icon: <Wallet aria-hidden="true" />, label: 'Annual gross', value: formatResultCurrency(r.annualGross) },
              { icon: <Landmark aria-hidden="true" />, label: 'Monthly', value: formatResultCurrency(r.equivalents.monthly) },
            ]} />
            <Panel title="Other frequencies">
              <MetricRow label="Annual gross" value={formatResultCurrency(r.annualGross)} />
              <MetricRow label="Monthly" value={formatResultCurrency(r.equivalents.monthly)} />
              <MetricRow label="Biweekly" value={formatResultCurrency(r.equivalents.biweekly)} />
              <MetricRow label="Hourly" value={formatResultCurrency(r.equivalents.hourly)} />
            </Panel>
          </>
        )}
      </div>
    ),
  })

  const showHourly = form.fromFrequency === 'hourly' || form.toFrequency === 'hourly'

  return (
    <CalculatorLayout
      {...layoutProps}
      onCalculate={() => handleCalculate(form)}
      inputs={
        <div className="calc-form">
          <CalcSection index={1} title="Pay">
            <SegmentedControl
              options={[
                { value: 'conversion', label: 'Salary Conversion' },
                { value: 'take-home', label: 'Take-Home Pay' },
              ]}
              value={form.mode}
              onChange={(v) => set('mode', v)}
            />
            <Input label="Amount" prefix="$" grouped value={form.amount} onValueChange={(n) => set('amount', n)} error={errors.amount} />
            <Select label="From frequency" value={form.fromFrequency} onChange={(v) => set('fromFrequency', v as PayFrequency)} options={FREQ_OPTIONS} />
            <Select label="To frequency" value={form.toFrequency} onChange={(v) => set('toFrequency', v as PayFrequency)} options={FREQ_OPTIONS} />
            {showHourly && (
              <>
                <Input label="Hours per week" type="number" value={form.hoursPerWeek ?? 40} onChange={(e) => set('hoursPerWeek', +e.target.value)} error={errors.hoursPerWeek} />
                <Input label="Weeks per year" type="number" value={form.weeksPerYear ?? 52} onChange={(e) => set('weeksPerYear', +e.target.value)} error={errors.weeksPerYear} />
              </>
            )}
          </CalcSection>
          {form.mode === 'take-home' && (
            <CalcSection index={2} title="Tax settings">
              <Select
                label="Country"
                value={form.country ?? 'US'}
                onChange={(v) => {
                  const country = v as TaxCountry
                  set('country', country)
                  set('jurisdictionId', country === 'US' ? 'texas' : 'ontario')
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
                  onChange={(v) => set('filingStatus', v as FilingStatus)}
                  options={[
                    { value: 'single', label: 'Single' },
                    { value: 'married_joint', label: 'Married filing jointly' },
                    { value: 'married_separate', label: 'Married filing separately' },
                    { value: 'head_of_household', label: 'Head of household' },
                  ]}
                />
              )}
              <Input
                label="Deductions exempt from income and payroll tax (annual)"
                hint="Only deductions eligible for both. Other deduction types are not modeled."
                prefix="$"
                grouped
                value={form.pretaxDeductions ?? 0}
                onValueChange={(n) => set('pretaxDeductions', n)}
              />
            </CalcSection>
          )}
          <Note>Your estimate updates automatically as you edit.</Note>
        </div>
      }
    />
  )
}
