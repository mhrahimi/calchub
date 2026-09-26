import { useSnapshotCurrency } from '@/components/calculator/SnapshotFormat'
import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ResultBlock, MetricRow } from '@/components/ui/ResultBlock'
import { useCalculatorPage } from './useCalculatorPage'
import {
  calculateMortgage,
  explainMortgage,
  buildMortgageCharts,
  buildMortgageTable,
} from '@/calculators/finance/mortgage/calculate'
import { validateMortgage } from '@/calculators/finance/mortgage/validation'
import type { CostSlice, MortgageInput, OneTimeExtraPayment } from '@/calculators/finance/mortgage/types'

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const monthOptions = MONTHS.map((label, index) => ({
  value: String(index + 1),
  label,
}))

function yearOptions(selected?: number) {
  const now = new Date().getFullYear()
  const from = Math.min(now, selected ?? now)
  const to = Math.max(now + 40, selected ?? now)
  const years: { value: string; label: string }[] = []
  for (let year = from; year <= to; year++) {
    years.push({ value: String(year), label: String(year) })
  }
  return years
}

const defaultInput: MortgageInput = {
  country: 'US',
  homePrice: 500000,
  downPayment: 20,
  downPaymentIsPercent: true,
  interestRate: 6.5,
  termYears: 30,
  termMonths: 0,
  includeTaxesAndCosts: false,
  propertyTax: 6000,
  propertyTaxPeriod: 'annual',
  homeInsurance: 150,
  hoa: 0,
  pmi: 0,
  otherCosts: 0,
  includeExtraPayments: false,
  extraPayment: 0,
  extraFrequency: 'every',
  monthlyExtraPayment: 0,
  yearlyExtraPayment: 0,
  startYear: new Date().getFullYear(),
  startMonth: new Date().getMonth() + 1,
  oneTimeExtraPayments: [],
}

function formatPct(n: number) {
  return `${n.toFixed(1)}%`
}

