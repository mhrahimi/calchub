import { periodsPerYear } from '@/utils/annuity'
import { validateInvestment } from './validation'
import { applyGrowthCashFlow, checkedAmount, contributionUnit, effectiveAnnualPercent, elapsedTimeLabel, growthMoney, MAX_GROWTH_EVENTS, MAX_GROWTH_YEARS } from '@/utils/growthProjection'
import { findRateResult, requireSolution, solveRoot, CalculationError } from '@/utils/rootSolve'
import { downsamplePoints } from '@/utils/chartSample'
import type { InvestmentInput, InvestmentResult } from './types'
import type { CalculationExplanation, ChartData, TableData } from '@/calculators/types'

/** Stable factors also keep inverse solves consistent with the forward ledger near zero. */
function factors(rate: number, periods: number, begin: boolean) {
  const logGrowth = periods * Math.log1p(rate)
  return { growth: Math.exp(logGrowth), annuity: (rate === 0 ? periods : Math.expm1(logGrowth) / rate) * (begin ? 1 + rate : 1) }
}

export function calculateInvestment(input: InvestmentInput): InvestmentResult {
  const validation = validateInvestment(input)
  if (!validation.valid) throw new CalculationError('invalid_domain', Object.values(validation.errors).join('. '))
  const ppy = periodsPerYear(input.contributionFrequency)
  const begin = input.contributionTiming === 'begin'
  const isTime = input.solveFor === 'periods'
  const years = input.periodUnit === 'years' ? input.period : input.period / 12
  const n = isTime ? Math.min(MAX_GROWTH_YEARS * ppy, MAX_GROWTH_EVENTS) : Math.round(years * ppy)
  let r = input.solveFor === 'rate' ? 0 : input.returnRate / 100 / ppy
  let contribution = input.solveFor === 'pmt' ? 0 : input.periodicContribution
  let start = input.solveFor === 'pv' ? 0 : input.startingInvestment
  const target = input.targetValue ?? 0 // Validation requires this for every inverse solve.
  let solvedLabel = 'Ending balance'
  let solvedValue = 0
  const futureValue = (rate: number) => {
    const f = factors(rate, n, begin)
    return start * f.growth + contribution * f.annuity
  }

  if (input.solveFor === 'pv' || input.solveFor === 'pmt') {
    const f = factors(r, n, begin)
    if (input.solveFor === 'pv') {
      start = checkedAmount((target - contribution * f.annuity) / f.growth)
      if (start < 0) throw new CalculationError('invalid_domain', 'The planned contributions already exceed the target. Reduce contributions or increase the target balance.')
      solvedValue = start
      solvedLabel = 'Required starting investment'
    } else {
      contribution = checkedAmount((target - start * f.growth) / f.annuity)
      solvedValue = contribution
      solvedLabel = `Required contribution per ${contributionUnit(input.contributionFrequency)}`
    }
  } else if (input.solveFor === 'rate') {
    const objective = (rate: number) => futureValue(rate) - target
    r = requireSolution(findRateResult(objective))
    // Refine the rate before testing the currency residual of a long projection.
    const width = 1e-8 * Math.max(1, Math.abs(r))
    const refined = solveRoot(objective, Math.max(-1 + Number.EPSILON, r - width), r + width, 1e-15)
    if (refined.status === 'success') r = refined.value
    solvedValue = r * ppy * 100
    solvedLabel = 'Required nominal annual return'
  }
  const effectiveAnnualRate = effectiveAnnualPercent(r * ppy * 100, ppy)
  const schedule: InvestmentResult['schedule'] = []
  let balance = start
  let totalContributions = start
  let unmetWithdrawals = 0
  let depletionPeriod: number | undefined
  let elapsedPeriods = 0
  let reached = false
  // Lower targets with withdrawals or losses are drawdown targets. Otherwise,
  // an accumulation goal below the initial balance is already funded.
  const drawdown = isTime && target < start && (contribution < 0 || r < 0)
  if (drawdown && target === 0 && contribution >= 0) throw new CalculationError('unreachable', 'A positive balance cannot reach exactly zero at a finite time without withdrawals under this return model.')
  const atGoal = () => drawdown ? balance <= target : balance >= target
  const row = (period: number) => schedule.push({
    period: period / ppy,
    balance: growthMoney(balance), contributions: growthMoney(totalContributions),
    earnings: growthMoney(balance - totalContributions), unmetWithdrawals: growthMoney(unmetWithdrawals),
  })
  const post = (period: number) => {
    const flow = applyGrowthCashFlow(balance, contribution)
    balance = flow.balance
    totalContributions = checkedAmount(totalContributions + flow.actual)
    unmetWithdrawals = checkedAmount(unmetWithdrawals + flow.unmet)
    if (contribution < 0 && balance === 0 && depletionPeriod === undefined) depletionPeriod = period / ppy
  }
  if (isTime && atGoal()) {
    reached = true
    row(0)
  }
  for (let period = 0; period < n && !reached; period++) {
    const before = balance
    if (begin) {
      post(period)
      if (isTime && atGoal()) {
        elapsedPeriods = period
        row(period)
        reached = true
        break
      }
    }
    balance = checkedAmount(balance * (1 + r))
    if (!begin) post(period + 1)
    elapsedPeriods = period + 1
    row(elapsedPeriods)
    if (isTime) {
      reached = atGoal()
      if (!reached && (drawdown ? balance >= before : balance <= before)) {
        throw new CalculationError('unreachable', 'The target is unreachable with this return and contribution. Adjust the target, return, or contribution.')
      }
    }
  }
  if (isTime && !reached) throw new CalculationError('unreachable', `The target is not reached within the supported ${MAX_GROWTH_YEARS}-year horizon`)
  if (!['fv', 'periods'].includes(input.solveFor) && Math.abs(balance - target) > 0.01) {
    throw new CalculationError('unreachable', 'The solved inputs do not reach the target without borrowing or exceeding numeric precision. Adjust the target, contribution, or duration.')
  }
  if (input.solveFor === 'fv') solvedValue = balance
  if (isTime) {
    solvedValue = elapsedPeriods / ppy
    solvedLabel = 'Time to target'
  }
  if (!Number.isFinite(solvedValue)) throw new CalculationError('invalid_domain', 'The calculation did not produce a finite solution')
  const warnings = depletionPeriod === undefined ? [] : [`Funds are depleted ${depletionPeriod === 0 ? 'at the start' : `after ${elapsedTimeLabel(Math.round(depletionPeriod * ppy), input.contributionFrequency)}`}. Withdrawals are capped at available funds; unmet withdrawals are reported separately. No borrowing is assumed.`]
  return {
    status: depletionPeriod === undefined ? 'success' : 'depleted', warnings,
    rateConvention: 'nominal-annual', effectiveAnnualRate, depletionPeriod,
    unmetWithdrawals: growthMoney(unmetWithdrawals),
    ...(isTime ? { elapsedPeriods, elapsedTime: elapsedTimeLabel(elapsedPeriods, input.contributionFrequency) } : {}),
    endingBalance: growthMoney(balance), startingPrincipal: growthMoney(start),
    totalContributions: growthMoney(totalContributions), investmentEarnings: growthMoney(balance - totalContributions),
    // Preserve solver precision; the presentation layer formats the result.
    solvedValue, solvedLabel, schedule,
  }
}

