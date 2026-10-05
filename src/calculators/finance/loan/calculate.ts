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
    // Sales tax on vehicle price only; financed fees (`taxableFees`) are not taxed here.
    const tax = price * ((input.salesTaxRate ?? 0) / 100)
    const financedFees = input.taxableFees ?? 0
    const taxAndFees = financedFees + tax
    financedAmount =
      price + taxAndFees - (input.cashDown ?? 0) - (input.tradeIn ?? 0) - (input.rebates ?? 0)
    costBreakdown = [
      { label: 'Vehicle price', amount: price },
      { label: 'Sales tax', amount: tax },
      { label: 'Fees (financed)', amount: financedFees },
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
    paymentFrequency: input.paymentFrequency,
    balloon: input.balloon ?? 0,
    extraPayment: input.extraPayment,
    extraFrequency: 'every',
  })

  if (costBreakdown) {
    costBreakdown.push({ label: 'Interest', amount: sched.totalInterest })
  }

  // `fees` are prepaid/non-financed (standard loans). Auto financed fees are already
  // inside `financedAmount` via `taxableFees` and must not be added again.
  const prepaidFees = input.mode === 'auto' ? 0 : (input.fees ?? 0)

  return {
    status: sched.status, warnings: sched.warnings, remainingBalance: sched.remainingBalance, balloonPaid: sched.balloonPaid,
    financedAmount,
    payment: sched.payment,
    totalInterest: sched.totalInterest,
    totalCost: financedAmount + sched.totalInterest + prepaidFees,
    schedule: sched.schedule,
    costBreakdown,
  }
}

export function explainLoan(input: LoanInput, result: LoanResult): CalculationExplanation {
  const steps: CalculationExplanation['steps'] = []
  const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const ppy = periodsPerYear(input.paymentFrequency)
  const periods = termToPeriods(input.term, input.termUnit, input.paymentFrequency)
  const rate = annualToPeriodic(input.interestRate / 100, ppy)
  if (input.mode === 'auto') {
    const price = input.vehiclePrice ?? 0
    steps.push({
      label: 'Amount financed',
      expression: `${money(price)} + tax ${money(price * ((input.salesTaxRate ?? 0) / 100))} + fees ${money(input.taxableFees ?? 0)} − down ${money(input.cashDown ?? 0)} − trade-in ${money(input.tradeIn ?? 0)} − rebates ${money(input.rebates ?? 0)}`,
      result: money(result.financedAmount),
    })
  }
  steps.push(
    { label: 'Periodic rate', expression: `r = ${input.interestRate}% / ${ppy} = ${(rate * 100).toFixed(4)}%` },
    {
      label: 'Payment',
      expression: `PMT = ${money(result.financedAmount)} × r(1+r)^${periods} / ((1+r)^${periods} − 1), r = ${rate.toFixed(6)}`,
      result: `${money(result.payment)} per period`,
    },
  )
  if (input.balloon) {
    steps.push({
      label: 'Balloon',
      expression: `The last period pays the remaining principal, including a balloon of ${money(input.balloon)}.`,
    })
  }
  return {
    title: input.mode === 'auto' ? 'Auto loan calculation' : 'Loan calculation',
    steps,
    assumptions: [
      ...(input.mode === 'auto'
        ? ['Sales tax is applied to vehicle price only. Financed fees are added to principal but not taxed in this model. Prepaid `fees` apply to standard loans only.']
        : ['Optional prepaid fees are included in total cost but not financed.']),
      ...(input.extraPayment ? ['Extra payments are applied every period and shorten the schedule.'] : []),
    ],
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
      { key: 'date', label: 'Date', align: 'left' },
      { key: 'extraPrincipal', label: 'Extra principal', align: 'right', format: 'currency' },
      { key: 'payment', label: 'Payment', align: 'right', format: 'currency' },
      { key: 'principal', label: 'Principal', align: 'right', format: 'currency' },
      { key: 'interest', label: 'Interest', align: 'right', format: 'currency' },
      { key: 'balance', label: 'Balance', align: 'right', format: 'currency' },
    ],
    rows: result.schedule.map((r) => ({ ...r })),
  }
}