function BreakdownList({ title, slices }: { title: string; slices: CostSlice[] }) {
  const formatResultCurrency = useSnapshotCurrency()
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
    getShareText: (r, _input, formatResultCurrency) =>
      `Mortgage: P&I ${formatResultCurrency(r.principalAndInterest)}, Total housing ${formatResultCurrency(r.totalMonthlyHousing)}/mo`,
    renderResults: (r, _input, formatResultCurrency) => (
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
          <MetricRow label="Remaining principal" value={formatResultCurrency(r.remainingBalance ?? r.schedule.at(-1)?.balance ?? 0)} />
          <MetricRow label="Final installment" value={formatResultCurrency(r.finalPayment ?? r.schedule.at(-1)?.payment ?? 0)} />
          <MetricRow label="Payoff date" value={r.payoffDate ?? ((r.schedule.at(-1)?.balance ?? 0) > 0 ? "Balance due at end of schedule" : "Not recorded")} />
          <MetricRow label="Total interest (life of loan)" value={formatResultCurrency(r.totalInterest)} />
          <MetricRow label="Housing cost during loan" value={formatResultCurrency(r.totalLifetimeCost)} />
          {r.interestSaved !== undefined && (
            <MetricRow label="Interest saved (extra)" value={formatResultCurrency(r.interestSaved)} />
          )}
          {r.periodsSaved !== undefined && r.periodsSaved > 0 && (
            <MetricRow label="Time saved (extra)" value={`${r.periodsSaved} months`} />
          )}
        </div>
        <BreakdownList title="Where this month’s payment goes" slices={r.monthlyBreakdown} />
        <BreakdownList title="Lifetime cost mix" slices={r.lifetimeBreakdown} />
        {r.payoffOptions.length > 0 && (
          <div className="rounded-2xl border border-border bg-white p-4">
            <p className="text-sm font-medium text-text-primary mb-1">Pay off sooner</p>
            <p className="text-sm text-text-muted mb-3">
              Extra to finish in these many years. Interest saved, total extra paid, and the payoff date use the monthly extra.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-text-muted">
                    <th className="py-2 pr-3 font-medium">Years</th>
                    <th className="py-2 pr-3 font-medium text-right">Extra / month</th>
                    <th className="py-2 pr-3 font-medium text-right">Extra / year</th>
                    <th className="py-2 pr-3 font-medium text-right">Interest saved</th>
                    <th className="py-2 pr-3 font-medium text-right">Total extra paid</th>
                    <th className="py-2 font-medium text-right">Payoff</th>
                  </tr>
                </thead>
                <tbody>
                  {r.payoffOptions.map((option) => (
                    <tr key={option.years} className="border-t border-border">
                      <td className="py-2 pr-3">{option.years}</td>
                      <td className="py-2 pr-3 text-right">{formatResultCurrency(option.monthlyExtra)}</td>
                      <td className="py-2 pr-3 text-right">{formatResultCurrency(option.yearlyExtra)}</td>
                      <td className="py-2 pr-3 text-right">{formatResultCurrency(option.interestSaved)}</td>
                      <td className="py-2 pr-3 text-right">{formatResultCurrency(option.totalExtraPaid)}</td>
                      <td className="py-2 text-right">{option.payoffDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    ),
  })

  return (
    <CalculatorLayout
      {...layoutProps}
      onCalculate={() => handleCalculate(form)}
      inputs={
        <>
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
              label="Term (years)"
              type="number"
              value={form.termYears}
              onChange={(e) => set('termYears', +e.target.value)}
              error={errors.termYears}
            />
            <Input
              label="Term (months)"
              type="number"
              value={form.termMonths}
              onChange={(e) => set('termMonths', +e.target.value)}
              error={errors.termMonths}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Start month"
              value={String(form.startMonth ?? new Date().getMonth() + 1)}
              onChange={(v) => set('startMonth', +v)}
              options={monthOptions}
              error={errors.startMonth}
            />
            <Select
              label="Start year"
              value={String(form.startYear ?? new Date().getFullYear())}
              onChange={(v) => set('startYear', +v)}
              options={yearOptions(form.startYear)}
              error={errors.startYear}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.includeTaxesAndCosts}
              onChange={(e) => set('includeTaxesAndCosts', e.target.checked)}
            />
            Include taxes & costs
          </label>
          {form.includeTaxesAndCosts && (
            <>
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
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.includeExtraPayments}
              onChange={(e) => set('includeExtraPayments', e.target.checked)}
            />
            Make extra payments
          </label>
          {form.includeExtraPayments && (
            <>
              <Input
                label="Monthly extra payment"
                prefix="$"
                grouped
                value={form.monthlyExtraPayment ?? 0}
                onValueChange={(n) => set('monthlyExtraPayment', n)}
              />
              <Input
                label="Yearly extra payment"
                prefix="$"
                grouped
                value={form.yearlyExtraPayment ?? 0}
                onValueChange={(n) => set('yearlyExtraPayment', n)}
                hint="Applied once each year for the life of the loan."
              />
              <div className="space-y-3">
                <p className="text-sm font-medium text-text-primary">One-time extra payments</p>
                {(form.oneTimeExtraPayments ?? []).map((payment, index) => {
                    const rowError = errors[`oneTimeExtraPayments.${index}.month`]
                    return (
                      <div key={index} className="space-y-2 rounded-2xl border border-border p-3">
                        <Input
                          label={`Extra payment ${index + 1}`}
                          prefix="$"
                          grouped
                          value={payment.amount}
                          onValueChange={(n) => {
                            const rows = [...(form.oneTimeExtraPayments ?? [])]
                            rows[index] = { ...payment, amount: n }
                            set('oneTimeExtraPayments', rows)
                          }}
                          error={errors[`oneTimeExtraPayments.${index}.amount`]}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Select
                            id={`extra-month-${index}`}
                            label="Month"
                            value={String(payment.month)}
                            onChange={(v) => {
                              const rows = [...(form.oneTimeExtraPayments ?? [])]
                              rows[index] = { ...payment, month: +v }
                              set('oneTimeExtraPayments', rows)
                            }}
                            options={monthOptions}
                            error={rowError}
                          />
                          <Select
                            id={`extra-year-${index}`}
                            label="Year"
                            value={String(payment.year)}
                            onChange={(v) => {
                              const rows = [...(form.oneTimeExtraPayments ?? [])]
                              rows[index] = { ...payment, year: +v }
                              set('oneTimeExtraPayments', rows)
                            }}
                            options={yearOptions(payment.year)}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const rows = (form.oneTimeExtraPayments ?? []).filter((_, i) => i !== index)
                            set('oneTimeExtraPayments', rows)
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    )
                  })}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const rows = form.oneTimeExtraPayments ?? []
                      const next: OneTimeExtraPayment = {
                        amount: 0,
                        year: form.startYear ?? new Date().getFullYear(),
                        month: form.startMonth ?? new Date().getMonth() + 1,
                      }
                      set('oneTimeExtraPayments', [...rows, next])
                    }}
                  >
                    Add payment
                  </Button>
                </div>
            </>
          )}
          <div className="space-y-2">
            <SegmentedControl
              options={[
                { value: 'US', label: 'United States' },
                { value: 'CA', label: 'Canada' },
              ]}
              value={form.country}
              onChange={(v) => set('country', v)}
            />
            <p className="text-sm text-text-muted">
              US rates use the nominal annual note rate ÷ 12 (monthly compounding). Canada converts the quoted rate from
              semi-annual compounding to a monthly equivalent, so the same nominal rate usually
              produces a slightly lower payment.
            </p>
          </div>
        </>
      }
    />
  )
}
