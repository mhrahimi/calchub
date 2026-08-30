import type { DtiInput, DtiResult } from './types'
import type { CalculationExplanation, ChartData, TableData } from '@/calculators/types'

export function calculateDti(input: DtiInput): DtiResult {
  const frontEndDti = (input.housingCost / input.grossMonthlyIncome) * 100
  const backEndDti = ((input.housingCost + input.debtPayments) / input.grossMonthlyIncome) * 100

  return {
    frontEndDti: Math.round(frontEndDti * 100) / 100,
    backEndDti: Math.round(backEndDti * 100) / 100,
    housingCost: input.housingCost,
    totalDebt: input.housingCost + input.debtPayments,
    withinGuideline: backEndDti <= input.guideline,
    breakdown: [
      { label: 'Housing', amount: input.housingCost },
      { label: 'Other debt', amount: input.debtPayments },
    ],
  }
}

export function explainDti(_input: DtiInput, result: DtiResult): CalculationExplanation {
  return {
    title: 'Debt-to-income ratios',
    steps: [
      { label: 'Front-end DTI', expression: 'Housing / Gross income', result: `${result.frontEndDti.toFixed(2)}%` },
      { label: 'Back-end DTI', expression: '(Housing + Debt) / Gross income', result: `${result.backEndDti.toFixed(2)}%` },
    ],
    assumptions: ['Lender guidelines vary by program.'],
  }
}

export function buildDtiCharts(result: DtiResult): ChartData[] {
  return [{
    type: 'bar',
    title: 'Debt components',
    valueFormat: 'currency',
    series: [{ name: 'Monthly', data: result.breakdown.map((b) => ({ x: b.label, y: b.amount })), color: '#163B8C' }],
  }]
}

export function buildDtiTable(result: DtiResult): TableData {
  return {
    title: 'DTI summary',
    columns: [
      { key: 'metric', label: 'Metric', align: 'left' },
      { key: 'value', label: 'Value', align: 'right' },
    ],
    rows: [
      { metric: 'Front-end DTI', value: `${result.frontEndDti}%` },
      { metric: 'Back-end DTI', value: `${result.backEndDti}%` },
      { metric: 'Housing cost', value: result.housingCost },
      { metric: 'Total debt payments', value: result.totalDebt },
    ],
  }
}
