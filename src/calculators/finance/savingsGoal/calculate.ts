import { CalculationError } from '@/utils/rootSolve'
import { fvEnd, pmtFromFv, periodsFromFv, periodsPerYear } from '@/utils/annuity'
import { downsamplePoints } from '@/utils/chartSample'
import type { SavingsGoalInput, SavingsGoalResult } from './types'
import type { CalculationExplanation, ChartData, TableData } from '@/calculators/types'

export function calculateSavingsGoal(input: SavingsGoalInput): SavingsGoalResult {
  const ppy = periodsPerYear(input.contributionFrequency)
  const years = input.periodUnit === 'years' ? input.period : input.period / 12
  if (!Number.isFinite(years) || years < 0 || years > 1000 || (input.solveFor !== 'time' && years === 0)) throw new CalculationError('invalid_domain', 'Horizon must be positive and at most 1,000 years.')
  const nGiven = Math.round(years * ppy)
  const r = input.returnRate / 100 / ppy
  const pmtGiven = input.periodicContribution ?? 0

  let requiredContribution = 0
  let timeToGoal = years
  let projectedBalance = 0
  let n = nGiven
  let pmt = pmtGiven

  if (input.solveFor === 'contribution') {
    requiredContribution = pmtFromFv(input.currentSavings, r, n, input.goalAmount)
    pmt = requiredContribution
    projectedBalance = fvEnd(input.currentSavings, r, n, pmt)
    timeToGoal = years
  } else if (input.solveFor === 'time') {
    requiredContribution = pmtGiven
    pmt = pmtGiven
    const periods = input.currentSavings >= input.goalAmount ? 0 : periodsFromFv(input.currentSavings, r, pmt, input.goalAmount)
    if (periods === null || !Number.isFinite(periods) || periods < 0) {
      throw new CalculationError('unreachable', 'Goal cannot be reached with these savings, contributions and return.')
    } else {
      if (periods > 1000 * ppy) throw new CalculationError('unreachable', 'Goal exceeds the supported 1,000-year horizon.')
      n = Math.ceil(periods - 1e-10)
      while (fvEnd(input.currentSavings, r, n, pmt) < input.goalAmount - 1e-8) n++
      timeToGoal = n / ppy
      projectedBalance = fvEnd(input.currentSavings, r, n, pmt)
    }
  } else {
    requiredContribution = pmtGiven
    pmt = pmtGiven
    projectedBalance = fvEnd(input.currentSavings, r, n, pmt)
    timeToGoal = years
  }

  const full: SavingsGoalResult['schedule'] = []
  let bal = input.currentSavings
  full.push({ period: 0, balance: Math.round(bal * 100) / 100 })
  const steps = Math.max(n, 0)
  for (let p = 1; p <= steps; p++) {
    bal = fvEnd(bal, r, 1, pmt)
    full.push({ period: p / ppy, balance: Math.round(bal * 100) / 100 })
  }
  const schedule = full

  return {
    requiredContribution: Math.round(requiredContribution * 100) / 100,
    timeToGoal,
    periodsToGoal: n,
    periodsPerYear: ppy,
    projectedBalance: Math.round(projectedBalance * 100) / 100,
    totalContributions: Math.round((input.currentSavings + pmt * n) * 100) / 100,
    goalAmount: input.goalAmount,
    schedule,
  }
}

export function explainSavingsGoal(input: SavingsGoalInput, _result: SavingsGoalResult): CalculationExplanation {
  const timingNote =
    'FV = PV(1+r)^n + PMT × ((1+r)^n − 1) / r  (end-of-period contributions)'
  const steps: CalculationExplanation['steps'] =
    input.solveFor === 'contribution'
      ? [
          { label: 'Solve for contribution', expression: 'Invert the FV formula for PMT given the goal and horizon' },
          { label: 'Future value', expression: timingNote },
        ]
      : input.solveFor === 'time'
        ? [
            { label: 'Solve for time', expression: 'n = ln((Goal + PMT/r) / (PV + PMT/r)) / ln(1+r)' },
            { label: 'Future value', expression: timingNote },
          ]
        : [
            { label: 'Projected balance', expression: timingNote },
          ]
  return {
    title: 'Savings goal',
    steps,
    assumptions: ['Return is treated as constant; inflation and taxes are not modeled.', 'Time to goal is the first whole contribution period reaching the target. Contributions arrive at the end of each period.'],
  }
}

export function buildSavingsGoalCharts(result: SavingsGoalResult): ChartData[] {
  return [{
    type: 'line',
    title: 'Goal progress',
    valueFormat: 'currency',
    series: [
      { name: 'Balance', data: downsamplePoints(result.schedule, 241).map((s) => ({ x: s.period, y: s.balance })), color: '#163B8C' },
      {
        name: 'Goal',
        data: downsamplePoints(result.schedule, 241).map((s) => ({ x: s.period, y: result.goalAmount })),
        color: '#8A94A6',
      },
    ],
  }]
}

export function buildSavingsGoalTable(result: SavingsGoalResult): TableData {
  return {
    title: 'Complete contribution schedule',
    columns: [
      { key: 'period', label: 'Year', align: 'right', format: 'number' },
      { key: 'balance', label: 'Balance', align: 'right', format: 'currency' },
    ],
    rows: result.schedule.map((s) => ({ ...s })),
  }
}
