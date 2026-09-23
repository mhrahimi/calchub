import { calendarDate, dateText, eventDate, periodCoordinate } from '@/utils/cashFlowDates'
import { periodsPerYear } from '@/utils/annuity'
import type { CompoundInterestInput, CompoundInterestResult } from './types'
import type { CalculationExplanation, ChartData, TableData } from '@/calculators/types'

export function calculateCompoundInterest(input: CompoundInterestInput): CompoundInterestResult {
  const continuous = input.continuous || input.compoundingFrequency === 'continuous'
  const m = periodsPerYear(input.compoundingFrequency)
  const years = input.durationUnit === 'years' ? input.duration : input.duration / 12
  if (!Number.isFinite(years) || years < 0 || years > 500 || !Number.isFinite(input.interestRate) || 1 + input.interestRate / 100 / m <= 0) throw new Error('Invalid duration or rate')
  const start = calendarDate(input.startDate ?? '2026-01-01')
  const wholeMonths = Math.floor(years * 12)
  const monthEnd = eventDate(start, wholeMonths, 'monthly')
  const next = eventDate(start, wholeMonths + 1, 'monthly')
  const end = new Date(monthEnd.getTime() + (years * 12 - wholeMonths) * (next.getTime() - monthEnd.getTime()))
  let balance = input.principal, totalContributions = input.principal
  const schedule: CompoundInterestResult['schedule'] = []
  const dates: Array<{date: Date; contribution: number}> = []
  for (let i = input.contributionTiming === 'begin' ? 0 : 1; ; i++) {
    const date = eventDate(start, i, input.contributionFrequency)
    if (date > end || (input.contributionTiming === 'begin' && date >= end)) break
    dates.push({ date, contribution: input.contribution })
    if (i > 200000) throw new Error('Too many contribution events')
  }
  dates.push({date: end, contribution: 0})
  let previous = start
  for (const e of dates) {
    const elapsed = continuous
      ? periodCoordinate(e.date, start, 'annual') - periodCoordinate(previous, start, 'annual')
      : periodCoordinate(e.date, start, input.compoundingFrequency) - periodCoordinate(previous, start, input.compoundingFrequency)
    balance *= continuous ? Math.exp(input.interestRate / 100 * elapsed) : Math.pow(1 + input.interestRate / 100 / m, elapsed)
    balance += e.contribution
    totalContributions += e.contribution
    previous = e.date
    schedule.push({period: periodCoordinate(e.date, start, 'annual'), date: dateText(e.date), balance: Math.round(balance * 100) / 100, contributions: totalContributions, interest: Math.round((balance - totalContributions) * 100) / 100})
  }
  if (!Number.isFinite(balance)) throw new Error('Projection exceeds numeric range')

  const finalBalance = Math.round(balance * 100) / 100
  const interestEarned = finalBalance - totalContributions
  const realValue = input.adjustForInflation
    ? finalBalance / Math.pow(1 + input.inflationRate / 100, years)
    : finalBalance

  return {
    finalBalance,
    realValue: Math.round(realValue * 100) / 100,
    totalContributions,
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
    assumptions: ['Contributions post on actual UTC calendar dates; no contribution prorating.', 'Missing start date defaults to 2026-01-01. Semimonthly dates are the 1st and 16th.', 'Fractional compounding periods use equivalent exponential accrual between calendar anniversaries.'],
    steps: [
      {
        label: continuous ? 'Continuous compounding' : 'Periodic compounding',
        expression: continuous
          ? input.contribution !== 0
            ? 'Between contributions, B grows by e^(R Δt); contributions applied at the selected timing'
            : 'A = P × e^(R×t)'
          : `A = P × (1 + R/m)^(m×t) plus contributions (${input.contributionTiming} of period)`,
      },
      { label: 'Final balance', result: `$${result.finalBalance.toFixed(2)}` },
      ...(input.adjustForInflation
        ? [{ label: 'Inflation-adjusted value', result: `$${result.realValue.toFixed(2)}` }]
        : []),
    ],
  }
}

export function buildCompoundInterestCharts(result: CompoundInterestResult): ChartData[] {
  return [
    {
      type: 'line',
      title: 'Balance growth',
      valueFormat: 'currency',
      series: [{ name: 'Balance', data: result.schedule.map((s) => ({ x: s.period, y: s.balance })), color: '#163B8C' }],
    },
    {
      type: 'area',
      title: 'Contributions vs interest',
      stacked: true,
      valueFormat: 'currency',
      series: [
        { name: 'Contributions', data: result.schedule.map((s) => ({ x: s.period, y: s.contributions })), color: '#4A7FD4' },
        { name: 'Interest', data: result.schedule.map((s) => ({ x: s.period, y: s.interest })), color: '#163B8C' },
      ],
    },
  ]
}

export function buildCompoundInterestTable(result: CompoundInterestResult): TableData {
  return {
    title: 'Growth schedule',
    columns: [
      { key: 'period', label: 'Year', align: 'right' },
      { key: 'balance', label: 'Balance', align: 'right', format: 'currency' },
      { key: 'contributions', label: 'Contributions', align: 'right', format: 'currency' },
      { key: 'interest', label: 'Interest', align: 'right', format: 'currency' },
    ],
    rows: result.schedule.map((s) => ({ ...s })),
  }
}
