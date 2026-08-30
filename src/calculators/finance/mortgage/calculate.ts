import { usMonthlyRate, canadianMonthlyRate, termToPeriods } from '@/utils/annuity'
import { buildAmortizationSchedule, compareSchedules } from '@/utils/amortization'
import type { MortgageInput, MortgageResult } from './types'
import type { CalculationExplanation, ChartData, TableData } from '@/calculators/types'

export function calculateMortgage(input: MortgageInput): MortgageResult {
  const down = input.downPaymentIsPercent
    ? (input.homePrice * input.downPayment) / 100
    : input.downPayment
  const loanAmount = input.homePrice - down
  const periods = termToPeriods(input.term, input.termUnit, 'monthly')
  const monthlyRate =
    input.country === 'CA'
      ? canadianMonthlyRate(input.interestRate / 100)
      : usMonthlyRate(input.interestRate / 100)

  const baseline = buildAmortizationSchedule({
    principal: loanAmount,
    ratePerPeriod: monthlyRate,
    periods,
  })

  let scheduleResult = baseline
  let interestSaved: number | undefined
  let periodsSaved: number | undefined

  if (input.extraPayment && input.extraPayment > 0) {
    const accelerated = buildAmortizationSchedule({
      principal: loanAmount,
      ratePerPeriod: monthlyRate,
      periods,
      extraPayment: input.extraPayment,
      extraFrequency: 'every',
    })
    const cmp = compareSchedules(baseline, accelerated)
    interestSaved = cmp.interestSaved
    periodsSaved = cmp.periodsSaved
    scheduleResult = accelerated
  }

  const monthlyTax =
    input.propertyTaxPeriod === 'annual' ? input.propertyTax / 12 : input.propertyTax
  const housingBreakdown = [
    { label: 'Principal & interest', amount: baseline.payment },
    { label: 'Property tax', amount: monthlyTax },
    { label: 'Home insurance', amount: input.homeInsurance },
    { label: 'HOA / strata', amount: input.hoa },
    { label: 'PMI', amount: input.pmi },
    { label: 'Other', amount: input.otherCosts },
  ].filter((b) => b.amount > 0)

  const totalMonthlyHousing = housingBreakdown.reduce((s, b) => s + b.amount, 0)

  return {
    loanAmount,
    principalAndInterest: baseline.payment,
    totalMonthlyHousing,
    totalInterest: scheduleResult.totalInterest,
    totalPayments: scheduleResult.totalPayments,
    payoffPeriod: scheduleResult.payoffPeriod,
    monthlyRate,
    housingBreakdown,
    schedule: scheduleResult.schedule,
    interestSaved,
    periodsSaved,
  }
}

export function explainMortgage(input: MortgageInput, result: MortgageResult): CalculationExplanation {
  const rateNote =
    input.country === 'CA'
      ? `Canadian monthly rate = (1 + j/2)^(2/12) - 1 = ${(result.monthlyRate * 100).toFixed(4)}%`
      : `US monthly rate = APR / 12 = ${(result.monthlyRate * 100).toFixed(4)}%`
  return {
    title: 'Mortgage calculation',
    steps: [
      { label: 'Loan amount', result: `$${result.loanAmount.toFixed(2)}` },
      { label: 'Periodic rate', expression: rateNote },
      { label: 'Principal & interest', result: `$${result.principalAndInterest.toFixed(2)}/month` },
      { label: 'Total housing cost', result: `$${result.totalMonthlyHousing.toFixed(2)}/month` },
    ],
    assumptions: ['Taxes, insurance, and fees are estimates.'],
  }
}

export function buildMortgageCharts(result: MortgageResult): ChartData[] {
  return [
    {
      type: 'pie',
      title: 'Monthly housing cost',
      valueFormat: 'currency',
      series: [{ name: 'Cost', data: result.housingBreakdown.filter((b) => b.amount > 0).map((b) => ({ x: b.label, y: b.amount })) }],
    },
    {
      type: 'line',
      title: 'Remaining balance',
      valueFormat: 'currency',
      series: [
        {
          name: 'Balance',
          data: result.schedule
            .filter((_, i) => i % 12 === 0 || i === result.schedule.length - 1)
            .map((r) => ({ x: r.period, y: r.balance })),
          color: '#163B8C',
        },
      ],
    },
  ]
}

export function buildMortgageTable(result: MortgageResult): TableData {
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
