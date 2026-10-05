import { useState } from 'react'
import { Landmark, Percent } from 'lucide-react'
import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { Assumptions, CalcSection, HeroResult, KeyMetrics, Note, Panel, Toggle } from '@/components/calculator/sections'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { JurisdictionSelect } from '@/components/ui/JurisdictionSelect'
import { MetricRow } from '@/components/ui/ResultBlock'
import { useCalculatorPage } from './useCalculatorPage'
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
  const [defaultInput] = useState<IncomeTaxInput>(() => ({
    country: settings.country,
    taxYear: settings.defaultTaxYear,
    jurisdictionId: settings.country === 'US' ? 'texas' : 'ontario',
    filingStatus: 'single',
    grossIncome: 100000,
    pretaxDeductions: 0,
    useStandardDeduction: true,
  }))

  const { form, set, errors, handleCalculate, layoutProps } = useCalculatorPage({
    calculatorId: 'income-tax',
    defaultInput,
    validate: validateIncomeTax,
    calculate: calculateIncomeTax,
    explain: explainIncomeTax,
    buildCharts: buildIncomeTaxCharts,
    buildTable: buildIncomeTaxTable,
    live: true,
    csvFilename: 'income-tax-brackets.csv',
    getShareText: (r, _input, formatResultCurrency) =>
      `Income tax: ${formatResultCurrency(r.totalTax)} total, ${(r.effectiveRate * 100).toFixed(1)}% effective`,
    renderResults: (r, _input, formatResultCurrency) => (
      <div className="calc-results">
        <HeroResult
          eyebrow="ROUGH HEADLINE ESTIMATE"
          eyebrowRight="annual"
          title="Total tax"
          amount={formatResultCurrency(r.totalTax)}
          caption={<p className="calc-hero-caption">After-tax income {formatResultCurrency(r.afterTaxIncome)}.</p>}
        />
        <KeyMetrics items={[
          { icon: <Landmark aria-hidden="true" />, label: 'After-tax income', value: formatResultCurrency(r.afterTaxIncome) },
          { icon: <Percent aria-hidden="true" />, label: 'Effective rate', value: `${(r.effectiveRate * 100).toFixed(2)}%`, note: `Marginal ${(r.marginalRate * 100).toFixed(2)}%` },
        ]} />
        <Panel title="Where the tax comes from">
          <MetricRow label="Taxable income" value={formatResultCurrency(r.taxableIncome)} />
          <MetricRow label="Regional taxable income" value={formatResultCurrency(r.regionalTaxableIncome)} />
          <MetricRow label="Federal tax" value={formatResultCurrency(r.federalTax)} />
          <MetricRow label="State / provincial" value={formatResultCurrency(r.regionalTax)} />
          <MetricRow label="Effective rate" value={`${(r.effectiveRate * 100).toFixed(2)}%`} />
          <MetricRow label="Marginal rate" value={`${(r.marginalRate * 100).toFixed(2)}%`} />
        </Panel>
        <Assumptions
          title="What this estimate includes"
          items={[
            'This is a rough headline estimate using published statutory brackets.',
            'Credits, local taxes, and many deductions are not modeled.',
            r.coverage.jurisdiction ? `Coverage: ${r.coverage.jurisdiction}, tax year ${r.coverage.taxYear}.` : 'Coverage depends on the selected jurisdiction and tax year.',
          ]}
        />
      </div>
    ),
  })

  return (
    <CalculatorLayout
      {...layoutProps}
      onCalculate={() => handleCalculate(form)}
      inputs={
        <div className="calc-form">
          <CalcSection index={1} title="Where you file">
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
                <Toggle
                  checked={form.useStandardDeduction}
                  onChange={checked => set('useStandardDeduction', checked)}
                  label="Apply standard deduction"
                />
              </>
            )}
          </CalcSection>
          <CalcSection index={2} title="Your income">
            <Input
              label="Gross income"
              prefix="$"
              grouped
              value={form.grossIncome}
              onValueChange={(n) => set('grossIncome', n)}
              error={errors.grossIncome}
            />
            <Input
              label="Pretax deductions"
              prefix="$"
              grouped
              value={form.pretaxDeductions}
              onValueChange={(n) => set('pretaxDeductions', n)}
              error={errors.pretaxDeductions}
            />
            <Note>Your estimate updates automatically as you edit.</Note>
          </CalcSection>
        </div>
      }
    />
  )
}