export function explainInvestment(input: InvestmentInput, result: InvestmentResult): CalculationExplanation {
  const fv =
    input.contributionTiming === 'begin'
      ? 'FV = PV(1+r)^n + PMT × (1+r) × ((1+r)^n − 1) / r  (contributions at start of period)'
      : 'FV = PV(1+r)^n + PMT × ((1+r)^n − 1) / r'
  const bySolve: Record<InvestmentInput['solveFor'], CalculationExplanation['steps']> = {
    fv: [{ label: 'Ending balance', expression: fv }],
    pv: [
      { label: 'Required starting amount', expression: 'Invert FV for PV given a target value and contributions' },
      { label: 'Future value', expression: fv },
    ],
    pmt: [
      { label: 'Required contribution', expression: 'Invert FV for PMT given a target value' },
      { label: 'Future value', expression: fv },
    ],
    rate: [
      { label: 'Required return', expression: 'Solve r numerically so FV matches the target' },
    ],
    periods: [
      { label: 'Required time', expression: 'Step the balance forward until it reaches the target' },
    ],
  }
  return {
    title: 'Investment projection',
    steps: [...bySolve[input.solveFor], ...(result.effectiveAnnualRate === undefined ? [] : [{ label: 'Effective annual return', result: `${result.effectiveAnnualRate.toFixed(4)}%` }])],
    assumptions: [
      `The rate is nominal annual, compounded ${periodsPerYear(input.contributionFrequency)} times per year. Contributions are per ${contributionUnit(input.contributionFrequency)}, at the ${input.contributionTiming === 'begin' ? 'beginning' : 'end'} of each period.`,
      'Periods are regular and use the selected number of periods per year; no actual-calendar adjustment or partial contribution periods.',
      'Constant return is deterministic and does not model volatility, taxes, or fees.',
      'Withdrawals are capped at available funds. Unmet withdrawals do not become debt. Contributions in the schedule are actual net cash flows including starting principal.',
      ...(input.solveFor === 'periods' ? ['Time to target is the first modeled contribution or period-end event that reaches the goal. Lower targets with withdrawals or negative returns are treated as drawdown goals.'] : []),
    ],
  }
}

export function buildInvestmentCharts(result: InvestmentResult): ChartData[] {
  return [
    {
      type: 'line',
      title: 'Portfolio growth',
      valueFormat: 'currency',
      series: [{ name: 'Balance', data: downsamplePoints(result.schedule, 241).map((s) => ({ x: s.period, y: s.balance })), color: '#163B8C' }],
    },
    {
      type: 'area',
      title: 'Contributions vs earnings',
      stacked: true,
      valueFormat: 'currency',
      series: [
        { name: 'Contributions', data: downsamplePoints(result.schedule, 241).map((s) => ({ x: s.period, y: s.contributions })), color: '#4A7FD4' },
        { name: 'Earnings', data: downsamplePoints(result.schedule, 241).map((s) => ({ x: s.period, y: s.earnings })), color: '#163B8C' },
      ],
    },
  ]
}

export function buildInvestmentTable(result: InvestmentResult): TableData {
  return {
    title: 'Growth schedule',
    columns: [
      { key: 'period', label: 'Year', align: 'right', format: 'number' },
      { key: 'balance', label: 'Balance', align: 'right', format: 'currency' },
      { key: 'contributions', label: 'Contributions', align: 'right', format: 'currency' },
      { key: 'earnings', label: 'Earnings', align: 'right', format: 'currency' },
      ...(result.depletionPeriod !== undefined ? [{ key: 'unmetWithdrawals', label: 'Unmet withdrawals (cumulative)', align: 'right' as const, format: 'currency' as const }] : []),
    ],
    rows: result.schedule.map((s) => ({ ...s })),
  }
}
