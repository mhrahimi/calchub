import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ResultBlock, MetricRow } from '@/components/ui/ResultBlock'
import { useCalculatorPage, formatResultCurrency } from './useCalculatorPage'
import {
  calculateMortgage,
  explainMortgage,
  buildMortgageCharts,
  buildMortgageTable,
} from '@/calculators/finance/mortgage/calculate'
import { validateMortgage } from '@/calculators/finance/mortgage/validation'
import type { CostSlice, MortgageInput } from '@/calculators/finance/mortgage/types'

const defaultInput: MortgageInput = {
  country: 'US',
  homePrice: 500000,
  downPayment: 20,
  downPaymentIsPercent: true,
  interestRate: 6.5,
  term: 30,
  termUnit: 'years',
  propertyTax: 6000,
  propertyTaxPeriod: 'annual',
  homeInsurance: 150,
  includeMiscCosts: false,
  hoa: 0,
  pmi: 0,
  otherCosts: 0,
  extraPayment: 0,
}

function formatPct(n: number) {
  return `${n.toFixed(1)}%`
}

function BreakdownList({ title, slices }: { title: string; slices: CostSlice[] }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <p className="text-sm font-medium text-text-primary mb-2">{title}</p>
      {slices.map((s) => (
        <MetricRow
          key={s.label}
          label={`${s.label} (${formatPct(s.percent)})`}
          value={formatResultCurrency(s.amount)}
        />
      ))}
    </div>
  )
}

export default function MortgagePage() {
  const { form, set, errors, handleCalculate, layoutProps } = useCalculatorPage({
    calculatorId: 'mortgage',
    defaultInput,
    validate: validateMortgage,
    calculate: calculateMortgage,
    explain: explainMortgage,
    buildCharts: buildMortgageCharts,
    buildTable: buildMortgageTable,
    csvFilename: 'mortgage-schedule.csv',
    getShareText: (r) =>
      `Mortgage: P&I ${formatResultCurrency(r.principalAndInterest)}, Total housing ${formatResultCurrency(r.totalMonthlyHousing)}/mo`,
    renderResults: (r) => (
      <div className="space-y-4">
        <ResultBlock
          label="Principal & interest"
          value={formatResultCurrency(r.principalAndInterest)}
          sublabel="per month"
          primary
        />
        <ResultBlock
          label="Total monthly housing"
          value={formatResultCurrency(r.totalMonthlyHousing)}
          sublabel="P&I plus taxes, insurance, and selected fees"
        />
        <div className="rounded-2xl border border-border bg-white p-4">
          <MetricRow label="Home price" value={formatResultCurrency(r.loanAmount + r.downPaymentAmount)} />
          <MetricRow label="Down payment" value={formatResultCurrency(r.downPaymentAmount)} />
          <MetricRow label="Loan amount" value={formatResultCurrency(r.loanAmount)} />
          <MetricRow
            label="First payment → principal"
            value={`${formatResultCurrency(r.firstPaymentPrincipal)} (${formatPct(r.monthlyBreakdown.find((s) => s.label === 'Principal')?.percent ?? 0)})`}
          />
          <MetricRow
            label="First payment → interest"
            value={`${formatResultCurrency(r.firstPaymentInterest)} (${formatPct(r.monthlyBreakdown.find((s) => s.label === 'Interest')?.percent ?? 0)})`}
          />
          <MetricRow label="Total interest (life of loan)" value={formatResultCurrency(r.totalInterest)} />
          <MetricRow label="Lifetime housing cost" value={formatResultCurrency(r.totalLifetimeCost)} />
          {r.interestSaved !== undefined && (
            <MetricRow label="Interest saved (extra)" value={formatResultCurrency(r.interestSaved)} />
          )}
          {r.periodsSaved !== undefined && r.periodsSaved > 0 && (
            <MetricRow label="Time saved (extra)" value={`${r.periodsSaved} months`} />
          )}
        </div>
        <BreakdownList title="Where this month’s payment goes" slices={r.monthlyBreakdown} />
        <BreakdownList title="Lifetime cost mix" slices={r.lifetimeBreakdown} />
      </div>
    ),
  })

  return (
    <CalculatorLayout
      {...layoutProps}
      onCalculate={() => handleCalculate(form)}
      inputs={
        <>
          <SegmentedControl
            options={[
              { value: 'US', label: 'United States' },
              { value: 'CA', label: 'Canada' },
            ]}
            value={form.country}
            onChange={(v) => set('country', v)}
          />
          <Input
            label="Home price"
            prefix="$"
            grouped
            value={form.homePrice}
            onValueChange={(n) => set('homePrice', n)}
            error={errors.homePrice}
          />
          <SegmentedControl
            options={[
              { value: 'percent', label: 'Down payment %' },
              { value: 'amount', label: 'Down payment $' },
            ]}
            value={form.downPaymentIsPercent ? 'percent' : 'amount'}
            onChange={(v) => set('downPaymentIsPercent', v === 'percent')}
          />
          <Input
            label="Down payment"
            suffix={form.downPaymentIsPercent ? '%' : undefined}
            prefix={form.downPaymentIsPercent ? undefined : '$'}
            grouped={!form.downPaymentIsPercent}
            type="number"
            value={form.downPayment}
            onValueChange={(n) => set('downPayment', n)}
            error={errors.downPayment}
          />
          <Input
            label="Interest rate"
            suffix="%"
            type="number"
            value={form.interestRate}
            onChange={(e) => set('interestRate', +e.target.value)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Term"
              type="number"
              value={form.term}
              onChange={(e) => set('term', +e.target.value)}
            />
            <Select
              label="Term unit"
              value={form.termUnit}
              onChange={(v) => set('termUnit', v as 'years' | 'months')}
              options={[
                { value: 'years', label: 'Years' },
                { value: 'months', label: 'Months' },
              ]}
            />
          </div>
          <Input
            label="Property tax"
            prefix="$"
            grouped
            value={form.propertyTax}
            onValueChange={(n) => set('propertyTax', n)}
          />
          <Select
            label="Property tax period"
            value={form.propertyTaxPeriod}
            onChange={(v) => set('propertyTaxPeriod', v as 'monthly' | 'annual')}
            options={[
              { value: 'annual', label: 'Annual' },
              { value: 'monthly', label: 'Monthly' },
            ]}
          />
          <Input
            label="Home insurance"
            prefix="$"
            suffix="/mo"
            grouped
            value={form.homeInsurance}
            onValueChange={(n) => set('homeInsurance', n)}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.includeMiscCosts}
              onChange={(e) => set('includeMiscCosts', e.target.checked)}
            />
            Include HOA, PMI, and other monthly costs
          </label>
          {form.includeMiscCosts && (
            <>
              <Input
                label="HOA / strata"
                prefix="$"
                suffix="/mo"
                grouped
                value={form.hoa}
                onValueChange={(n) => set('hoa', n)}
              />
              <Input
                label="PMI"
                prefix="$"
                suffix="/mo"
                grouped
                value={form.pmi}
                onValueChange={(n) => set('pmi', n)}
              />
              <Input
                label="Other monthly costs"
                prefix="$"
                suffix="/mo"
                grouped
                value={form.otherCosts}
                onValueChange={(n) => set('otherCosts', n)}
                hint="HOA special assessments, flood insurance, etc."
              />
            </>
          )}
          <Input
            label="Extra payment"
            prefix="$"
            grouped
            value={form.extraPayment ?? 0}
            onValueChange={(n) => set('extraPayment', n)}
          />
        </>
      }
    />
  )
}
