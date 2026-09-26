import { describe, expect, it } from 'vitest'
import Decimal from 'decimal.js'
import { buildMortgageCharts, calculateMortgage } from './calculate'
import { mortgageScheduleTable } from './insights'
import { validateMortgage } from './validation'
import { captureProvenance, snapshotCurrency } from '@/exports/provenance'
import { resultMetadata } from '@/exports/resultMetadata'
import { DEFAULT_SETTINGS } from '@/calculators/types'
import type { MortgageInput } from './types'

const base: MortgageInput = {
  country: 'US', homePrice: 500000, downPayment: 20, downPaymentIsPercent: true, interestRate: 6.5,
  termYears: 30, termMonths: 0, includeTaxesAndCosts: true, propertyTax: 6000, propertyTaxPeriod: 'annual',
  homeInsurance: 150, hoa: 210, pmi: 80, otherCosts: 120, includeExtraPayments: false,
  startYear: 2026, startMonth: 9, monthlyExtraPayment: 0, yearlyExtraPayment: 0, oneTimeExtraPayments: [],
}

// Independent monthly ledger: decimal arithmetic, no production rate, payment or schedule helpers.
function reference(input: MortgageInput) {
  const D = Decimal.clone({ precision: 35, rounding: Decimal.ROUND_HALF_UP })
  const round = (value: Decimal) => value.toDecimalPlaces(2)
  const down = input.downPaymentIsPercent ? new D(input.homePrice).mul(input.downPayment).div(100) : new D(input.downPayment)
  const principal = round(new D(input.homePrice).minus(down))
  const rate = input.country === 'US' ? new D(input.interestRate).div(1200) : new D(1).add(new D(input.interestRate).div(200)).pow(new D(1).div(6)).minus(1)
  const months = input.termYears * 12 + input.termMonths
  const payment = round(rate.isZero() ? principal.div(months) : principal.mul(rate).div(new D(1).minus(new D(1).add(rate).pow(-months))))
  let balance = principal, totalInterest = new D(0), totalPaid = new D(0)
  const rows: { period: number; payment: number; interest: number; balance: number; extra: number }[] = []
  for (let period = 1; period <= months && balance.gt(0); period++) {
    const interest = round(balance.mul(rate))
    const due = balance.add(interest)
    const installment = period === months ? due : D.min(payment, due)
    balance = round(due.minus(installment))
    const index = (input.startYear ?? 2026) * 12 + (input.startMonth ?? 1) - 1 + period - 1
    const oneTime = (input.oneTimeExtraPayments ?? []).filter(extra => extra.year * 12 + extra.month - 1 === index).reduce((sum, extra) => sum + extra.amount, 0)
    const requestedExtra = input.includeExtraPayments ? (input.monthlyExtraPayment ?? 0) + (period % 12 === 0 ? input.yearlyExtraPayment ?? 0 : 0) + oneTime : 0
    const extra = round(D.min(balance, requestedExtra))
    balance = round(balance.minus(extra))
    totalInterest = totalInterest.add(interest)
    totalPaid = totalPaid.add(installment).add(extra)
    rows.push({ period, payment: installment.add(extra).toNumber(), interest: interest.toNumber(), balance: balance.toNumber(), extra: extra.toNumber() })
  }
  return { rows, payment: payment.toNumber(), interest: totalInterest.toNumber(), total: totalPaid.toNumber() }
}

const cases: [string, Partial<MortgageInput>][] = [
  ['standard 30-year', {}],
  ['zero interest', { interestRate: 0 }],
  ['near-zero interest', { interestRate: 0.00000001 }],
  ['50-year limit', { termYears: 50, interestRate: 12 }],
  ['one month', { termYears: 0, termMonths: 1 }],
  ['partial year', { termYears: 7, termMonths: 5, interestRate: 4.29 }],
  ['fractional price and percentage', { homePrice: 687432.17, downPayment: 17.37, interestRate: 5.73 }],
  ['monthly extra', { includeExtraPayments: true, monthlyExtraPayment: 350 }],
  ['annual extra', { includeExtraPayments: true, yearlyExtraPayment: 10000 }],
  ['combined extras', { includeExtraPayments: true, monthlyExtraPayment: 237, yearlyExtraPayment: 3521, oneTimeExtraPayments: [{ amount: 8213.42, year: 2027, month: 2 }, { amount: 7200, year: 2028, month: 9 }] }],
  ['same-month extras capped at balance', { includeExtraPayments: true, monthlyExtraPayment: 200000, oneTimeExtraPayments: [{ amount: 900000, year: 2026, month: 9 }, { amount: 500, year: 2026, month: 9 }] }],
  ['last-month lump sum', { termYears: 1, includeExtraPayments: true, oneTimeExtraPayments: [{ amount: 10000, year: 2027, month: 8 }] }],
]

