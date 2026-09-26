import type { CalculationExplanation, ChartData, TableData } from '@/calculators/types'
import type { RetirementInput, RetirementResult } from './types'
import { validateRetirement } from './validation'

function round2(n: number): number {
  if (!Number.isFinite(n * 100)) throw new Error('These assumptions exceed the supported numerical range. Reduce rates or amounts.')
  return Math.round(n * 100) / 100
}

export function calculateRetirement(input: RetirementInput): RetirementResult {
  const validation = validateRetirement(input)
  if (!validation.valid) throw new Error(Object.values(validation.errors)[0])
  const yearsToRetirement = input.retirementAge - input.currentAge
  const rNom = input.expectedReturn / 100
  const inflation = input.inflation / 100

  const accumulation: RetirementResult['accumulation'] = []
  const annualSchedule: RetirementResult['annualSchedule'] = []

  let balance = input.currentSavings
  let contribution = input.annualContribution
  let totalContributions = input.currentSavings

  for (let y = 0; y < yearsToRetirement; y++) {
    const age = input.currentAge + y
    if (balance + contribution < 0) throw new Error(`Planned withdrawal exceeds savings at age ${age}`)
    balance = (balance + contribution) * (1 + rNom)
    totalContributions += contribution
    accumulation.push({
      age: age + 1,
      balance: round2(balance),
      contributions: round2(totalContributions),
    })
    annualSchedule.push({
      age: age + 1,
      phase: 'Accumulation',
      balance: round2(balance),
      contribution: round2(contribution),
      withdrawal: 0,
      plannedWithdrawal: 0,
      unmetSpending: 0,
    })
    contribution *= 1 + input.contributionGrowth / 100
  }

  const projectedBalance = round2(balance)
  // First withdrawal is at the end of the first retirement year, in retirement-date
  // dollars. Later withdrawals increase with inflation. Discount these same flows.
  const spendingAtRetirement = input.retirementSpending * Math.pow(1 + inflation, yearsToRetirement)
  const otherAtRetirement = input.otherRetirementIncome * Math.pow(1 + inflation, yearsToRetirement)
  const netNeedAtRetirement = Math.max(0, spendingAtRetirement - otherAtRetirement)
  const plannedWithdrawals = Array.from({ length: input.retirementDuration }, (_, y) =>
    netNeedAtRetirement * Math.pow(1 + inflation, y))
  const requiredUnrounded = plannedWithdrawals.reduce((pv, withdrawal, y) =>
    pv + withdrawal / Math.pow(1 + rNom, y + 1), 0)
  const requiredBalance = round2(requiredUnrounded)

  const shortfallOrSurplus = round2(projectedBalance - requiredBalance)

  // FV per dollar of first-year contribution, paid at each year's beginning.
  let contributionFactor = 0
  for (let y = 0; y < yearsToRetirement; y++) {
    contributionFactor += Math.pow(1 + input.contributionGrowth / 100, y)
      * Math.pow(1 + rNom, yearsToRetirement - y)
  }
  const savingsFv = input.currentSavings * Math.pow(1 + rNom, yearsToRetirement)
  const contributionCents = Math.max(0, (requiredUnrounded - savingsFv) / contributionFactor) * 100
  // Ignore sub-nanocent floating-point noise at an exact cent boundary.
  const requiredAnnualContribution = Math.max(0, Math.ceil(contributionCents - 1e-9)) / 100
  if (![balance, totalContributions, requiredUnrounded, requiredAnnualContribution, ...plannedWithdrawals].every(Number.isFinite)) {
    throw new Error('These assumptions exceed the supported numerical range. Reduce rates or amounts.')
  }

  // Drawdown simulation (nominal)
  const drawdown: RetirementResult['drawdown'] = []
  let retBal = balance
  let depletionAge: number | null = balance < 0.005 && netNeedAtRetirement > 0 ? input.retirementAge : null
  let totalUnmetSpending = 0
  for (let y = 0; y < plannedWithdrawals.length; y++) {
    const age = input.retirementAge + y
    const plannedWithdrawal = plannedWithdrawals[y]
    const available = retBal * (1 + rNom)
    if (!Number.isFinite(available)) throw new Error('These assumptions exceed the supported numerical range.')
    const withdrawal = Math.min(available, plannedWithdrawal)
    const unmetSpending = plannedWithdrawal - withdrawal
    retBal = Math.max(0, available - withdrawal)
    totalUnmetSpending += unmetSpending
    if (depletionAge === null && retBal < 0.005 && plannedWithdrawal > 0) depletionAge = age + 1
    drawdown.push({
      age: age + 1,
      balance: round2(retBal),
      withdrawal: round2(withdrawal),
      plannedWithdrawal: round2(plannedWithdrawal),
      unmetSpending: round2(unmetSpending),
    })
    annualSchedule.push({
      age: age + 1,
      phase: 'Drawdown',
      balance: round2(retBal),
      contribution: 0,
      withdrawal: round2(withdrawal),
      plannedWithdrawal: round2(plannedWithdrawal),
      unmetSpending: round2(unmetSpending),
    })
  }

  return {
    yearsToRetirement,
    projectedBalance,
    requiredBalance,
    shortfallOrSurplus,
    requiredAnnualContribution,
    depletionAge,
    totalUnmetSpending: round2(totalUnmetSpending),
    status: totalUnmetSpending >= 0.005 ? 'insufficient_funds' : 'success',
    warnings: totalUnmetSpending >= 0.005 ? ['Savings do not fund all planned retirement spending. Review the unmet spending in the schedule.'] : [],
    accumulation,
    drawdown,
    annualSchedule,
  }
}

