import { termToPeriods, periodsPerYear } from '@/utils/annuity'
import { solveLoanRate } from '@/utils/rootSolve'
import { buildAmortizationSchedule } from '@/utils/amortization'
import type { InterestRateInput, InterestRateResult } from './types'
import type { CalculationExplanation, ChartData, TableData } from '@/calculators/types'

export function calculateInterestRate(input: InterestRateInput): InterestRateResult {
  const ppy = periodsPerYear(input.paymentFrequency)
  const periods = termToPeriods(input.term, input.termUnit, input.paymentFrequency)
  const balloon = input.balloon ?? 0

  const periodicRate = solveLoanRate(input.principal, input.payment, periods, balloon) ?? 0
  const annualRate = periodicRate * ppy
  const effectiveAnnualRate = Math.pow(1 + periodicRate, ppy) - 1

  const sched = buildAmortizationSchedule({
    principal: input.principal,
    ratePerPeriod: periodicRate,
    periods,
    payment: input.payment,
    balloon,
  })

  return {
    periodicRate,
    annualRate,
    effectiveAnnualRate,
    totalInterest: sched.totalInterest,
    schedule: sched.schedule,
  }
}

export function explainInterestRate(_input: InterestRateInput, result: InterestRateResult): CalculationExplanation {
  return {
    title: 'Interest rate solve',
    steps: [
      { label: 'Objective', expression: 'Find r such that PV = PMT × annuity factor + FV/(1+r)^n' },
      { label: 'Periodic rate', result: `${(result.periodicRate * 100).toFixed(4)}%` },
      { label: 'Nominal annual rate', result: `${(result.annualRate * 100).toFixed(4)}%` },
      { label: 'Effective annual rate', result: `${(result.effectiveAnnualRate * 100).toFixed(4)}%` },
    ],
  }
}

export function buildInterestRateCharts(result: InterestRateResult): ChartData[] {
  return [{
    type: 'line',
    title: 'Remaining balance',
    valueFormat: 'currency',
    series: [{ name: 'Balance', data: result.schedule.filter((_, i) => i % 6 === 0 || i === result.schedule.length - 1).map((r) => ({ x: r.period, y: r.balance })), color: '#163B8C' }],
  }]
}

export function buildInterestRateTable(result: InterestRateResult): TableData {
  return {
    title: 'Amortization schedule',
    columns: [
      { key: 'period', label: '#', align: 'right' },
      { key: 'payment', label: 'Payment', align: 'right', format: 'currency' },
      { key: 'principal', label: 'Principal', align: 'right', format: 'currency' },
      { key: 'interest', label: 'Interest', align: 'right', format: 'currency' },
      { key: 'balance', label: 'Balance', align: 'right', format: 'currency' },
    ],
    rows: result.schedule.map((r) => ({ ...r })),
  }
}
