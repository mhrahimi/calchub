import { useMemo, useState } from 'react'
import { ArrowUpRight, CalendarDays, TrendingDown } from 'lucide-react'
import { ChartPanel } from '@/components/calculator/ChartPanel'
import { DataTable } from '@/components/calculator/DataTable'
import { Assumptions, CostBreakdown, HeroResult, KeyMetrics, Note, Panel, ResultViews } from '@/components/calculator/sections'
import { useSnapshotCurrency } from '@/components/calculator/SnapshotFormat'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Button } from '@/components/ui/Button'
import { FormattedAmount } from '@/components/ui/FormattedAmount'
import { durationLabel, monthlyExtra, mortgageScheduleTable, rateScenarios } from '@/calculators/finance/mortgage/insights'
import type { MortgageInput, MortgageResult, PayoffOption } from '@/calculators/finance/mortgage/types'
import type { ChartData } from '@/calculators/types'
import { seriesColor } from '@/utils/chartPresentation'

type View = 'overview' | 'payoff' | 'schedule'

const ownershipColors: Record<string, string> = {
  'Property tax': '#B45E2B', 'Home insurance': '#7553A6', 'HOA / strata': '#55738D',
  PMI: '#9E456B', Other: '#60752D', 'Extra principal': '#406E96',
}
const costColor = (label: string) => ownershipColors[label] ?? seriesColor(label)

