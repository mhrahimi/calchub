import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { JurisdictionSelect } from '@/components/ui/JurisdictionSelect'
import { ResultBlock, MetricRow } from '@/components/ui/ResultBlock'
import { useCalculatorPage, formatResultCurrency } from './useCalculatorPage'
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

  const { form, set, errors, handleCalculate, layoutProps } = useCalculatorPage({
    calculatorId: 'salary',
    defaultInput: {
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
    } as SalaryInput,
    validate: validateSalary,
    calculate: calculateSalary,
    explain: explainSalary,
    buildCharts: buildSalaryCharts,
    buildTable: buildSalaryTable,
    csvFilename: 'salary-breakdown.csv',
    getShareText: (r) =>
      r.mode === 'take-home'
        ? `Estimated take-home: ${formatResultCurrency(r.estimatedNetAnnual ?? 0)}/year`
        : `Converted salary: ${formatResultCurrency(r.convertedAmount)}`,
    renderResults: (r) => (
      <div className="space-y-4">
        {r.mode === 'take-home' ? (
          <>
            <ResultBlock
              label="Estimated take-home (annual)"
              value={formatResultCurrency(r.estimatedNetAnnual ?? 0)}
              sublabel="Estimated take-home calculation"
              primary
            />
            <div className="rounded-2xl border border-border bg-white p-4">
              <MetricRow label="Gross" value={formatResultCurrency(r.annualGross)} />
              <MetricRow label="Federal tax" value={formatResultCurrency(r.federalTax ?? 0)} />
              <MetricRow label="State / provincial" value={formatResultCurrency(r.regionalTax ?? 0)} />
              <MetricRow label="Payroll" value={formatResultCurrency(r.payrollTotal ?? 0)} />
              <MetricRow label="Per selected frequency" value={formatResultCurrency(r.convertedAmount)} />
            </div>
          </>
        ) : (
          <>
            <ResultBlock
              label={`Equivalent (${form.toFrequency})`}
              value={formatResultCurrency(r.convertedAmount)}
              primary
            />
            <div className="rounded-2xl border border-border bg-white p-4">
              <MetricRow label="Annual gross" value={formatResultCurrency(r.annualGross)} />
              <MetricRow label="Monthly" value={formatResultCurrency(r.equivalents.monthly)} />
              <MetricRow label="Biweekly" value={formatResultCurrency(r.equivalents.biweekly)} />
              <MetricRow label="Hourly" value={formatResultCurrency(r.equivalents.hourly)} />
            </div>
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
        <>
          <SegmentedControl
            options={[
              { value: 'conversion', label: 'Salary Conversion' },
              { value: 'take-home', label: 'Take-Home Pay' },
            ]}
            value={form.mode}
            onChange={(v) => set('mode', v)}
          />
          <Input
            label="Amount"
            prefix="$"
            type="number"
            value={form.amount}
            onChange={(e) => set('amount', +e.target.value)}
            error={errors.amount}
          />
          <Select
            label="From frequency"
            value={form.fromFrequency}
            onChange={(v) => set('fromFrequency', v as PayFrequency)}
            options={FREQ_OPTIONS}
          />
          <Select
            label="To frequency"
            value={form.toFrequency}
            onChange={(v) => set('toFrequency', v as PayFrequency)}
            options={FREQ_OPTIONS}
          />
          {showHourly && (
            <>
              <Input
                label="Hours per week"
                type="number"
                value={form.hoursPerWeek ?? 40}
                onChange={(e) => set('hoursPerWeek', +e.target.value)}
                error={errors.hoursPerWeek}
              />
              <Input
                label="Weeks per year"
                type="number"
                value={form.weeksPerYear ?? 52}
                onChange={(e) => set('weeksPerYear', +e.target.value)}
                error={errors.weeksPerYear}
              />
            </>
          )}
          {form.mode === 'take-home' && (
            <>
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
                label="Pretax deductions (annual)"
                prefix="$"
                type="number"
                value={form.pretaxDeductions ?? 0}
                onChange={(e) => set('pretaxDeductions', +e.target.value)}
              />
            </>
          )}
        </>
      }
    />
  )
}
