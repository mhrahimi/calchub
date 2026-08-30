import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { JurisdictionSelect } from '@/components/ui/JurisdictionSelect'
import { ResultBlock, MetricRow } from '@/components/ui/ResultBlock'
import { useCalculatorPage, formatResultCurrency } from './useCalculatorPage'
import { useApp } from '@/app/providers'
import {
  calculateIncomeTax,
  explainIncomeTax,
  buildIncomeTaxCharts,
  buildIncomeTaxTable,
} from '@/calculators/tax/incomeTax/calculate'
import { validateIncomeTax } from '@/calculators/tax/incomeTax/validation'
import type { IncomeTaxInput } from '@/calculators/tax/incomeTax/types'
import type { FilingStatus, TaxCountry } from '@/tax/types'

export default function IncomeTaxPage() {
  const { settings } = useApp()

  const defaultInput: IncomeTaxInput = {
    country: settings.country,
    taxYear: settings.defaultTaxYear,
    jurisdictionId: settings.country === 'US' ? 'texas' : 'ontario',
    filingStatus: 'single',
    grossIncome: 100000,
    pretaxDeductions: 0,
    useStandardDeduction: true,
  }

  const { form, set, errors, handleCalculate, layoutProps } = useCalculatorPage({
    calculatorId: 'income-tax',
    defaultInput,
    validate: validateIncomeTax,
    calculate: calculateIncomeTax,
    explain: explainIncomeTax,
    buildCharts: buildIncomeTaxCharts,
    buildTable: buildIncomeTaxTable,
    csvFilename: 'income-tax-brackets.csv',
    getShareText: (r) =>
      `Income tax: ${formatResultCurrency(r.totalTax)} total, ${(r.effectiveRate * 100).toFixed(1)}% effective`,
    renderResults: (r) => (
      <div className="space-y-4">
        <ResultBlock
          label="Total tax"
          value={formatResultCurrency(r.totalTax)}
          sublabel={`After-tax income ${formatResultCurrency(r.afterTaxIncome)}`}
          primary
        />
        <div className="rounded-2xl border border-border bg-white p-4">
          <MetricRow label="Taxable income" value={formatResultCurrency(r.taxableIncome)} />
          <MetricRow label="Federal tax" value={formatResultCurrency(r.federalTax)} />
          <MetricRow label="State / provincial" value={formatResultCurrency(r.regionalTax)} />
          <MetricRow label="Effective rate" value={`${(r.effectiveRate * 100).toFixed(2)}%`} />
          <MetricRow label="Marginal rate" value={`${(r.marginalRate * 100).toFixed(2)}%`} />
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
            label="Country"
            value={form.country}
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
          <Select
            label="Tax year"
            value={String(form.taxYear)}
            onChange={(v) => set('taxYear', +v)}
            options={[{ value: '2026', label: '2026' }]}
          />
          <JurisdictionSelect
            country={form.country}
            value={form.jurisdictionId}
            onChange={(id) => set('jurisdictionId', id)}
            error={errors.jurisdictionId}
          />
          {form.country === 'US' && (
            <>
              <Select
                label="Filing status"
                value={form.filingStatus}
                onChange={(v) => set('filingStatus', v as FilingStatus)}
                options={[
                  { value: 'single', label: 'Single' },
                  { value: 'married_joint', label: 'Married filing jointly' },
                  { value: 'married_separate', label: 'Married filing separately' },
                  { value: 'head_of_household', label: 'Head of household' },
                  { value: 'qualifying_surviving_spouse', label: 'Qualifying surviving spouse' },
                ]}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.useStandardDeduction}
                  onChange={(e) => set('useStandardDeduction', e.target.checked)}
                />
                Apply standard deduction
              </label>
            </>
          )}
          <Input
            label="Gross income"
            prefix="$"
            type="number"
            value={form.grossIncome}
            onChange={(e) => set('grossIncome', +e.target.value)}
            error={errors.grossIncome}
          />
          <Input
            label="Pretax deductions"
            prefix="$"
            type="number"
            value={form.pretaxDeductions}
            onChange={(e) => set('pretaxDeductions', +e.target.value)}
            error={errors.pretaxDeductions}
          />
        </>
      }
    />
  )
}