function monthLabel(value: string | null | undefined) {
  if (!value) return 'Not recorded'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

function Amount({ value }: { value: number }) {
  const money = useSnapshotCurrency()
  return <FormattedAmount value={money(value)} />
}

export function MortgageResults({ result: r, input, charts, disabled, onApplyPayoff }: {
  result: MortgageResult
  input: MortgageInput
  charts?: ChartData[]
  disabled?: boolean
  onApplyPayoff: (option: PayoffOption) => void
}) {
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
  const firstMonthExtra = r.schedule.filter(row => row.period === 1).reduce((sum, row) => sum + (row.extraPrincipal ?? 0), 0)
  const monthlySlices = useMemo(() => {
    const slices = r.monthlyBreakdown.filter(slice => slice.label !== 'Extra principal').map(slice => ({ ...slice }))
    if (firstMonthExtra > 0) slices.push({ label: 'Extra principal', amount: firstMonthExtra, percent: 0 })
    const total = slices.reduce((sum, slice) => sum + slice.amount, 0)
    return slices.map(slice => ({ ...slice, percent: total > 0 ? slice.amount / total * 100 : 0 }))
  }, [r.monthlyBreakdown, firstMonthExtra])

  return <div className="calc-results">
    <HeroResult
      eyebrow="YOUR PAYMENT ESTIMATE"
      eyebrowRight="monthly"
      title={input.includeTaxesAndCosts ? 'Monthly housing estimate' : 'Monthly principal & interest'}
      amount={<Amount value={r.totalMonthlyHousing} />}
      unit="/mo"
      caption={input.includeTaxesAndCosts ? undefined : <p className="calc-hero-caption">Taxes, insurance and other ownership costs are not included.</p>}
    >
      {input.includeTaxesAndCosts && <dl className="calc-hero-components">
        <div><dt>Loan payment</dt><dd><Amount value={r.principalAndInterest} /></dd></div>
        <div><dt>Taxes, insurance & fees</dt><dd><Amount value={housingExtras} /></dd></div>
      </dl>}
      {extra > 0 && <p className="calc-budget-note">With your planned monthly extra: <strong><Amount value={r.totalMonthlyHousing + extra} />/mo</strong>. Annual and one-time extras are separate; the final payment is capped at the balance due.</p>}
    </HeroResult>

    <KeyMetrics items={[
      { icon: <CalendarDays aria-hidden="true" />, label: 'Estimated payoff', value: monthLabel(r.payoffDate), note: `${durationLabel(r.payoffPeriod)} of payments` },
      { icon: <TrendingDown aria-hidden="true" />, label: 'Interest over the loan', value: <Amount value={r.totalInterest} />, note: r.loanAmount > 0 ? `${(r.totalInterest / r.loanAmount * 100).toFixed(1)}% of the amount borrowed` : 'Based on this scenario' },
    ]} />

    <ResultViews
      label="Mortgage result views"
      value={view}
      onChange={setView}
      views={[{ value: 'overview', label: 'Budget & cost' }, { value: 'payoff', label: 'Pay off sooner' }, { value: 'schedule', label: 'Schedule' }]}
    >
      {view === 'overview' && <div className="calc-view-content">
        <div>
          <SegmentedControl options={[{ value: 'monthly', label: 'First month' }, { value: 'lifetime', label: 'Over the loan' }]} value={costView} onChange={setCostView} />
          <CostBreakdown slices={costView === 'monthly' ? monthlySlices : r.lifetimeBreakdown}
            showTotal={costView === 'lifetime' || Math.abs(monthlySlices.reduce((sum, slice) => sum + slice.amount, 0) - r.totalMonthlyHousing) >= 0.005}
            title={costView === 'monthly' ? 'Where your first payment goes' : 'Housing costs during the loan'}
            colorFor={costColor}
            note={costView === 'monthly' ? 'Includes extra principal actually paid in the first month. The principal / interest split changes with each payment.' : 'Includes loan payments and selected ownership costs until payoff. Excludes your down payment, closing costs and costs after payoff.'} />
        </div>
        <Panel title="Your path to owning it outright" className="calc-chart-panel">
          <SegmentedControl options={[{ value: 'balance', label: 'Loan balance' }, { value: 'payments', label: 'Principal & interest' }]} value={chartView} onChange={setChartView} />
          {activeChart && <ChartPanel data={activeChart} />}
          <div className="calc-first-year"><h4>Your first {Math.min(12, r.payoffPeriod)} {r.payoffPeriod === 1 ? 'month' : 'months'}</h4><dl>
            <div><dt>Principal repaid</dt><dd><Amount value={firstYearPrincipal} /></dd></div>
            <div><dt>Interest paid</dt><dd><Amount value={firstYearInterest} /></dd></div>
          </dl></div>
        </Panel>
        <Panel title="What if the rate changes?">
          <Note>Compare starting rates on the same loan amount and amortization. These are hypothetical scenarios, not current offers or renewal forecasts.</Note>
          <div className="calc-rate-comparison"><table aria-label="Monthly principal and interest at different rates">
            <thead><tr><th scope="col">Rate</th><th scope="col">Monthly P&I</th><th scope="col">Change / mo</th></tr></thead>
            <tbody>{scenarios.map(scenario => <tr key={scenario.rate} className={scenario.rate === input.interestRate ? 'is-current' : ''}>
              <th scope="row">{scenario.rate.toFixed(2)}%{scenario.rate === input.interestRate && <small>Your rate</small>}</th>
              <td><Amount value={scenario.payment} /></td>
              <td className="calc-rate-change">{scenario.rate === input.interestRate ? <span aria-label="No change">—</span> : <>{scenario.payment >= r.principalAndInterest ? '+' : '−'}<Amount value={Math.abs(scenario.payment - r.principalAndInterest)} /></>}</td>
            </tr>)}</tbody>
          </table></div>
        </Panel>
      </div>}

      {view === 'payoff' && <div className="calc-view-content">
        <section className="calc-savings-panel">
          <h3>{(r.interestSaved ?? 0) > 0 ? 'Your extra payments make a difference' : 'See what an extra payment can do'}</h3>
          {(r.interestSaved ?? 0) > 0 ? <dl className="calc-savings-grid"><div><dt>Interest saved</dt><dd><Amount value={r.interestSaved!} /></dd></div><div><dt>Time saved</dt><dd>{durationLabel(r.periodsSaved ?? 0)}</dd></div></dl> : <p>Choose a shorter payoff below, or add a monthly, annual or one-time payment in your inputs.</p>}
          <p className="calc-note">Savings compare with the same loan without extra payments. Check your lender’s prepayment limits; penalties are not included.</p>
        </section>
        <Panel title="Choose a payoff target">
          <Note>Each option is a separate plan starting with your original loan. Applying one replaces all current extras with the monthly amount shown.</Note>
          <div className="calc-payoff-options">{(r.payoffOptions ?? []).filter(option => option.monthlyExtra > 0).map(option => <article key={option.years}>
            <div><h4>{option.years} {option.years === 1 ? 'year' : 'years'}</h4><span>{option.payoffDate}</span></div>
            <div><strong>+<Amount value={option.monthlyExtra} /><small>/mo</small></strong><span>Save <Amount value={option.interestSaved} /> in interest</span><span><Amount value={option.totalExtraPaid} /> total extra principal</span></div>
            <Button size="sm" variant="secondary" disabled={disabled} onClick={() => onApplyPayoff(option)} aria-label={`Apply ${option.years} year payoff plan`}>Apply <ArrowUpRight className="w-4 h-4 ml-1" aria-hidden="true" /></Button>
          </article>)}</div>
          {!r.payoffOptions?.some(option => option.monthlyExtra > 0) && <Note>This loan is too short for a whole-year target. Use a monthly or one-time extra payment to explore earlier payoff.</Note>}
          <details className="calc-details"><summary>Compare annual lump-sum alternatives</summary><p className="calc-note">Annual extras are paid at months 12, 24, and so on, instead of monthly extras. Savings above apply only to the monthly plan.</p><dl className="calc-cost-list calc-annual-alternatives">{(r.payoffOptions ?? []).filter(option => option.yearlyExtra > 0).map(option => <div key={option.years}><dt>Finish in {option.years} years</dt><dd><Amount value={option.yearlyExtra} /> / year</dd></div>)}</dl></details>
        </Panel>
      </div>}

      {view === 'schedule' && <Panel title="Follow every payment" aside={`${r.payoffPeriod} months`} className="calc-schedule">
        <SegmentedControl options={[{ value: 'annual', label: 'By loan year' }, { value: 'monthly', label: 'By month' }]} value={annual ? 'annual' : 'monthly'} onChange={value => setAnnual(value === 'annual')} />
        <Note>Total paid = principal + extra principal + interest. Taxes and ownership costs are separate. Loan years start with your first payment.</Note>
        <DataTable key={annual ? 'annual' : 'monthly'} table={schedule} scrollable softenDecimals />
        <div className="calc-schedule-footer"><span>Final month’s loan payments</span><strong><Amount value={Number(monthlySchedule.rows.at(-1)?.payment ?? 0)} /></strong><span>Remaining balance</span><strong><Amount value={r.remainingBalance ?? 0} /></strong></div>
        <Note>Export CSV for the complete cash-flow event schedule, including individual extra payments.</Note>
      </Panel>}
    </ResultViews>

    <Assumptions items={[
      <>Monthly payments at a constant rate. {input.country === 'CA' ? 'Canadian quotes use semi-annual compounding. The amortization is the full repayment period, not your mortgage contract term; renewals are not modeled.' : 'The US note rate is divided by 12. This is not an APR including loan fees.'}</>,
      <>Taxes, insurance and other costs stay constant if enabled. Maintenance and utilities are included only if entered as other ownership costs. The down payment, closing costs and costs after payoff are excluded from housing totals.</>,
      <>Mortgage insurance is a manual monthly estimate. Automatic cancellation, upfront or financed insurance premiums and qualification rules are not calculated.</>,
      <>Extra payments reduce principal; lender limits and penalties are not modeled. Home-price appreciation is not assumed.</>,
    ]} source={{
      href: input.country === 'CA' ? 'https://www.canada.ca/en/financial-consumer-agency/services/mortgages/mortgage-terms-amortization.html' : 'https://www.consumerfinance.gov/ask-cfpb/on-a-mortgage-whats-the-difference-between-my-principal-and-interest-payment-and-my-total-monthly-payment-en-1941/',
      label: input.country === 'CA' ? 'Understand mortgage terms and amortization · FCAC' : 'Understand your mortgage payment · CFPB',
    }} />
  </div>
}