export function explainRetirement(input: RetirementInput, result: RetirementResult): CalculationExplanation {
  return {
    title: 'Retirement projection',
    steps: [
      {
        label: 'Accumulation',
        expression: 'B_t = (B_{t-1} + Contribution_t) × (1 + r)',
        result: `Projected at retirement: $${result.projectedBalance.toFixed(2)}`,
      },
      {
        label: 'Real return',
        expression: 'r_real = (1 + r_nominal) / (1 + inflation) - 1',
        result: `${((((1 + input.expectedReturn / 100) / (1 + input.inflation / 100) - 1) * 100)).toFixed(2)}%`,
      },
      {
        label: 'Required nest egg',
        expression: 'Sum of each planned net withdrawal discounted at the nominal return to the retirement date',
        result: `$${result.requiredBalance.toFixed(2)}`,
      },
      {
        label: 'Shortfall / surplus',
        result: `$${result.shortfallOrSurplus.toFixed(2)}`,
      },
    ],
    assumptions: [
      'Deterministic constant returns do not model sequence-of-returns risk.',
      'Spending and other income grow with inflation during retirement.',
      'Spending and other income are entered in today’s dollars and grow with inflation until retirement.',
      'Contributions occur at the beginning of each accumulation year. Required contribution is the first-year amount, growing at the entered contribution growth rate.',
      'The first withdrawal occurs at the end of the first retirement year, at the retirement-date spending level. Subsequent withdrawals grow with inflation.',
      'Withdrawal is the amount funded by savings. Planned withdrawal and unmet spending show any funding gap.',
    ],
  }
}

export function buildRetirementCharts(result: RetirementResult): ChartData[] {
  return [
    {
      type: 'line',
      title: 'Accumulation',
      valueFormat: 'currency',
      series: [
        {
          name: 'Balance',
          data: result.accumulation.map((a) => ({ x: a.age, y: a.balance })),
          color: '#163B8C',
        },
      ],
    },
    {
      type: 'line',
      title: 'Retirement drawdown',
      valueFormat: 'currency',
      series: [
        {
          name: 'Balance',
          data: result.drawdown.map((d) => ({ x: d.age, y: d.balance })),
          color: '#4A7FD4',
        },
      ],
    },
  ]
}

export function buildRetirementTable(result: RetirementResult): TableData {
  return {
    title: 'Annual projection',
    columns: [
      { key: 'age', label: 'Age', align: 'right' },
      { key: 'phase', label: 'Phase', align: 'left' },
      { key: 'balance', label: 'Balance', align: 'right', format: 'currency' },
      { key: 'contribution', label: 'Contribution', align: 'right', format: 'currency' },
      { key: 'withdrawal', label: 'Withdrawal', align: 'right', format: 'currency' },
      { key: 'plannedWithdrawal', label: 'Planned withdrawal', align: 'right', format: 'currency' },
      { key: 'unmetSpending', label: 'Unmet spending', align: 'right', format: 'currency' },
    ],
    rows: result.annualSchedule.map((r) => ({ ...r })),
  }
}
