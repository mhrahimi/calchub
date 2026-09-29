import { calendarDate, dateText, eventDate, periodCoordinate } from '@/utils/cashFlowDates'
import { periodsPerYear } from '@/utils/annuity'
import { validateCompoundInterest } from './validation'
import { CalculationError } from '@/utils/rootSolve'
import { applyGrowthCashFlow, checkedAmount, effectiveAnnualPercent, growthMoney, MAX_GROWTH_EVENTS } from '@/utils/growthProjection'
import type { CompoundInterestInput, CompoundInterestResult } from './types'
import type { CalculationExplanation, ChartData, TableData } from '@/calculators/types'

export function calculateCompoundInterest(input: CompoundInterestInput): CompoundInterestResult {
  const validation = validateCompoundInterest(input)
  if (!validation.valid) throw new CalculationError('invalid_domain', Object.values(validation.errors).join('. '))
  const continuous = input.continuous || input.compoundingFrequency === 'continuous'
  const m = periodsPerYear(input.compoundingFrequency)
  const years = input.durationUnit === 'years' ? input.duration : input.duration / 12
  const effectiveAnnualRate = effectiveAnnualPercent(input.interestRate, m, continuous)
  const start = calendarDate(input.startDate ?? '2026-01-01')
  const wholeMonths = Math.floor(years * 12)
  const monthEnd = eventDate(start, wholeMonths, 'monthly')
  const next = eventDate(start, wholeMonths + 1, 'monthly')
  const end = new Date(monthEnd.getTime() + (years * 12 - wholeMonths) * (next.getTime() - monthEnd.getTime()))
  let balance = input.principal, totalContributions = input.principal
  let depletionDate: string | undefined
  let unmetWithdrawals = 0
  const schedule: CompoundInterestResult['schedule'] = []
  const dates: Array<{date: Date; contribution: number}> = []
  for (let i = input.contributionTiming === 'begin' ? 0 : 1; ; i++) {
    const date = eventDate(start, i, input.contributionFrequency)
    if (date > end || (input.contributionTiming === 'begin' && date >= end)) break
    dates.push({ date, contribution: input.contribution })
    if (i > MAX_GROWTH_EVENTS) throw new Error('Too many contribution events')
  }
  dates.push({date: end, contribution: 0})
  let previous = start
  for (const e of dates) {
    const elapsed = continuous
      ? periodCoordinate(e.date, start, 'annual') - periodCoordinate(previous, start, 'annual')
      : periodCoordinate(e.date, start, input.compoundingFrequency) - periodCoordinate(previous, start, input.compoundingFrequency)
    balance *= continuous ? Math.exp(input.interestRate / 100 * elapsed) : Math.pow(1 + input.interestRate / 100 / m, elapsed)
    checkedAmount(balance)
    const flow = applyGrowthCashFlow(balance, e.contribution)
    balance = flow.balance
    totalContributions = checkedAmount(totalContributions + flow.actual)
    unmetWithdrawals = checkedAmount(unmetWithdrawals + flow.unmet)
    if (e.contribution < 0 && balance === 0 && depletionDate === undefined) depletionDate = dateText(e.date)
    previous = e.date
    schedule.push({period: periodCoordinate(e.date, start, 'annual'), date: dateText(e.date), balance: growthMoney(balance), contributions: growthMoney(totalContributions), interest: growthMoney(balance - totalContributions), unmetWithdrawals: growthMoney(unmetWithdrawals)})
  }
  if (!Number.isFinite(balance)) throw new Error('Projection exceeds numeric range')

  const finalBalance = growthMoney(balance)
  const interestEarned = growthMoney(balance - totalContributions)
  const realValue = input.adjustForInflation
    ? finalBalance / Math.pow(1 + input.inflationRate / 100, years)
    : finalBalance

  return {
    status: depletionDate === undefined ? 'success' : 'depleted',
    warnings: depletionDate === undefined ? [] : [`Funds are depleted on ${depletionDate}. Withdrawals are capped at available funds; unmet withdrawals are reported separately. No borrowing is assumed.`],
    rateConvention: 'nominal-annual', effectiveAnnualRate, depletionDate,
    unmetWithdrawals: growthMoney(unmetWithdrawals),
    finalBalance,
    realValue: growthMoney(realValue),
    totalContributions: growthMoney(totalContributions),
    interestEarned,
    schedule,
  }
}

