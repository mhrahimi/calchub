import { useMemo, useState } from 'react'
import { ArrowUpRight, CalendarDays, TrendingDown } from 'lucide-react'
import { ChartPanel } from '@/components/calculator/ChartPanel'
import { DataTable } from '@/components/calculator/DataTable'
import { useSnapshotCurrency } from '@/components/calculator/SnapshotFormat'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Button } from '@/components/ui/Button'
import { durationLabel, monthlyExtra, mortgageScheduleTable, rateScenarios } from '@/calculators/finance/mortgage/insights'
import type { CostSlice, MortgageInput, MortgageResult, PayoffOption } from '@/calculators/finance/mortgage/types'
import type { ChartData } from '@/calculators/types'
import { seriesColor } from '@/utils/chartPresentation'

type View = 'overview' | 'payoff' | 'schedule'

function monthLabel(value: string | null | undefined) {
  if (!value) return 'Not recorded'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

function CostBreakdown({ slices, title, note }: { slices: CostSlice[]; title: string; note: string }) {
  const money = useSnapshotCurrency()
  return <section className="mortgage-panel">
    <div className="mortgage-section-heading"><h3>{title}</h3><span>{money(slices.reduce((sum, slice) => sum + slice.amount, 0))}</span></div>
    <div className="mortgage-cost-bar" aria-hidden="true">{slices.map(slice => <span key={slice.label} style={{ width: `${slice.percent}%`, background: seriesColor(slice.label) }} />)}</div>
    <dl className="mortgage-cost-list">{slices.map(slice => <div key={slice.label}>
      <dt><span className="mortgage-dot" style={{ background: seriesColor(slice.label) }} />{slice.label}</dt>
      <dd><span>{slice.percent.toFixed(1)}%</span><strong>{money(slice.amount)}</strong></dd>
    </div>)}</dl>
    <p className="mortgage-note">{note}</p>
  </section>
}

export function MortgageResults({ result: r, input, charts, disabled, onApplyPayoff }: {
  result: MortgageResult
  input: MortgageInput
  charts?: ChartData[]
  disabled?: boolean
  onApplyPayoff: (option: PayoffOption) => void
}) {
  const money = useSnapshotCurrency()
  const [view, setView] = useState<View>('overview')
  const [annual, setAnnual] = useState(true)
  const [chartView, setChartView] = useState<'balance' | 'payments'>('balance')
  const [costView, setCostView] = useState<'monthly' | 'lifetime'>('monthly')
  const schedule = useMemo(() => mortgageScheduleTable(r, annual), [r, annual])
  const monthlySchedule = useMemo(() => mortgageScheduleTable(r, false), [r])
  const firstYear = r.schedule.filter(row => row.period <= 12)
  const firstYearPrincipal = firstYear.reduce((sum, row) => sum + row.principal + (row.extraPrincipal ?? 0), 0)
  const firstYearInterest = firstYear.reduce((sum, row) => sum + row.interest, 0)
  const housingExtras = r.totalMonthlyHousing - r.principalAndInterest
  const extra = monthlyExtra(input)
  const scenarios = useMemo(() => rateScenarios(input, r.loanAmount), [input, r.loanAmount])
  const activeChart = charts?.find(chart => chartView === 'balance' ? chart.title?.startsWith('Remaining balance') : chart.title?.startsWith('Principal vs interest'))
  const downPercent = r.downPaymentAmount / (r.loanAmount + r.downPaymentAmount) * 100
  const firstMonthExtra = r.schedule.filter(row => row.period === 1).reduce((sum, row) => sum + (row.extraPrincipal ?? 0), 0)
  // Rebuild percentages for legacy snapshots whose saved first-month mix omitted extras.
  const monthlySlices = useMemo(() => {
    const slices = r.monthlyBreakdown.filter(slice => slice.label !== 'Extra principal').map(slice => ({ ...slice }))
    if (firstMonthExtra > 0) slices.push({ label: 'Extra principal', amount: firstMonthExtra, percent: 0 })
    const total = slices.reduce((sum, slice) => sum + slice.amount, 0)
    return slices.map(slice => ({ ...slice, percent: total > 0 ? slice.amount / total * 100 : 0 }))
  }, [r.monthlyBreakdown, firstMonthExtra])

  return <div className="mortgage-results">
    <section className="mortgage-hero" aria-labelledby="mortgage-estimate-title">
      <div className="mortgage-eyebrow"><span>YOUR PAYMENT ESTIMATE</span><span>monthly</span></div>
      <h2 id="mortgage-estimate-title" tabIndex={-1}>{input.includeTaxesAndCosts ? 'Monthly housing estimate' : 'Monthly principal & interest'}</h2>
      <p className="mortgage-hero-amount">{money(r.totalMonthlyHousing)}<span>/mo</span></p>
      <p className="mortgage-hero-caption">{input.includeTaxesAndCosts ? `${money(r.principalAndInterest)} loan payment + ${money(housingExtras)} taxes, insurance & fees.` : 'Taxes, insurance and other ownership costs are not included.'}</p>
      {extra > 0 && <p className="mortgage-budget-note">With your planned monthly extra: <strong>{money(r.totalMonthlyHousing + extra)}/mo</strong>. Annual and one-time extras are separate; the final payment is capped at the balance due.</p>}
      <dl className="mortgage-hero-facts">
        <div><dt>Loan amount</dt><dd>{money(r.loanAmount)}</dd></div>
        <div><dt>Down payment · {downPercent.toFixed(1)}%</dt><dd>{money(r.downPaymentAmount)}</dd></div>
        <div><dt>Rate · amortization</dt><dd>{input.interestRate}% · {durationLabel(input.termYears * 12 + input.termMonths)}</dd></div>
      </dl>
    </section>

    <dl className="mortgage-key-metrics">
      <div><dt><CalendarDays aria-hidden="true" />Estimated payoff</dt><dd>{monthLabel(r.payoffDate)}</dd><span>{durationLabel(r.payoffPeriod)} of payments</span></div>
      <div><dt><TrendingDown aria-hidden="true" />Interest over the loan</dt><dd>{money(r.totalInterest)}</dd><span>{r.loanAmount > 0 ? `${(r.totalInterest / r.loanAmount * 100).toFixed(1)}% of the amount borrowed` : 'Based on this scenario'}</span></div>
    </dl>

    <nav className="mortgage-view-nav" aria-label="Mortgage result views">{([
      ['overview', 'Budget & cost'], ['payoff', 'Pay off sooner'], ['schedule', 'Schedule'],
    ] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={view === value} aria-controls="mortgage-result-view" onClick={() => setView(value)}>{label}</button>)}</nav>

    <div id="mortgage-result-view">
      {view === 'overview' && <div className="mortgage-view-content">
        <section className="mortgage-panel mortgage-chart-panel">
          <div className="mortgage-section-heading"><h3>Your path to owning it outright</h3></div>
          <SegmentedControl options={[{ value: 'balance', label: 'Loan balance' }, { value: 'payments', label: 'Principal & interest' }]} value={chartView} onChange={setChartView} />
          {activeChart && <ChartPanel data={activeChart} />}
          <p className="mortgage-insight">In your first {Math.min(12, r.payoffPeriod)} months, <strong>{money(firstYearPrincipal)}</strong> goes toward the loan and <strong>{money(firstYearInterest)}</strong> goes to interest.</p>
        </section>
        <div>
          <SegmentedControl options={[{ value: 'monthly', label: 'First month' }, { value: 'lifetime', label: 'Over the loan' }]} value={costView} onChange={setCostView} />
          <CostBreakdown slices={costView === 'monthly' ? monthlySlices : r.lifetimeBreakdown}
            title={costView === 'monthly' ? 'Where your first payment goes' : 'Housing costs during the loan'}
            note={costView === 'monthly' ? 'Includes extra principal actually paid in the first month. The principal / interest split changes with each payment.' : 'Includes loan payments and selected ownership costs until payoff. Excludes your down payment, closing costs and costs after payoff.'} />
        </div>
        <section className="mortgage-panel">
          <div className="mortgage-section-heading"><h3>What if the rate changes?</h3><span>P&I / month</span></div>
          <p className="mortgage-note">Compare starting rates on the same loan amount and amortization. These are hypothetical scenarios, not current offers or renewal forecasts.</p>
          <div className="mortgage-rate-grid">{scenarios.map(scenario => <div key={scenario.rate} className={scenario.rate === input.interestRate ? 'is-current' : ''}>
            <span>{scenario.rate.toFixed(2)}%{scenario.rate === input.interestRate ? ' · your rate' : ''}</span>
            <strong>{money(scenario.payment)}</strong>
            <small>{scenario.rate === input.interestRate ? 'Current scenario' : `${scenario.payment >= r.principalAndInterest ? '+' : '−'}${money(Math.abs(scenario.payment - r.principalAndInterest))}/mo`}</small>
          </div>)}</div>
        </section>
      </div>}

      {view === 'payoff' && <div className="mortgage-view-content">
        <section className="mortgage-savings-panel">
          <h3>{(r.interestSaved ?? 0) > 0 ? 'Your extra payments make a difference' : 'See what an extra payment can do'}</h3>
          {(r.interestSaved ?? 0) > 0 ? <dl className="mortgage-savings-grid"><div><dt>Interest saved</dt><dd>{money(r.interestSaved!)}</dd></div><div><dt>Time saved</dt><dd>{durationLabel(r.periodsSaved ?? 0)}</dd></div></dl> : <p>Choose a shorter payoff below, or add a monthly, annual or one-time payment in your inputs.</p>}
          <p className="mortgage-note">Savings compare with the same loan without extra payments. Check your lender’s prepayment limits; penalties are not included.</p>
        </section>
        <section className="mortgage-panel">
          <div className="mortgage-section-heading"><h3>Choose a payoff target</h3></div>
          <p className="mortgage-note">Each option is a separate plan starting with your original loan. Applying one replaces all current extras with the monthly amount shown.</p>
          <div className="mortgage-payoff-options">{(r.payoffOptions ?? []).filter(option => option.monthlyExtra > 0).map(option => <article key={option.years}>
            <div><h4>{option.years} {option.years === 1 ? 'year' : 'years'}</h4><span>{option.payoffDate}</span></div>
            <div><strong>+{money(option.monthlyExtra)}<small>/mo</small></strong><span>Save {money(option.interestSaved)} in interest</span><span>{money(option.totalExtraPaid)} total extra principal</span></div>
            <Button size="sm" variant="secondary" disabled={disabled} onClick={() => onApplyPayoff(option)} aria-label={`Apply ${option.years} year payoff plan`}>Apply <ArrowUpRight className="w-4 h-4 ml-1" aria-hidden="true" /></Button>
          </article>)}</div>
          {!r.payoffOptions?.some(option => option.monthlyExtra > 0) && <p className="mortgage-note">This loan is too short for a whole-year target. Use a monthly or one-time extra payment to explore earlier payoff.</p>}
          <details className="mortgage-details"><summary>Compare annual lump-sum alternatives</summary><p className="mortgage-note">Annual extras are paid at months 12, 24, and so on, instead of monthly extras. Savings above apply only to the monthly plan.</p><dl className="mortgage-cost-list">{(r.payoffOptions ?? []).filter(option => option.yearlyExtra > 0).map(option => <div key={option.years}><dt>Finish in {option.years} years</dt><dd>{money(option.yearlyExtra)} / year</dd></div>)}</dl></details>
        </section>
      </div>}

      {view === 'schedule' && <section className="mortgage-panel mortgage-schedule">
        <div className="mortgage-section-heading"><h3>Follow every payment</h3><span>{r.payoffPeriod} months</span></div>
        <SegmentedControl options={[{ value: 'annual', label: 'By loan year' }, { value: 'monthly', label: 'By month' }]} value={annual ? 'annual' : 'monthly'} onChange={value => setAnnual(value === 'annual')} />
        <p className="mortgage-note">Total paid = principal + extra principal + interest. Taxes and ownership costs are separate. Loan years start with your first payment.</p>
        <DataTable key={annual ? 'annual' : 'monthly'} table={schedule} scrollable />
        <div className="mortgage-schedule-footer"><span>Final month’s loan payments</span><strong>{money(Number(monthlySchedule.rows.at(-1)?.payment ?? 0))}</strong><span>Remaining balance</span><strong>{money(r.remainingBalance ?? 0)}</strong></div>
        <p className="mortgage-note">Export CSV for the complete cash-flow event schedule, including individual extra payments.</p>
      </section>}
    </div>

    <details className="mortgage-details mortgage-assumptions"><summary>What this estimate includes</summary>
      <ul>
        <li>Monthly payments at a constant rate. {input.country === 'CA' ? 'Canadian quotes use semi-annual compounding. The amortization is the full repayment period, not your mortgage contract term; renewals are not modeled.' : 'The US note rate is divided by 12. This is not an APR including loan fees.'}</li>
        <li>Taxes, insurance and other costs stay constant if enabled. Maintenance and utilities are included only if entered as other ownership costs. The down payment, closing costs and costs after payoff are excluded from housing totals.</li>
        <li>Mortgage insurance is a manual monthly estimate. Automatic cancellation, upfront or financed insurance premiums and qualification rules are not calculated.</li>
        <li>Extra payments reduce principal; lender limits and penalties are not modeled. Home-price appreciation is not assumed.</li>
      </ul>
      <a href={input.country === 'CA' ? 'https://www.canada.ca/en/financial-consumer-agency/services/mortgages/mortgage-terms-amortization.html' : 'https://www.consumerfinance.gov/ask-cfpb/on-a-mortgage-whats-the-difference-between-my-principal-and-interest-payment-and-my-total-monthly-payment-en-1941/'} target="_blank" rel="noreferrer">{input.country === 'CA' ? 'Understand mortgage terms and amortization · FCAC' : 'Understand your mortgage payment · CFPB'} <span aria-hidden="true">↗</span></a>
    </details>
  </div>
}
