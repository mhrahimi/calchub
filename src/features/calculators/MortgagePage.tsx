import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { MortgageResults } from './MortgageResults'
import { useCalculatorPage } from './useCalculatorPage'
import { calculateMortgage, explainMortgage, buildMortgageCharts, buildMortgageTable } from '@/calculators/finance/mortgage/calculate'
import { convertDownPayment } from '@/calculators/finance/mortgage/insights'
import { validateMortgage } from '@/calculators/finance/mortgage/validation'
import type { MortgageInput, OneTimeExtraPayment, PayoffOption } from '@/calculators/finance/mortgage/types'
import './mortgage.css'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const monthOptions = MONTHS.map((label, index) => ({ value: String(index + 1), label }))
function yearOptions(selected?: number) {
  const now = new Date().getFullYear()
  const from = Math.min(now - 10, selected ?? now)
  const to = Math.max(now + 50, selected ?? now)
  return Array.from({ length: to - from + 1 }, (_, i) => ({ value: String(from + i), label: String(from + i) }))
}

const defaultInput: MortgageInput = {
  country: 'US', homePrice: 500000, downPayment: 20, downPaymentIsPercent: true,
  interestRate: 6.5, termYears: 30, termMonths: 0,
  includeTaxesAndCosts: false, propertyTax: 6000, propertyTaxPeriod: 'annual',
  homeInsurance: 150, hoa: 0, pmi: 0, otherCosts: 0,
  includeExtraPayments: false, extraPayment: 0, extraFrequency: 'every', monthlyExtraPayment: 0, yearlyExtraPayment: 0,
  startYear: new Date().getFullYear(), startMonth: new Date().getMonth() + 1, oneTimeExtraPayments: [],
}

