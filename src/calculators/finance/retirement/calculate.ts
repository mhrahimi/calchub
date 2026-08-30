import type { CalculationExplanation, ChartData, TableData } from '@/calculators/types'
import type { RetirementInput, RetirementResult } from './types'

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Present value of an ordinary annuity */
function annuityPv(payment: number, rate: number, periods: number): number {
  if (periods <= 0) return 0
  if (rate === 0) return payment * periods
  return (payment * (1 - Math.pow(1 + rate, -periods))) / rate
}

export function calculateRetirement(input: RetirementInput): RetirementResult {
  const yearsToRetirement = input.retirementAge - input.currentAge
  const rNom = input.expectedReturn / 100
  const inflation = input.inflation / 100
  const rReal = (1 + rNom) / (1 + inflation) - 1

  const accumulation: RetirementResult['accumulation'] = []
  const annualSchedule: RetirementResult['annualSchedule'] = []

  let balance = input.currentSavings
  let contribution = input.annualContribution
  let totalContributions = input.currentSavings

  for (let y = 0; y < yearsToRetirement; y++) {
    const age = input.currentAge + y
    balance = (balance + contribution) * (1 + rNom)
    totalContributions += contribution
    contribution *= 1 + input.contributionGrowth / 100
    accumulation.push({
      age: age + 1,
      balance: round2(balance),
      contributions: round2(totalContributions),
    })
    annualSchedule.push({
      age: age + 1,
      phase: 'Accumulation',
      balance: round2(balance),
      contribution: round2(contribution / (1 + input.contributionGrowth / 100)),
      withdrawal: 0,
    })
  }

  const projectedBalance = round2(balance)
  // Required nest egg: spending grown to retirement, net of other income, PV at real return
  const spendingAtRetirement = input.retirementSpending * Math.pow(1 + inflation, yearsToRetirement)
  const otherAtRetirement = input.otherRetirementIncome * Math.pow(1 + inflation, yearsToRetirement)
  const netNeedAtRetirement = Math.max(0, spendingAtRetirement - otherAtRetirement)
  const requiredBalance = round2(annuityPv(netNeedAtRetirement, rReal, input.retirementDuration))

  const shortfallOrSurplus = round2(projectedBalance - requiredBalance)

  // Solve required level contribution (no growth) for shortfall
  let requiredAnnualContribution = input.annualContribution
  if (shortfallOrSurplus < 0 && yearsToRetirement > 0) {
    // FV of contributions with growth ≈ needed additional
    const needed = requiredBalance
    // Binary search for constant contribution
    let lo = 0
    let hi = needed
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2
      let bal = input.currentSavings
      let c = mid
      for (let y = 0; y < yearsToRetirement; y++) {
        bal = (bal + c) * (1 + rNom)
        c *= 1 + input.contributionGrowth / 100
      }
      if (bal < needed) lo = mid
      else hi = mid
    }
    requiredAnnualContribution = round2(hi)
  }

  // Drawdown simulation (nominal)
  const drawdown: RetirementResult['drawdown'] = []
  let retBal = projectedBalance
  let withdrawal = netNeedAtRetirement
  for (let y = 0; y < input.retirementDuration; y++) {
    const age = input.retirementAge + y
    retBal = retBal * (1 + rNom) - withdrawal
    if (retBal < 0) retBal = 0
    drawdown.push({
      age: age + 1,
      balance: round2(retBal),
      withdrawal: round2(withdrawal),
    })
    annualSchedule.push({
      age: age + 1,
      phase: 'Drawdown',
      balance: round2(retBal),
      contribution: 0,
      withdrawal: round2(withdrawal),
    })
    withdrawal *= 1 + inflation
  }

  return {
    yearsToRetirement,
    projectedBalance,
    requiredBalance,
    shortfallOrSurplus,
    requiredAnnualContribution,
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
        expression: 'PV of retirement spending net of other income',
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
    ],
    rows: result.annualSchedule.map((r) => ({ ...r })),
  }
}
