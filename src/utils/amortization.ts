export interface AmortizationRow {
  period: number
  date?: string
  payment: number
  principal: number
  interest: number
  extraPrincipal: number
  balance: number
}

export interface AmortizationOptions {
  principal: number
  ratePerPeriod: number
  periods: number
  payment?: number
  extraPayment?: number
  extraFrequency?: 'every' | 'monthly' | 'yearly' | 'once'
  startDate?: Date
  balloon?: number
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  const day = d.getDate()
  d.setMonth(d.getMonth() + months)
  if (d.getDate() !== day) d.setDate(0)
  return d
}

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function buildAmortizationSchedule(options: AmortizationOptions): {
  schedule: AmortizationRow[]
  payment: number
  totalInterest: number
  totalPayments: number
  payoffPeriod: number
} {
  const {
    principal,
    ratePerPeriod,
    periods,
    extraPayment = 0,
    extraFrequency = 'every',
    startDate,
    balloon = 0,
  } = options

  let payment = options.payment
  if (payment === undefined) {
    if (ratePerPeriod === 0) {
      payment = (principal - balloon) / periods
    } else {
      const r = ratePerPeriod
      const n = periods
      const factor = Math.pow(1 + r, n)
      const pvBalloon = balloon / factor
      payment = ((principal - pvBalloon) * r * factor) / (factor - 1)
    }
  }

  const schedule: AmortizationRow[] = []
  let balance = principal
  let totalInterest = 0
  let totalPayments = 0
  let period = 0
  const maxPeriods = periods + 600

  while (balance > 0.005 && period < maxPeriods) {
    period++
    const interest = balance * ratePerPeriod
    let extra = 0

    if (extraPayment > 0) {
      if (extraFrequency === 'every') extra = extraPayment
      else if (extraFrequency === 'monthly') extra = extraPayment
      else if (extraFrequency === 'yearly' && period % 12 === 0) extra = extraPayment
      else if (extraFrequency === 'once' && period === 1) extra = extraPayment
    }

    let principalPortion = payment - interest
    if (period === periods && balloon > 0) {
      principalPortion = balance - balloon
    }

    let totalPayment = payment + extra
    if (balance + interest <= totalPayment + 0.005) {
      totalPayment = balance + interest
      principalPortion = balance
      extra = Math.max(0, totalPayment - payment - interest)
      if (extra < 0) extra = 0
      principalPortion = Math.min(balance, payment - interest + Math.max(0, extra))
      totalPayment = interest + principalPortion + extra
    }

    principalPortion = Math.max(0, Math.min(principalPortion, balance))
    balance = Math.max(0, balance - principalPortion - extra)
    totalInterest += interest
    totalPayments += totalPayment

    const rowDate = startDate ? addMonths(startDate, period - 1) : undefined

    schedule.push({
      period,
      date: rowDate ? formatDate(rowDate) : undefined,
      payment: round2(totalPayment),
      principal: round2(principalPortion),
      interest: round2(interest),
      extraPrincipal: round2(extra),
      balance: round2(balance),
    })

    if (balance <= 0.005) break
  }

  return {
    schedule,
    payment: round2(payment),
    totalInterest: round2(totalInterest),
    totalPayments: round2(totalPayments),
    payoffPeriod: period,
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function compareSchedules(
  baseline: ReturnType<typeof buildAmortizationSchedule>,
  accelerated: ReturnType<typeof buildAmortizationSchedule>,
): { interestSaved: number; periodsSaved: number } {
  return {
    interestSaved: round2(baseline.totalInterest - accelerated.totalInterest),
    periodsSaved: baseline.payoffPeriod - accelerated.payoffPeriod,
  }
}
