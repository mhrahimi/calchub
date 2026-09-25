import { usMonthlyRate, canadianMonthlyRate } from '@/utils/annuity'
import { buildAmortizationSchedule, compareSchedules } from '@/utils/amortization'
import { calendarDate, dateText, eventDate } from '@/utils/cashFlowDates'
import type { CostSlice, MortgageInput, MortgageResult, PayoffOption } from './types'
import type { CalculationExplanation, ChartData, TableData } from '@/calculators/types'

function withPercents(items: { label: string; amount: number }[]): CostSlice[] {
  const total = items.reduce((s, i) => s + i.amount, 0)
  if (total <= 0) return items.map((i) => ({ ...i, percent: 0 }))
  return items.map((i) => ({
    ...i,
    percent: (i.amount / total) * 100,
  }))
}

function isoMonth(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}-01`
}

export function mortgageStartParts(input: Pick<MortgageInput, 'startYear' | 'startMonth'>) {
  const now = new Date()
  const startYear = input.startYear ?? now.getFullYear()
  const startMonth = input.startMonth ?? now.getMonth() + 1
  return { startYear, startMonth }
}

function positiveAmount(value?: number) {
  return value && value > 0 ? value : 0
}

function yearlyExtraDates(startDate: Date, periods: number) {
  const origin = eventDate(startDate, -1, 'monthly')
  const maturity = eventDate(startDate, periods - 1, 'monthly')
  const dates: string[] = []
  for (let i = 1; ; i++) {
    const date = eventDate(origin, i, 'annual')
    if (date > maturity) break
    dates.push(dateText(date))
  }
  return dates
}

function mortgageExtras(input: MortgageInput, periods: number, startDate: Date) {
  if (!input.includeExtraPayments) {
    return { monthly: 0, dated: [] as { date: string; amount: number }[] }
  }
  const frequency = input.extraFrequency ?? 'every'
  const legacy = positiveAmount(input.extraPayment)
  const monthly =
    input.monthlyExtraPayment != null
      ? positiveAmount(input.monthlyExtraPayment)
      : frequency === 'every'
        ? legacy
        : 0
  const yearly =
    input.yearlyExtraPayment != null
      ? positiveAmount(input.yearlyExtraPayment)
      : frequency === 'yearly'
        ? legacy
        : 0
  const dated = [
    ...(yearly > 0 ? yearlyExtraDates(startDate, periods).map((date) => ({ date, amount: yearly })) : []),
    ...(input.oneTimeExtraPayments ?? [])
      .filter((payment) => payment.amount > 0)
      .map((payment) => ({
        date: isoMonth(payment.year, payment.month),
        amount: payment.amount,
      })),
  ].filter((payment) => payment.amount > 0)

  if (
    dated.length === 0 &&
    input.oneTimeExtraPayments == null &&
    frequency === 'once' &&
    legacy > 0 &&
    input.monthlyExtraPayment == null &&
    input.yearlyExtraPayment == null
  ) {
    dated.push({ date: dateText(startDate), amount: legacy })
  }

  return { monthly, dated }
}

const PAYOFF_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function payoffYearTargets(remainingMonths: number): number[] {
  const high = Math.floor(remainingMonths / 12)
  if (high < 1) return []
  if (high === 1) return [1]
  const count = Math.min(6, high)
  const targets = new Set<number>([1, high])
  for (let i = 0; i < count; i++) {
    const year = high * Math.pow(1 / high, i / (count - 1))
    targets.add(Math.round(year))
  }
  return [...targets].filter((year) => year >= 1 && year <= high).sort((a, b) => b - a)
}

function paymentForPeriods(principal: number, rate: number, periods: number) {
  if (rate === 0) return principal / periods
  return (principal * rate) / (1 - Math.pow(1 + rate, -periods))
}

function payoffLabel(startDate: Date, payoffPeriod: number) {
  const date = eventDate(startDate, Math.max(0, payoffPeriod - 1), 'monthly')
  return `${PAYOFF_MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`
}

function buildPayoffOptions(
  principal: number,
  rate: number,
  periods: number,
  scheduledPayment: number,
  baselineInterest: number,
  startDate: Date,
): PayoffOption[] {
  if (principal <= 0 || periods < 12) return []
  return payoffYearTargets(periods).map((years) => {
    const targetMonths = years * 12
    if (targetMonths >= periods) {
      return {
        years,
        monthlyExtra: 0,
        yearlyExtra: 0,
        interestSaved: 0,
        totalExtraPaid: 0,
        payoffDate: payoffLabel(startDate, periods),
      }
    }

    let monthlyExtra = Math.max(0, Math.round(paymentForPeriods(principal, rate, targetMonths) - scheduledPayment))
    let monthlyRun = buildAmortizationSchedule({
      principal,
      ratePerPeriod: rate,
      periods,
      startDate,
      extraPayment: monthlyExtra,
      extraFrequency: 'every',
    })
    while (monthlyRun.payoffPeriod > targetMonths && monthlyExtra < principal) {
      monthlyExtra += 1
      monthlyRun = buildAmortizationSchedule({
        principal,
        ratePerPeriod: rate,
        periods,
        startDate,
        extraPayment: monthlyExtra,
        extraFrequency: 'every',
      })
    }

    let low = 0
    let high = Math.ceil(principal)
    while (low < high) {
      const mid = Math.floor((low + high) / 2)
      const yearlyDates = yearlyExtraDates(startDate, periods)
      const run = buildAmortizationSchedule({
        principal,
        ratePerPeriod: rate,
        periods,
        startDate,
        extraPayments: mid > 0 ? yearlyDates.map((date) => ({ date, amount: mid })) : [],
      })
      if (run.payoffPeriod <= targetMonths) high = mid
      else low = mid + 1
    }
    const yearlyExtra = low
    const yearlyRun = buildAmortizationSchedule({
      principal,
      ratePerPeriod: rate,
      periods,
      startDate,
      extraPayments: yearlyExtra > 0 ? yearlyExtraDates(startDate, periods).map((date) => ({ date, amount: yearlyExtra })) : [],
    })
    const interestSaved = Math.max(0, Math.round(baselineInterest - monthlyRun.totalInterest))
    const totalExtraPaid = Math.round(
      monthlyRun.schedule.reduce((sum, row) => sum + row.extraPrincipal, 0),
    )
    return {
      years,
      monthlyExtra,
      yearlyExtra,
      interestSaved,
      totalExtraPaid,
      payoffDate: payoffLabel(startDate, monthlyRun.payoffPeriod),
    }
  })
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

  const { startYear, startMonth } = mortgageStartParts(input)
  const startDate = calendarDate(isoMonth(startYear, startMonth))

  const baseline = buildAmortizationSchedule({
    principal: loanAmount,
    ratePerPeriod: monthlyRate,
    periods,
    startDate,
  })

  let scheduleResult = baseline
  let interestSaved: number | undefined
  let periodsSaved: number | undefined

  const extrasPaid = mortgageExtras(input, periods, startDate)

  if (extrasPaid.monthly > 0 || extrasPaid.dated.length > 0) {
    const accelerated = buildAmortizationSchedule({
      principal: loanAmount,
      ratePerPeriod: monthlyRate,
      periods,
      startDate,
      extraPayment: extrasPaid.monthly,
      extraFrequency: 'every',
      extraPayments: extrasPaid.dated,
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
    payoffOptions: buildPayoffOptions(
      loanAmount,
      monthlyRate,
      periods,
      baseline.payment,
      baseline.totalInterest,
      startDate,
    ),
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
