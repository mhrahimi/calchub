import { CalculationError } from '@/utils/rootSolve'
import { fvEnd, pmtFromFv, periodsFromFv, periodsPerYear } from '@/utils/annuity'
import { applyGrowthCashFlow, checkedAmount } from '@/utils/growthProjection'
import { downsamplePoints } from '@/utils/chartSample'
import type { SavingsGoalInput, SavingsGoalResult } from './types'
import type { CalculationExplanation, ChartData, TableData } from '@/calculators/types'

/** Grow one period then apply contribution/withdrawal with a no-borrowing floor. */
function stepBalance(balance: number, r: number, pmt: number) {
  const grown = r === 0 ? balance : balance * (1 + r)
  return applyGrowthCashFlow(grown, pmt)
}

function projectSchedule(start: number, r: number, n: number, pmt: number, ppy: number) {
  const full: SavingsGoalResult['schedule'] = []
  let bal = start
  let unmetWithdrawals = 0
  full.push({ period: 0, balance: Math.round(bal * 100) / 100, unmetWithdrawals: 0 })
  const steps = Math.max(n, 0)
  let actualContributions = 0
  for (let p = 1; p <= steps; p++) {
    const flow = stepBalance(bal, r, pmt)
    bal = flow.balance
    actualContributions = checkedAmount(actualContributions + flow.actual)
    unmetWithdrawals = checkedAmount(unmetWithdrawals + flow.unmet)
    full.push({
      period: p / ppy,
      balance: Math.round(bal * 100) / 100,
      unmetWithdrawals: Math.round(unmetWithdrawals * 100) / 100,
    })
  }
  return {
    schedule: full,
    projectedBalance: Math.round(bal * 100) / 100,
    unmetWithdrawals: Math.round(unmetWithdrawals * 100) / 100,
    totalContributions: Math.round((start + actualContributions) * 100) / 100,
  }
}

export function calculateSavingsGoal(input: SavingsGoalInput): SavingsGoalResult {
  const ppy = periodsPerYear(input.contributionFrequency)
  const years = input.periodUnit === 'years' ? input.period : input.period / 12
  if (!Number.isFinite(years) || years < 0 || years > 1000 || (input.solveFor !== 'time' && years === 0)) throw new CalculationError('invalid_domain', 'Horizon must be positive and at most 1,000 years.')
  const nGiven = Math.round(years * ppy)
  const r = input.returnRate / 100 / ppy
  const pmtGiven = input.periodicContribution ?? 0

  let requiredContribution = 0
  let timeToGoal = years
  let n = nGiven
  let pmt = pmtGiven

  if (input.solveFor === 'contribution') {
    requiredContribution = pmtFromFv(input.currentSavings, r, n, input.goalAmount)
    pmt = requiredContribution
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
    }
  } else {
    requiredContribution = pmtGiven
    pmt = pmtGiven
    timeToGoal = years
  }

  const projected = projectSchedule(input.currentSavings, r, n, pmt, ppy)
  const warnings =
    projected.unmetWithdrawals > 0
      ? [
          'Withdrawals are capped at available funds; unmet withdrawals are reported separately. No borrowing is assumed.',
        ]
      : []

  return {
    requiredContribution: Math.round(requiredContribution * 100) / 100,
    timeToGoal,
    periodsToGoal: n,
    periodsPerYear: ppy,
    projectedBalance: projected.projectedBalance,
    totalContributions: projected.totalContributions,
    goalAmount: input.goalAmount,
    unmetWithdrawals: projected.unmetWithdrawals,
    warnings,
    schedule: projected.schedule,
  }
}

export function explainSavingsGoal(input: SavingsGoalInput, result: SavingsGoalResult): CalculationExplanation {
  const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const ppy = periodsPerYear(input.contributionFrequency)
  const years = input.periodUnit === 'years' ? input.period : input.period / 12
  const n = input.solveFor === 'time' ? (result.periodsToGoal ?? 0) : Math.round(years * ppy)
  const r = input.returnRate / 100 / ppy
  const timingNote = r === 0
    ? `FV = ${money(input.currentSavings)} + PMT × ${n} = ${money(result.projectedBalance)}`
    : `FV = ${money(input.currentSavings)}×(1+${r.toFixed(6)})^${n} + PMT×((1+r)^${n} − 1)/r = ${money(result.projectedBalance)}`
  const steps: CalculationExplanation['steps'] =
    input.solveFor === 'contribution'
      ? [
          { label: 'Solve for contribution', expression: `Invert FV for PMT. Goal ${money(input.goalAmount)}, start ${money(input.currentSavings)}, r = ${r.toFixed(6)}, n = ${n}.`, result: `${money(result.requiredContribution)} per period` },
          { label: 'Future value', expression: timingNote.replace('PMT', money(result.requiredContribution)) },
        ]
      : input.solveFor === 'time'
        ? [
            { label: 'Solve for time', expression: r === 0 ? `With a 0% return, count contributions of ${money(input.periodicContribution ?? 0)} from ${money(input.currentSavings)} until ${money(input.goalAmount)}.` : `n = ln((Goal + PMT/r) / (PV + PMT/r)) / ln(1+r), with PV = ${money(input.currentSavings)}, PMT = ${money(input.periodicContribution ?? 0)}, Goal = ${money(input.goalAmount)}, r = ${r.toFixed(6)}`, result: `${Number(result.timeToGoal.toFixed(4))} years (${result.periodsToGoal} periods)` },
            { label: 'Future value', expression: timingNote.replace('PMT', money(input.periodicContribution ?? 0)) },
          ]
        : [
            { label: 'Projected balance', expression: timingNote.replace('PMT', money(input.periodicContribution ?? 0)) },
          ]
  return {
    title: 'Savings goal',
    steps,
    assumptions: [
      'Return is treated as constant; inflation and taxes are not modeled.',
      'Time to goal is the first whole contribution period reaching the target. Contributions arrive at the end of each period.',
      'Withdrawals are capped at available funds; unmet withdrawals do not become debt.',
      ...result.warnings,
    ],
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
      ...(result.unmetWithdrawals > 0
        ? [{ key: 'unmetWithdrawals', label: 'Unmet withdrawals (cumulative)', align: 'right' as const, format: 'currency' as const }]
        : []),
    ],
    rows: result.schedule.map((s) => ({ ...s })),
  }
}
