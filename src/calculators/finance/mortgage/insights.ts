import { canadianMonthlyRate, usMonthlyRate } from '@/utils/annuity'
import type { TableData } from '@/calculators/types'
import type { MortgageInput, MortgageResult } from './types'

/** Preserve the actual down payment when changing display units. */
export function convertDownPayment(input: MortgageInput, toPercent: boolean): number {
  if (input.downPaymentIsPercent === toPercent) return input.downPayment
  return toPercent
    ? input.homePrice > 0 ? input.downPayment / input.homePrice * 100 : 0
    : input.homePrice * input.downPayment / 100
}

export function monthlyExtra(input: MortgageInput): number {
  if (!input.includeExtraPayments) return 0
  return input.monthlyExtraPayment ?? ((input.extraFrequency ?? 'every') === 'every' ? input.extraPayment ?? 0 : 0)
}

/** Hypothetical note rates, not lender quotes. Uses the same stable payment formula as the engine. */
export function rateScenarios(input: MortgageInput, principal: number) {
  const months = input.termYears * 12 + input.termMonths
  return [...new Set([Math.max(0, input.interestRate - 0.5), input.interestRate, input.interestRate + 0.5])].map(rate => {
    const monthly = input.country === 'CA' ? canadianMonthlyRate(rate / 100) : usMonthlyRate(rate / 100)
    const payment = monthly === 0 ? principal / months : principal * monthly / -Math.expm1(-months * Math.log1p(monthly))
    return { rate, payment: Math.round((payment + Number.EPSILON) * 100) / 100 }
  })
}

/** Extra payments are separate cash-flow events; aggregate flows and retain the last balance. */
export function mortgageScheduleTable(result: MortgageResult, annual: boolean): TableData {
  const groups = new Map<number, Record<string, string | number>>()
  for (const row of result.schedule) {
    const period = annual ? Math.ceil(row.period / 12) : row.period
    const group = groups.get(period) ?? { period, payment: 0, principal: 0, extraPrincipal: 0, interest: 0 }
    for (const key of ['payment', 'principal', 'extraPrincipal', 'interest'] as const) group[key] = Number(group[key]) + (row[key] ?? 0)
    group.balance = row.balance
    group.date = row.date ?? ''
    groups.set(period, group)
  }
  return {
    title: annual ? 'Annual repayment summary' : 'Monthly repayment schedule',
    columns: [
      { key: 'period', label: annual ? 'Loan year' : 'Month', align: 'right' },
      { key: 'date', label: annual ? 'Last payment' : 'Payment date', format: 'date' },
      { key: 'payment', label: 'Total paid', align: 'right', format: 'currency' },
      { key: 'principal', label: 'Principal', align: 'right', format: 'currency' },
      { key: 'extraPrincipal', label: 'Extra principal', align: 'right', format: 'currency' },
      { key: 'interest', label: 'Interest', align: 'right', format: 'currency' },
      { key: 'balance', label: 'Balance', align: 'right', format: 'currency' },
    ],
    rows: [...groups.values()],
  }
}

export function durationLabel(months: number): string {
  const years = Math.floor(months / 12)
  const remainder = months % 12
  return [years ? `${years} ${years === 1 ? 'year' : 'years'}` : '', remainder ? `${remainder} ${remainder === 1 ? 'month' : 'months'}` : ''].filter(Boolean).join(', ') || '0 months'
}
