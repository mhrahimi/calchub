import { periodsPerYear } from '@/utils/annuity'
import type { CompoundInterestInput, CompoundInterestResult } from './types'
import type { CalculationExplanation, ChartData, TableData } from '@/calculators/types'

export function calculateCompoundInterest(input: CompoundInterestInput): CompoundInterestResult {
  const m = periodsPerYear(input.compoundingFrequency)
  const contribPpy = periodsPerYear(input.contributionFrequency)
  const years = input.durationUnit === 'years' ? input.duration : input.duration / 12
  const totalPeriods = Math.round(years * m)
  const r = input.interestRate / 100 / m
  const contribPerPeriod = (input.contribution * contribPpy) / m

  let balance = input.principal
  let totalContributions = input.principal
  const schedule: CompoundInterestResult['schedule'] = []

  if (input.continuous) {
    const R = input.interestRate / 100
    const steps = Math.max(1, Math.round(years * contribPpy))
    const dt = years / steps
    const growth = Math.exp(R * dt)
    const contrib = input.contribution
    for (let p = 1; p <= steps; p++) {
      if (input.contributionTiming === 'begin' && contrib > 0) {
        balance += contrib
        totalContributions += contrib
      }
      balance *= growth
      if (input.contributionTiming === 'end' && contrib > 0) {
        balance += contrib
        totalContributions += contrib
      }
      const yearMark = Math.ceil(p / contribPpy)
      if (p % Math.max(1, contribPpy) === 0 || p === steps) {
        schedule.push({
          period: yearMark,
          balance: Math.round(balance * 100) / 100,
          contributions: totalContributions,
          interest: Math.round((balance - totalContributions) * 100) / 100,
        })
      }
    }
  } else {
    for (let p = 1; p <= totalPeriods; p++) {
      if (input.contributionTiming === 'begin' && contribPerPeriod > 0) {
        balance += contribPerPeriod
        totalContributions += contribPerPeriod
      }
      const interest = balance * r
      balance += interest
      if (input.contributionTiming === 'end' && contribPerPeriod > 0) {
        balance += contribPerPeriod
        totalContributions += contribPerPeriod
      }
      if (p % Math.max(1, Math.floor(m)) === 0 || p === totalPeriods) {
        schedule.push({
          period: Math.ceil(p / m),
          balance: Math.round(balance * 100) / 100,
          contributions: totalContributions,
          interest: Math.round((balance - totalContributions) * 100) / 100,
        })
      }
    }
  }

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
  return {
    title: 'Compound interest',
    steps: [
      {
        label: input.continuous ? 'Continuous compounding' : 'Periodic compounding',
        expression: input.continuous
          ? input.contribution > 0
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
