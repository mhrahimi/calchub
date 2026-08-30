import { irr, moic } from '@/utils/irr'
import type { LboInput, LboResult, LboDebtRow } from './types'
import type { CalculationExplanation, ChartData, TableData } from '@/calculators/types'

export function calculateLbo(input: LboInput): LboResult {
  const rate = input.interestRate / 100
  let debt = input.initialDebt
  const schedule: LboDebtRow[] = []

  for (let i = 0; i < input.forecast.length; i++) {
    const y = input.forecast[i]
    const fcf = y.ebitda - y.capex - y.nwcChange
    const interest = debt * rate
    const paydown = Math.max(0, fcf - interest)
    debt = Math.max(0, debt + interest - fcf)
    schedule.push({
      year: i + 1,
      ebitda: y.ebitda,
      fcf,
      interest,
      paydown,
      endingDebt: debt,
    })
  }

  const exitIdx = input.exitYear - 1
  const exitEbitda = input.forecast[exitIdx].ebitda
  const exitEv = exitEbitda * input.exitMultiple
  const exitDebt = schedule[exitIdx].endingDebt
  const exitEquity = exitEv - exitDebt
  const moicVal = moic(exitEquity, input.sponsorEquity)
  const flows = [-input.sponsorEquity]
  for (let i = 0; i < input.exitYear - 1; i++) flows.push(0)
  flows.push(exitEquity)
  const irrVal = irr(flows)

  const sourcesUses = [
    { item: 'Sponsor equity', amount: input.sponsorEquity },
    { item: 'Debt', amount: input.initialDebt },
    { item: 'Purchase EV', amount: input.purchaseEv },
  ]

  return {
    debtSchedule: schedule,
    exitEv,
    exitEquity,
    moic: moicVal,
    irr: irrVal,
    sourcesUses,
  }
}

export function explainLbo(_input: LboInput, _result: LboResult): CalculationExplanation {
  return {
    title: 'LBO returns',
    steps: [
      {
        label: 'Cash sweep',
        expression: 'Ending debt = max(0, beginning debt + interest − FCF)',
      },
      {
        label: 'Exit',
        expression: 'Exit EV = exit EBITDA × exit multiple;  exit equity = exit EV − remaining debt',
      },
      {
        label: 'MOIC',
        expression: 'MOIC = exit equity / sponsor equity',
      },
      {
        label: 'IRR',
        expression: 'IRR solves NPV(−equity, …, exit equity) = 0 over the hold period',
      },
    ],
    assumptions: [
      'Cash sweep applies excess FCF to debt paydown after interest',
      'Single debt tranche; multi-tranche structures vary',
    ],
  }
}

export function buildLboCharts(result: LboResult): ChartData[] {
  return [{
    type: 'line',
    title: 'Debt paydown',
    valueFormat: 'currency',
    series: [{ name: 'Ending debt', data: result.debtSchedule.map((r) => ({ x: r.year, y: r.endingDebt })), color: '#163B8C' }],
    xLabel: 'Year',
    yLabel: 'Debt',
  }]
}

export function buildLboTable(result: LboResult): TableData {
  return {
    title: 'Debt schedule',
    columns: [
      { key: 'year', label: 'Year', align: 'right' },
      { key: 'ebitda', label: 'EBITDA', align: 'right', format: 'currency' },
      { key: 'fcf', label: 'FCF', align: 'right', format: 'currency' },
      { key: 'interest', label: 'Interest', align: 'right', format: 'currency' },
      { key: 'paydown', label: 'Paydown', align: 'right', format: 'currency' },
      { key: 'endingDebt', label: 'Ending debt', align: 'right', format: 'currency' },
    ],
    rows: result.debtSchedule.map((r) => ({
      year: r.year,
      ebitda: Math.round(r.ebitda),
      fcf: Math.round(r.fcf),
      interest: Math.round(r.interest),
      paydown: Math.round(r.paydown),
      endingDebt: Math.round(r.endingDebt),
    })),
  }
}
