import { termToPeriods, annualToPeriodic, periodsPerYear } from '@/utils/annuity'
import { buildAmortizationSchedule, compareSchedules } from '@/utils/amortization'
import { downsamplePoints, aggregatePrincipalInterest } from '@/utils/chartSample'
import type { AmortizationInput, AmortizationResult } from './types'
import type { CalculationExplanation, ChartData, TableData } from '@/calculators/types'

export function calculateAmortization(input: AmortizationInput): AmortizationResult {
  const ppy = periodsPerYear(input.paymentFrequency)
  const ratePerPeriod = annualToPeriodic(input.interestRate / 100, ppy)
  const periods = termToPeriods(input.term, input.termUnit, input.paymentFrequency)
  const startDate = input.startDate ? new Date(input.startDate) : undefined

  const baseline = buildAmortizationSchedule({
    principal: input.principal,
    ratePerPeriod,
    periods,
    startDate,
  })

  let result: AmortizationResult = {
    payment: baseline.payment,
    totalPayments: baseline.totalPayments,
    totalInterest: baseline.totalInterest,
    totalPrincipal: input.principal,
    payoffPeriod: baseline.payoffPeriod,
    schedule: baseline.schedule,
  }

  if (input.extraPayment && input.extraPayment > 0) {
    const accelerated = buildAmortizationSchedule({
      principal: input.principal,
      ratePerPeriod,
      periods,
      startDate,
      extraPayment: input.extraPayment,
      extraFrequency: input.extraFrequency ?? 'every',
    })
    const comparison = compareSchedules(baseline, accelerated)
    result = {
      ...result,
      schedule: accelerated.schedule,
      totalPayments: accelerated.totalPayments,
      totalInterest: accelerated.totalInterest,
      payoffPeriod: accelerated.payoffPeriod,
      interestSaved: comparison.interestSaved,
      periodsSaved: comparison.periodsSaved,
      baselineSchedule: baseline.schedule,
    }
  }

  return result
}

export function explainAmortization(
  input: AmortizationInput,
  result: AmortizationResult,
): CalculationExplanation {
  const ppy = periodsPerYear(input.paymentFrequency)
  const ratePct = ((input.interestRate / 100 / ppy) * 100).toFixed(4)
  return {
    title: 'Amortization calculation',
    steps: [
      {
        label: 'Periodic rate',
        expression: `Rate = ${input.interestRate}% / ${ppy}\n     = ${ratePct}% per period`,
      },
      {
        label: 'Payment formula',
        expression: 'PMT = P × r / (1 - (1+r)^(-n))',
      },
      {
        label: 'Scheduled payment',
        result: `Payment = $${result.payment.toFixed(2)}`,
      },
      {
        label: 'Total interest',
        result: `$${result.totalInterest.toFixed(2)} over ${result.payoffPeriod} periods`,
      },
    ],
    assumptions: input.extraPayment
      ? ['Extra payments applied after scheduled principal each period.']
      : undefined,
  }
}

export function buildAmortizationCharts(result: AmortizationResult): ChartData[] {
  const balanceData = downsamplePoints(result.schedule, 61)
  const mix = aggregatePrincipalInterest(result.schedule)
  return [
    {
      type: 'line',
      title: 'Remaining balance',
      valueFormat: 'currency',
      series: [
        {
          name: 'Balance',
          data: balanceData.map((r) => ({ x: r.period, y: r.balance })),
          color: '#163B8C',
        },
      ],
      xLabel: 'Period',
      yLabel: 'Balance',
    },
    {
      type: 'area',
      title: 'Principal vs interest',
      stacked: true,
      valueFormat: 'currency',
      series: [
        {
          name: 'Principal',
          data: mix.map((r) => ({ x: r.period, y: r.principal })),
          color: '#163B8C',
        },
        {
          name: 'Interest',
          data: mix.map((r) => ({ x: r.period, y: r.interest })),
          color: '#8A94A6',
        },
      ],
    },
  ]
}

export function buildAmortizationTable(result: AmortizationResult): TableData {
  return {
    title: 'Amortization schedule',
    columns: [
      { key: 'period', label: '#', align: 'right' },
      { key: 'date', label: 'Date', align: 'left' },
      { key: 'payment', label: 'Payment', align: 'right', format: 'currency' },
      { key: 'principal', label: 'Principal', align: 'right', format: 'currency' },
      { key: 'interest', label: 'Interest', align: 'right', format: 'currency' },
      { key: 'extraPrincipal', label: 'Extra', align: 'right', format: 'currency' },
      { key: 'balance', label: 'Balance', align: 'right', format: 'currency' },
    ],
    rows: result.schedule.map((r) => ({
      period: r.period,
      date: r.date ?? '',
      payment: r.payment,
      principal: r.principal,
      interest: r.interest,
      extraPrincipal: r.extraPrincipal,
      balance: r.balance,
    })),
  }
}
