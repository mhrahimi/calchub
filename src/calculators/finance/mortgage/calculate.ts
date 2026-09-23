import { usMonthlyRate, canadianMonthlyRate } from '@/utils/annuity'
import { buildAmortizationSchedule, compareSchedules } from '@/utils/amortization'
import type { CostSlice, MortgageInput, MortgageResult } from './types'
import type { CalculationExplanation, ChartData, TableData } from '@/calculators/types'

function withPercents(items: { label: string; amount: number }[]): CostSlice[] {
  const total = items.reduce((s, i) => s + i.amount, 0)
  if (total <= 0) return items.map((i) => ({ ...i, percent: 0 }))
  return items.map((i) => ({
    ...i,
    percent: (i.amount / total) * 100,
  }))
}

function effectiveHousingExtras(input: MortgageInput) {
  if (!input.includeTaxesAndCosts) {
    return {
      propertyTax: 0,
      homeInsurance: 0,
      hoa: 0,
      pmi: 0,
      otherCosts: 0,
    }
  }
  return {
    propertyTax: input.propertyTax,
    homeInsurance: input.homeInsurance,
    hoa: input.hoa,
    pmi: input.pmi,
    otherCosts: input.otherCosts,
  }
}

export function calculateMortgage(input: MortgageInput): MortgageResult {
  const downPaymentAmount = input.downPaymentIsPercent
    ? (input.homePrice * input.downPayment) / 100
    : input.downPayment
  const loanAmount = input.homePrice - downPaymentAmount
  const periods = input.termYears * 12 + input.termMonths
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

  const extraPayment =
    input.includeExtraPayments && input.extraPayment && input.extraPayment > 0
      ? input.extraPayment
      : 0
  const extraFrequency = input.extraFrequency ?? 'every'

  if (extraPayment > 0) {
    const accelerated = buildAmortizationSchedule({
      principal: loanAmount,
      ratePerPeriod: monthlyRate,
      periods,
      extraPayment,
      extraFrequency,
    })
    const cmp = compareSchedules(baseline, accelerated)
    interestSaved = cmp.interestSaved
    periodsSaved = cmp.periodsSaved
    scheduleResult = accelerated
  }

  const extras = effectiveHousingExtras(input)
  const monthlyTax =
    input.propertyTaxPeriod === 'annual' ? extras.propertyTax / 12 : extras.propertyTax

  const first = scheduleResult.schedule[0]
  const firstPaymentPrincipal = first?.principal ?? 0
  const firstPaymentInterest = first?.interest ?? 0

  const monthlyPieces = [
    { label: 'Principal', amount: firstPaymentPrincipal },
    { label: 'Interest', amount: firstPaymentInterest },
    { label: 'Property tax', amount: monthlyTax },
    { label: 'Home insurance', amount: extras.homeInsurance },
    { label: 'HOA / strata', amount: extras.hoa },
    { label: 'PMI', amount: extras.pmi },
    { label: 'Other', amount: extras.otherCosts },
  ].filter((b) => b.amount > 0)

  const housingBreakdown = [
    { label: 'Principal & interest', amount: baseline.payment },
    { label: 'Property tax', amount: monthlyTax },
    { label: 'Home insurance', amount: extras.homeInsurance },
    { label: 'HOA / strata', amount: extras.hoa },
    { label: 'PMI', amount: extras.pmi },
    { label: 'Other', amount: extras.otherCosts },
  ].filter((b) => b.amount > 0)

  const totalMonthlyHousing = housingBreakdown.reduce((s, b) => s + b.amount, 0)
  const monthlyBreakdown = withPercents(monthlyPieces)

  const payoffMonths = scheduleResult.payoffPeriod
  const totalPrincipalPaid = scheduleResult.schedule.reduce((s, r) => s + r.principal + r.extraPrincipal, 0)
  const totalInterest = scheduleResult.totalInterest
  const totalTax = monthlyTax * payoffMonths
  const totalInsurance = extras.homeInsurance * payoffMonths
  const totalHoa = extras.hoa * payoffMonths
  const totalPmi = extras.pmi * payoffMonths
  const totalOther = extras.otherCosts * payoffMonths
  const totalLifetimeExtras = totalTax + totalInsurance + totalHoa + totalPmi + totalOther
  const totalLifetimeCost =
    scheduleResult.totalPayments + totalLifetimeExtras

  const lifetimeBreakdown = withPercents(
    [
      { label: 'Principal', amount: totalPrincipalPaid },
      { label: 'Interest', amount: totalInterest },
      { label: 'Property tax', amount: totalTax },
      { label: 'Home insurance', amount: totalInsurance },
      { label: 'HOA / strata', amount: totalHoa },
      { label: 'PMI', amount: totalPmi },
      { label: 'Other', amount: totalOther },
    ].filter((b) => b.amount > 0),
  )

  return {
    loanAmount,
    downPaymentAmount,
    principalAndInterest: baseline.payment,
    firstPaymentPrincipal,
    firstPaymentInterest,
    totalMonthlyHousing,
    totalInterest,
    totalPrincipalPaid,
    totalPayments: scheduleResult.totalPayments,
    totalLifetimeExtras,
    totalLifetimeCost,
    payoffPeriod: scheduleResult.payoffPeriod,
    monthlyRate,
    monthlyBreakdown,
    lifetimeBreakdown,
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
      { label: 'Down payment', result: `$${result.downPaymentAmount.toFixed(2)}` },
      { label: 'Loan amount', result: `$${result.loanAmount.toFixed(2)}` },
      { label: 'Periodic rate', expression: rateNote },
      { label: 'Principal & interest', result: `$${result.principalAndInterest.toFixed(2)}/month` },
      {
        label: 'First payment mix',
        result: `Principal $${result.firstPaymentPrincipal.toFixed(2)} · Interest $${result.firstPaymentInterest.toFixed(2)}`,
      },
      { label: 'Total housing cost', result: `$${result.totalMonthlyHousing.toFixed(2)}/month` },
      {
        label: 'Lifetime cost while loan is outstanding',
        result: `$${result.totalLifetimeCost.toFixed(2)}`,
      },
    ],
    assumptions: [
      'Taxes, insurance, and fees are estimates held constant each month.',
      'First-month principal/interest split uses the amortization schedule.',
    ],
  }
}

