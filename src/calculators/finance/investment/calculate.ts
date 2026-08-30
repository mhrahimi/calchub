import { fvEnd, fvBegin, pmtFromFv, pvFromFv, periodsPerYear } from '@/utils/annuity'
import { findRate } from '@/utils/rootSolve'
import { downsamplePoints } from '@/utils/chartSample'
import type { InvestmentInput, InvestmentResult } from './types'
import type { CalculationExplanation, ChartData, TableData } from '@/calculators/types'

export function calculateInvestment(input: InvestmentInput): InvestmentResult {
  const ppy = periodsPerYear(input.contributionFrequency)
  const years = input.periodUnit === 'years' ? input.period : input.period / 12
  const nGiven = Math.round(years * ppy)
  const rGiven = input.returnRate / 100 / ppy
  const begin = input.contributionTiming === 'begin'
  const fvFn = begin ? fvBegin : fvEnd

  let n = nGiven
  let r = rGiven
  let pmtAmt = input.periodicContribution
  let start = input.startingInvestment
  let endingBalance = 0
  let solvedValue = 0
  let solvedLabel = 'Ending balance'

  switch (input.solveFor) {
    case 'fv': {
      endingBalance = fvFn(start, r, n, pmtAmt)
      solvedValue = endingBalance
      break
    }
    case 'pv': {
      const target = input.targetValue ?? 0
      start = pvFromFv(target, r, n, pmtAmt, begin)
      endingBalance = target
      solvedValue = start
      solvedLabel = 'Required starting investment'
      break
    }
    case 'pmt': {
      const target = input.targetValue ?? fvFn(start, r, n, 0)
      pmtAmt = pmtFromFv(start, r, n, target, begin)
      endingBalance = target
      solvedValue = pmtAmt
      solvedLabel = 'Required contribution'
      break
    }
    case 'rate': {
      const target = input.targetValue ?? 0
      const rate = findRate((rateTry) => fvFn(start, rateTry, n, pmtAmt) - target)
      r = rate ?? 0
      solvedValue = r * ppy * 100
      endingBalance = target
      solvedLabel = 'Required return rate'
      break
    }
    case 'periods': {
      const target = input.targetValue ?? 0
      let periods = 0
      let bal = start
      while (bal < target && periods < 1000 * ppy) {
        periods++
        if (begin) bal += pmtAmt
        bal *= 1 + r
        if (!begin) bal += pmtAmt
      }
      n = periods
      solvedValue = periods / ppy
      endingBalance = bal
      solvedLabel = 'Required years'
      break
    }
  }

  endingBalance = Math.round(endingBalance * 100) / 100
  const totalContributions = start + pmtAmt * n
  const investmentEarnings = endingBalance - totalContributions

  const full: InvestmentResult['schedule'] = []
  let bal = start
  let contrib = start
  for (let p = 1; p <= n; p++) {
    if (begin) {
      bal += pmtAmt
      contrib += pmtAmt
    }
    bal *= 1 + r
    if (!begin) {
      bal += pmtAmt
      contrib += pmtAmt
    }
    full.push({
      period: Math.round((p / ppy) * 10) / 10,
      balance: Math.round(bal * 100) / 100,
      contributions: Math.round(contrib * 100) / 100,
      earnings: Math.round((bal - contrib) * 100) / 100,
    })
  }
  const schedule = downsamplePoints(full, 31)

  return {
    endingBalance,
    startingPrincipal: Math.round(start * 100) / 100,
    totalContributions: Math.round(totalContributions * 100) / 100,
    investmentEarnings: Math.round(investmentEarnings * 100) / 100,
    solvedValue: Math.round(solvedValue * 100) / 100,
    solvedLabel,
    schedule,
  }
}

export function explainInvestment(input: InvestmentInput, _result: InvestmentResult): CalculationExplanation {
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
    steps: bySolve[input.solveFor],
    assumptions: ['Constant return is deterministic and does not model volatility or taxes.'],
  }
}

export function buildInvestmentCharts(result: InvestmentResult): ChartData[] {
  return [
    {
      type: 'line',
      title: 'Portfolio growth',
      valueFormat: 'currency',
      series: [{ name: 'Balance', data: result.schedule.map((s) => ({ x: s.period, y: s.balance })), color: '#163B8C' }],
    },
    {
      type: 'area',
      title: 'Contributions vs earnings',
      stacked: true,
      valueFormat: 'currency',
      series: [
        { name: 'Contributions', data: result.schedule.map((s) => ({ x: s.period, y: s.contributions })), color: '#4A7FD4' },
        { name: 'Earnings', data: result.schedule.map((s) => ({ x: s.period, y: s.earnings })), color: '#163B8C' },
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
    ],
    rows: result.schedule.map((s) => ({ ...s })),
  }
}
