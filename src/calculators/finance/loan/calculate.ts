import { termToPeriods, annualToPeriodic, periodsPerYear } from '@/utils/annuity'
import { buildAmortizationSchedule } from '@/utils/amortization'
import { aggregatePrincipalInterest } from '@/utils/chartSample'
import type { LoanInput, LoanResult } from './types'
import type { CalculationExplanation, ChartData, TableData } from '@/calculators/types'

export function calculateLoan(input: LoanInput): LoanResult {
  let financedAmount = input.loanAmount ?? 0
  let costBreakdown: LoanResult['costBreakdown']

  if (input.mode === 'auto') {
    const price = input.vehiclePrice ?? 0
    const tax = price * ((input.salesTaxRate ?? 0) / 100)
    const fees = (input.taxableFees ?? 0) + tax
    financedAmount =
      price + fees - (input.cashDown ?? 0) - (input.tradeIn ?? 0) - (input.rebates ?? 0)
    costBreakdown = [
      { label: 'Vehicle price', amount: price },
      { label: 'Sales tax & fees', amount: fees },
      { label: 'Down payment', amount: -(input.cashDown ?? 0) },
      { label: 'Trade-in', amount: -(input.tradeIn ?? 0) },
      { label: 'Rebates', amount: -(input.rebates ?? 0) },
    ]
  }

  const ppy = periodsPerYear(input.paymentFrequency)
  const ratePerPeriod = annualToPeriodic(input.interestRate / 100, ppy)
  const periods = termToPeriods(input.term, input.termUnit, input.paymentFrequency)

  const sched = buildAmortizationSchedule({
    principal: financedAmount,
    ratePerPeriod,
    periods,
    balloon: input.balloon ?? 0,
    extraPayment: input.extraPayment,
    extraFrequency: 'every',
  })

  if (costBreakdown) {
    costBreakdown.push({ label: 'Interest', amount: sched.totalInterest })
  }

  return {
    financedAmount,
    payment: sched.payment,
    totalInterest: sched.totalInterest,
    totalCost: financedAmount + sched.totalInterest + (input.fees ?? 0),
    schedule: sched.schedule,
    costBreakdown,
  }
}

export function explainLoan(input: LoanInput, _result: LoanResult): CalculationExplanation {
  const steps: CalculationExplanation['steps'] = []
  if (input.mode === 'auto') {
    steps.push({
      label: 'Amount financed',
      expression: 'Price + tax & fees − down − trade-in − rebates',
    })
  }
  steps.push(
    { label: 'Periodic rate', expression: 'r = APR / payments per year' },
    {
      label: 'Payment',
      expression: 'PMT = P × r(1+r)^n / ((1+r)^n − 1)',
    },
  )
  if (input.balloon) {
    steps.push({
      label: 'Balloon',
      expression: 'The last period pays remaining principal as a lump sum.',
    })
  }
  return {
    title: input.mode === 'auto' ? 'Auto loan calculation' : 'Loan calculation',
    steps,
    assumptions: input.extraPayment
      ? ['Extra payments are applied every period and shorten the schedule.']
      : undefined,
  }
}

export function buildLoanCharts(result: LoanResult): ChartData[] {
  const mix = aggregatePrincipalInterest(result.schedule)
  const charts: ChartData[] = [
    {
      type: 'area',
      title: 'Principal vs interest',
      stacked: true,
      valueFormat: 'currency',
      series: [
        { name: 'Principal', data: mix.map((r) => ({ x: r.period, y: r.principal })), color: '#163B8C' },
        { name: 'Interest', data: mix.map((r) => ({ x: r.period, y: r.interest })), color: '#8A94A6' },
      ],
    },
  ]
  if (result.costBreakdown) {
    charts.unshift({
      type: 'pie',
      title: 'Auto loan cost breakdown',
      valueFormat: 'currency',
      series: [{
        name: 'Cost',
        data: result.costBreakdown
          .filter((b) => b.amount > 0)
          .map((b) => ({ x: b.label, y: b.amount })),
      }],
    })
  }
  return charts
}

export function buildLoanTable(result: LoanResult): TableData {
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