export function explainCompoundInterest(
  input: CompoundInterestInput,
  result: CompoundInterestResult,
): CalculationExplanation {
  const continuous = input.continuous || input.compoundingFrequency === 'continuous'
  return {
    title: 'Compound interest',
    assumptions: [`The rate is nominal annual with ${continuous ? 'continuous' : input.compoundingFrequency} compounding.`, 'Withdrawals are capped at available funds; unmet withdrawals do not become debt. Contributions are actual net cash flows including starting principal.', 'Contributions post on actual UTC calendar dates; no contribution prorating.', ...(input.compoundingFrequency === 'daily' && !continuous ? ['The effective annual rate is quoted over 365 days. Daily accrual uses a 365-day denominator and includes actual leap days.'] : []), 'Missing start date defaults to 2026-01-01. Semimonthly dates are the 1st and 16th.', 'Fractional compounding periods use equivalent exponential accrual between calendar anniversaries.'],
    steps: [
      {
        label: continuous ? 'Continuous compounding' : 'Periodic compounding',
        expression: continuous
          ? input.contribution !== 0
            ? 'Between contributions, B grows by e^(R Δt); contributions applied at the selected timing'
            : 'A = P × e^(R×t)'
          : `A = P × (1 + R/m)^(m×t) plus contributions (${input.contributionTiming} of period)`,
      },
      ...(result.effectiveAnnualRate === undefined ? [] : [{ label: 'Effective annual rate', result: `${result.effectiveAnnualRate.toFixed(4)}%` }]),
      { label: 'Final balance', result: `$${result.finalBalance.toFixed(2)}` },
      ...(input.adjustForInflation
        ? [{ label: 'Inflation-adjusted value', result: `$${result.realValue.toFixed(2)}` }]
        : []),
    ],
  }
}

export function buildCompoundInterestCharts(result: CompoundInterestResult): ChartData[] {
  const firstCapital = result.schedule[0]?.contributions
  const usedWithdrawals =
    result.depletionDate !== undefined ||
    result.unmetWithdrawals > 0 ||
    result.schedule.some((s, i) => i > 0 && firstCapital !== undefined && s.contributions < firstCapital)
  const capitalLabel = usedWithdrawals ? 'Net capital' : 'Contributions'
  return [
    {
      type: 'line',
      title: 'Balance growth',
      valueFormat: 'currency',
      series: [{ name: 'Balance', data: result.schedule.map((s) => ({ x: s.period, y: s.balance })), color: '#163B8C' }],
    },
    {
      type: 'area',
      title: usedWithdrawals ? 'Net capital vs interest' : 'Contributions vs interest',
      stacked: true,
      valueFormat: 'currency',
      series: [
        { name: capitalLabel, data: result.schedule.map((s) => ({ x: s.period, y: s.contributions })), color: '#4A7FD4' },
        { name: 'Interest', data: result.schedule.map((s) => ({ x: s.period, y: s.interest })), color: '#163B8C' },
      ],
    },
  ]
}

export function buildCompoundInterestTable(result: CompoundInterestResult): TableData {
  const firstCapital = result.schedule[0]?.contributions
  const usedWithdrawals =
    result.depletionDate !== undefined ||
    result.unmetWithdrawals > 0 ||
    result.schedule.some((s, i) => i > 0 && firstCapital !== undefined && s.contributions < firstCapital)
  return {
    title: 'Growth schedule',
    columns: [
      { key: 'period', label: 'Year', align: 'right' },
      { key: 'balance', label: 'Balance', align: 'right', format: 'currency' },
      { key: 'contributions', label: usedWithdrawals ? 'Net capital' : 'Contributions', align: 'right', format: 'currency' },
      { key: 'interest', label: 'Interest', align: 'right', format: 'currency' },
      ...(result.depletionDate ? [{ key: 'unmetWithdrawals', label: 'Unmet withdrawals (cumulative)', align: 'right' as const, format: 'currency' as const }] : []),
    ],
    rows: result.schedule.map((s) => ({ ...s })),
  }
}