export default function MortgagePage() {
  const { form, setForm, set, errors, result, input, handleCalculate, layoutProps } = useCalculatorPage({
    calculatorId: 'mortgage', defaultInput, validate: validateMortgage, calculate: calculateMortgage,
    explain: explainMortgage, buildCharts: buildMortgageCharts, buildTable: buildMortgageTable,
    calculateOnLoad: true, csvFilename: 'mortgage-schedule.csv',
    getShareText: (r, _input, money) => `Mortgage: P&I ${money(r.principalAndInterest)}, housing estimate ${money(r.totalMonthlyHousing)}/mo`,
    renderResults: () => null,
  })
  const currency = form.country === 'CA' ? 'CAD' : 'USD'
  const money = (value: number) => new Intl.NumberFormat(form.country === 'CA' ? 'en-CA' : 'en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
  const downAmount = form.downPaymentIsPercent ? form.homePrice * form.downPayment / 100 : form.downPayment
  const downPercent = form.homePrice > 0 ? downAmount / form.homePrice * 100 : 0
  const updateExtra = (index: number, patch: Partial<OneTimeExtraPayment>) => set('oneTimeExtraPayments', (form.oneTimeExtraPayments ?? []).map((payment, i) => i === index ? { ...payment, ...patch } : payment))
  const calculate = () => {
    handleCalculate(form)
    if (validateMortgage(form).valid && window.matchMedia('(max-width: 1023px)').matches) {
      requestAnimationFrame(() => {
        const heading = document.getElementById('mortgage-estimate-title')
        heading?.focus({ preventScroll: true })
        heading?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
      })
    }
  }
  const applyPayoff = (option: PayoffOption) => {
    if (!input || layoutProps.inputsChanged) return
    const next = { ...input, includeExtraPayments: true, monthlyExtraPayment: option.monthlyExtra, yearlyExtraPayment: 0, oneTimeExtraPayments: [], extraPayment: 0, extraFrequency: 'every' as const }
    setForm(next)
    handleCalculate(next)
  }

  return <div className="mortgage-page">
    <CalculatorLayout {...layoutProps}
      description="Understand the monthly cost, explore an earlier payoff, and follow your balance over time."
      resultPresentation="inline"
      calculateLabel={layoutProps.inputsChanged ? 'Update estimate' : 'Calculate mortgage'}
      onCalculate={calculate}
      charts={undefined} table={undefined}
      results={result && input ? <MortgageResults result={result} input={input} charts={layoutProps.charts} disabled={layoutProps.inputsChanged} onApplyPayoff={applyPayoff} /> : null}
      inputs={<div className="mortgage-form" onKeyDown={event => {
        if (event.key === 'Enter' && event.target instanceof HTMLInputElement && event.target.type !== 'checkbox') { event.preventDefault(); calculate() }
      }}>
        {result && <a className="mortgage-jump" href="#mortgage-estimate-title">View your estimate <span aria-hidden="true">↓</span></a>}
        <fieldset className="mortgage-fieldset">
          <legend><span>01</span>Your mortgage</legend>
          <p className="mortgage-note">Starting values are examples. Use your own price and lender quote.</p>
          <SegmentedControl options={[{ value: 'US', label: 'United States · USD' }, { value: 'CA', label: 'Canada · CAD' }]} value={form.country} onChange={value => set('country', value)} />
          <Input label="Home price" prefix="$" grouped value={form.homePrice} onValueChange={n => set('homePrice', n)} error={errors.homePrice} />
          <div className="mortgage-down-heading"><span>Down payment</span><div className="mortgage-unit-switch" role="group" aria-label="Down payment units">
            <button type="button" aria-pressed={form.downPaymentIsPercent} onClick={() => setForm(f => ({ ...f, downPayment: convertDownPayment(f, true), downPaymentIsPercent: true }))}>%</button>
            <button type="button" aria-pressed={!form.downPaymentIsPercent} onClick={() => setForm(f => ({ ...f, downPayment: convertDownPayment(f, false), downPaymentIsPercent: false }))}>$</button>
          </div></div>
          <Input id="mortgage-down-payment" aria-label="Down payment" suffix={form.downPaymentIsPercent ? '%' : undefined} prefix={form.downPaymentIsPercent ? undefined : '$'} grouped={!form.downPaymentIsPercent} type="number" value={form.downPayment} onValueChange={n => set('downPayment', n)} error={errors.downPayment} />
          <div className="mortgage-loan-preview"><span>{form.downPaymentIsPercent ? money(downAmount) : `${downPercent.toFixed(2)}%`} down</span><strong>{money(Math.max(0, form.homePrice - downAmount))} loan</strong></div>
          <Input label="Interest rate" suffix="%" type="number" value={form.interestRate} onValueChange={n => set('interestRate', n)} error={errors.interestRate} hint={form.country === 'CA' ? 'Quoted nominal rate; semi-annual compounding.' : 'Annual note rate, excluding loan fees.'} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Amortization (years)" type="number" value={form.termYears} onValueChange={n => set('termYears', n)} error={errors.termYears} />
            <Input label="Additional months" type="number" value={form.termMonths} onValueChange={n => set('termMonths', n)} error={errors.termMonths} />
          </div>
          <div className="mortgage-term-presets" role="group" aria-label="Common amortization periods">{[15, 20, 25, 30].map(years => <button key={years} type="button" aria-pressed={form.termYears === years && form.termMonths === 0} onClick={() => setForm(f => ({ ...f, termYears: years, termMonths: 0 }))}>{years} years</button>)}</div>
          {form.country === 'CA' && <p className="mortgage-note">Amortization is the full repayment period. This model holds your rate constant through future renewals.</p>}
          <div className="grid grid-cols-2 gap-3">
            <Select label="First payment month" value={String(form.startMonth ?? new Date().getMonth() + 1)} onChange={v => set('startMonth', +v)} options={monthOptions} error={errors.startMonth} />
            <Input label="First payment year" type="number" value={form.startYear ?? new Date().getFullYear()} onValueChange={n => set('startYear', n)} error={errors.startYear} />
          </div>
        </fieldset>

        <fieldset className="mortgage-fieldset">
          <legend><span>02</span>Ownership costs</legend>
          <label className="mortgage-toggle"><input type="checkbox" checked={form.includeTaxesAndCosts} onChange={event => set('includeTaxesAndCosts', event.target.checked)} /><span>Include taxes, insurance & fees<small>Build a fuller monthly budget.</small></span></label>
          {form.includeTaxesAndCosts ? <div className="mortgage-optional-fields">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Property tax" prefix="$" grouped value={form.propertyTax} onValueChange={n => set('propertyTax', n)} error={errors.propertyTax} />
              <Select label="Tax frequency" value={form.propertyTaxPeriod} onChange={value => set('propertyTaxPeriod', value as 'annual' | 'monthly')} options={[{ value: 'annual', label: 'Per year' }, { value: 'monthly', label: 'Per month' }]} />
            </div>
            <Input label="Home insurance" prefix="$" suffix="/mo" grouped value={form.homeInsurance} onValueChange={n => set('homeInsurance', n)} error={errors.homeInsurance} />
            <Input label="HOA / strata fees" prefix="$" suffix="/mo" grouped value={form.hoa} onValueChange={n => set('hoa', n)} error={errors.hoa} />
            <Input label={form.country === 'US' ? 'Mortgage insurance (PMI)' : 'Monthly mortgage insurance'} prefix="$" suffix="/mo" grouped value={form.pmi} onValueChange={n => set('pmi', n)} error={errors.pmi} hint={form.country === 'CA' ? 'Monthly charges only. Upfront or financed insurance premiums are not modeled.' : 'Use your lender’s quote. Automatic cancellation is not modeled.'} />
            <Input label="Other ownership costs" prefix="$" suffix="/mo" grouped value={form.otherCosts} onValueChange={n => set('otherCosts', n)} error={errors.otherCosts} hint="For example, maintenance, utilities or flood insurance." />
          </div> : <p className="mortgage-note">Your estimate includes principal and interest only.</p>}
        </fieldset>

        <fieldset className="mortgage-fieldset">
          <legend><span>03</span>Pay off sooner</legend>
          <label className="mortgage-toggle"><input type="checkbox" checked={form.includeExtraPayments} onChange={event => set('includeExtraPayments', event.target.checked)} /><span>Add extra payments<small>See the interest and time you could save.</small></span></label>
          {form.includeExtraPayments && <div className="mortgage-optional-fields">
            <Input label="Monthly extra payment" prefix="$" grouped value={form.monthlyExtraPayment ?? ((form.extraFrequency ?? 'every') === 'every' ? form.extraPayment ?? 0 : 0)} onValueChange={n => set('monthlyExtraPayment', n)} error={errors.monthlyExtraPayment} />
            <Input label="Yearly extra payment" prefix="$" grouped value={form.yearlyExtraPayment ?? (form.extraFrequency === 'yearly' ? form.extraPayment ?? 0 : 0)} onValueChange={n => set('yearlyExtraPayment', n)} error={errors.yearlyExtraPayment} hint="Applied with payments 12, 24, 36, and so on." />
            <div className="space-y-3"><p className="text-sm font-medium">One-time extra payments</p>
              {(form.oneTimeExtraPayments ?? []).map((payment, index) => <div key={index} className="mortgage-extra-row">
                <Input label={`Extra payment ${index + 1}`} prefix="$" grouped value={payment.amount} onValueChange={amount => updateExtra(index, { amount })} error={errors[`oneTimeExtraPayments.${index}.amount`]} />
                <div className="grid grid-cols-2 gap-3">
                  <Select id={`extra-month-${index}`} label="Month" value={String(payment.month)} onChange={v => updateExtra(index, { month: +v })} options={monthOptions} error={errors[`oneTimeExtraPayments.${index}.month`]} />
                  <Select id={`extra-year-${index}`} label="Year" value={String(payment.year)} onChange={v => updateExtra(index, { year: +v })} options={yearOptions(payment.year)} error={errors[`oneTimeExtraPayments.${index}.year`]} />
                </div>
                <Button type="button" variant="ghost" size="sm" aria-label={`Remove extra payment ${index + 1}`} onClick={() => set('oneTimeExtraPayments', (form.oneTimeExtraPayments ?? []).filter((_, i) => i !== index))}>Remove payment</Button>
              </div>)}
              <Button type="button" variant="secondary" size="sm" onClick={() => set('oneTimeExtraPayments', [...(form.oneTimeExtraPayments ?? []), { amount: 0, year: form.startYear ?? new Date().getFullYear(), month: form.startMonth ?? new Date().getMonth() + 1 }])}>+ Add one-time payment</Button>
            </div>
          </div>}
        </fieldset>
        <p className="mortgage-note">All amounts in {currency}. Switching countries changes the currency label and rate convention; it does not convert your amounts.</p>
      </div>}
    />
  </div>
}