export function buildMortgageCharts(result: MortgageResult): ChartData[] {
  const yearly = new Map<number, { principal: number; interest: number }>()
  for (const row of result.schedule) {
    const year = Math.ceil(row.period / 12)
    const entry = yearly.get(year) ?? { principal: 0, interest: 0 }
    entry.principal += row.principal + (row.extraPrincipal ?? 0)
    entry.interest += row.interest
    yearly.set(year, entry)
  }
  const years = [...yearly.keys()].sort((a, b) => a - b)

  return [
    {
      type: 'pie',
      title: 'First month payment',
      valueFormat: 'currency',
      series: [
        {
          name: 'Cost',
          data: result.monthlyBreakdown.map((b) => ({ x: b.label, y: b.amount })),
        },
      ],
    },
    {
      type: 'pie',
      title: 'Lifetime cost breakdown',
      valueFormat: 'currency',
      series: [
        {
          name: 'Cost',
          data: result.lifetimeBreakdown.map((b) => ({ x: b.label, y: b.amount })),
        },
      ],
    },
    {
      type: 'area',
      title: 'Principal vs interest by year',
      stacked: true,
      valueFormat: 'currency',
      xLabel: 'Year',
      yLabel: 'Paid',
      series: [
        {
          name: 'Principal',
          color: '#163B8C',
          data: years.map((y) => ({ x: y, y: yearly.get(y)!.principal })),
        },
        {
          name: 'Interest',
          color: '#4A7FD4',
          data: years.map((y) => ({ x: y, y: yearly.get(y)!.interest })),
        },
      ],
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