describe.each(['US', 'CA'] as const)('%s independently verified mortgage arithmetic', country => {
  it.each(cases)('%s reconciles every month to an independent decimal ledger', (_name, changes) => {
    const input = { ...base, ...changes, country }
    expect(validateMortgage(input).valid).toBe(true)
    const expected = reference(input)
    const result = calculateMortgage(input)
    const monthly = mortgageScheduleTable(result, false).rows
    expect(result.principalAndInterest).toBeCloseTo(expected.payment, 2)
    expect(result.totalInterest).toBeCloseTo(expected.interest, 2)
    expect(result.totalPayments).toBeCloseTo(expected.total, 2)
    expect(monthly).toHaveLength(expected.rows.length)
    monthly.forEach((actual, i) => {
      expect(actual.payment, `payment ${i + 1}`).toBeCloseTo(expected.rows[i].payment, 2)
      expect(actual.interest, `interest ${i + 1}`).toBeCloseTo(expected.rows[i].interest, 2)
      expect(actual.balance, `balance ${i + 1}`).toBeCloseTo(expected.rows[i].balance, 2)
      expect(actual.extraPrincipal, `extra ${i + 1}`).toBeCloseTo(expected.rows[i].extra, 2)
    })
    expect(result.totalLifetimeCost).toBeCloseTo(result.totalPayments + 1060 * result.payoffPeriod, 2)
    expect(result.remainingBalance).toBe(0)
    expect(result.finalPayment).toBeCloseTo(expected.rows.at(-1)!.payment, 2)
    const chart = buildMortgageCharts(result).find(chart => chart.title === 'Remaining balance')!
    expect(chart.series[0].data).toHaveLength(monthly.length + 1)
    chart.series[0].data.slice(1).forEach((point, i) => expect(point.y).toBe(monthly[i].balance))
  })
})

describe('mortgage validation and currency', () => {
  it.each(['homePrice', 'downPayment', 'propertyTax', 'homeInsurance', 'hoa', 'pmi', 'otherCosts', 'monthlyExtraPayment', 'yearlyExtraPayment'])('rejects non-finite %s before calculation', field => {
    expect(validateMortgage({ ...base, [field]: Infinity }).valid).toBe(false)
    expect(validateMortgage({ ...base, [field]: NaN }).valid).toBe(false)
  })
  it('rejects a loan smaller than one cent', () => {
    expect(validateMortgage({ ...base, homePrice: 100, downPaymentIsPercent: false, downPayment: 99.999 }).valid).toBe(false)
    expect(validateMortgage({ ...base, homePrice: 1000, downPaymentIsPercent: false, downPayment: 999.99 }).valid).toBe(true)
  })
  it('uses app currency for mortgages and preserves explicit codes in exported data', () => {
    const result = calculateMortgage(base)
    const metadata = resultMetadata('mortgage', result)
    const p = captureProvenance('mortgage', { ...base, country: 'CA' }, metadata, { ...DEFAULT_SETTINGS, currency: 'EUR' }, result)
    expect(p.currency).toBe('EUR')
    expect(snapshotCurrency(100, p)).toBe('EUR 100.00')
    expect(snapshotCurrency(100, p, 'symbol')).toBe('€100.00')
    expect(captureProvenance('income-tax', { country: 'CA' }, metadata, { ...DEFAULT_SETTINGS, currency: 'EUR' }, {}).currency).toBe('CAD')
  })
})
