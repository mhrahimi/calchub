import type { CalculationExplanation, ChartData, TableData } from '@/calculators/types'
import { checkIncomeContribution } from './income'
import type { RetirementInput, RetirementResult } from './types'
import { validateRetirement } from './validation'

function round2(n: number): number {
  if (!Number.isFinite(n * 100)) throw new Error('These assumptions exceed the supported numerical range. Reduce rates or amounts.')
  return Math.round(n * 100) / 100
}

export function calculateRetirement(input: RetirementInput): RetirementResult {
  const validation = validateRetirement(input)
  if (!validation.valid) throw new Error(Object.values(validation.errors)[0])
  const income = input.contributionPath === 'income' ? checkIncomeContribution(input).contribution : undefined
  if (input.contributionPath === 'income' && !income) throw new Error('Income contribution could not be estimated')
  const yearsToRetirement = input.retirementAge - input.currentAge
  const rNom = input.expectedReturn / 100
  const inflation = input.inflation / 100

  const accumulation: RetirementResult['accumulation'] = []
  const annualSchedule: RetirementResult['annualSchedule'] = []

  let balance = input.currentSavings
  let contribution = income?.annualContribution ?? input.annualContribution
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
  const projectedBalanceToday = income
    ? round2(projectedBalance / Math.pow(1 + inflation, yearsToRetirement))
    : undefined
  const savingsGrown = round2(input.currentSavings * Math.pow(1 + rNom, yearsToRetirement))
  const added = round2(totalContributions - input.currentSavings)
  let growth = round2(projectedBalance - savingsGrown - added)
  growth = round2(growth + round2(projectedBalance - savingsGrown - added - growth))
  const balanceParts = [
    { label: "Today's investments, grown", amount: savingsGrown },
    { label: 'Contributions', amount: added },
    { label: 'Investment growth', amount: growth },
  ].filter((slice) => slice.amount > 0.005)
  const balanceSum = round2(balanceParts.reduce((sum, slice) => sum + slice.amount, 0))
  const balanceSlices = balanceParts.length >= 2 && Math.abs(balanceSum - projectedBalance) <= 0.05 ? balanceParts : undefined
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
    contributionPath: income ? 'income' : 'direct',
    yearsToRetirement,
    projectedBalance,
    requiredBalance,
    shortfallOrSurplus,
    requiredAnnualContribution,
    depletionAge,
    totalUnmetSpending: round2(totalUnmetSpending),
    status: totalUnmetSpending >= 0.005 ? 'insufficient_funds' : 'success',
    warnings: totalUnmetSpending >= 0.005 ? ['Savings do not fund all planned retirement spending. Review the unmet spending in the schedule.'] : [],
    ...(income ? {
      estimatedNetAnnual: income.estimatedNetAnnual,
      employeeContribution: income.employeeContribution,
      employerMatch: income.employerMatch,
      investedThisYear: income.investedThisYear,
      projectedBalanceToday,
      taxConfigVersion: income.taxConfigVersion,
      paycheckSlices: income.paycheckSlices,
      investmentSlices: income.investmentSlices,
    } : {}),
    ...(balanceSlices ? { balanceSlices } : {}),
    accumulation,
    drawdown,
    annualSchedule,
  }
}

export function explainRetirement(input: RetirementInput, result: RetirementResult): CalculationExplanation {
  const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return {
    title: 'Retirement projection',
    steps: [
      {
        label: 'Accumulation',
        expression: `B_t = (B_{t-1} + contribution) × (1 + ${input.expectedReturn / 100}), from age ${input.currentAge} to ${input.retirementAge}. Contributions start at ${money(result.investedThisYear ?? input.annualContribution)} and grow ${input.contributionGrowth}%.`,
        result: `Projected at retirement: ${money(result.projectedBalance)}`,
      },
      {
        label: 'Required nest egg',
        expression: `Each planned withdrawal grows with inflation ${input.inflation}% and is discounted at the nominal return ${input.expectedReturn}%. Real return is not the discount rate.`,
        result: money(result.requiredBalance),
      },
      {
        label: 'Shortfall / surplus',
        result: money(result.shortfallOrSurplus),
      },
    ],
    assumptions: [
      'Deterministic constant returns do not model sequence-of-returns risk.',
      'Spending and other income grow with inflation during retirement.',
      'Spending and other income are entered in today’s dollars and grow with inflation until retirement.',
      'Contributions occur at the beginning of each accumulation year. Required contribution is the first-year amount, growing at the entered contribution growth rate.',
      'The first withdrawal occurs at the end of the first retirement year, at the retirement-date spending level. Subsequent withdrawals grow with inflation.',
      'Withdrawal is the amount funded by savings. Planned withdrawal and unmet spending show any funding gap.',
      ...(input.contributionPath === 'income' ? [
        'From-income projections estimate the first-year investment from current gross pay, taxes, and employer match. Later years grow that dollar amount with the annual raise and do not recalculate tax brackets.',
        'Pre-tax investments reduce taxed income. A percent of take-home is after-tax. Other after-tax investments are paid from take-home and do not reduce tax.',
        'Employer match is added to the amount invested and is not taxed as current pay. Matching applies to employee contributions up to the cap, a percent of gross pay. A zero cap adds no match.',
      ] : []),
    ],
  }
}

function pieChart(title: string, slices: Array<{ label: string; amount: number }> | undefined): ChartData | null {
  const data = (slices ?? []).filter((slice) => slice.amount > 0.005)
  if (data.length < 2) return null
  return {
    type: 'pie',
    title,
    valueFormat: 'currency',
    series: [{ name: 'Amount', data: data.map((slice) => ({ x: slice.label, y: slice.amount })) }],
  }
}

export function buildRetirementCharts(result: RetirementResult): ChartData[] {
  return [
    pieChart("This year's pay", result.paycheckSlices),
    pieChart('Invested this year', result.investmentSlices),
    pieChart('Balance at retirement', result.balanceSlices),
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
  ].filter((chart): chart is ChartData => chart !== null)
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
