import { describe, it, expect } from 'vitest'
import { calculateMortgage, buildMortgageCharts } from './calculate'
import { validateMortgage } from './validation'
import { usMonthlyRate, canadianMonthlyRate } from '@/utils/annuity'
import type { MortgageInput } from './types'

const base: MortgageInput = {
  country: 'US',
  homePrice: 500000,
  downPayment: 100000,
  downPaymentIsPercent: false,
  interestRate: 6,
  termYears: 30,
  termMonths: 0,
  includeTaxesAndCosts: false,
  propertyTax: 6000,
  propertyTaxPeriod: 'annual',
  homeInsurance: 150,
  hoa: 0,
  pmi: 0,
  otherCosts: 0,
  includeExtraPayments: false,
  extraPayment: 0,
  extraFrequency: 'every',
}

describe('mortgage', () => {
  it('calculates US mortgage', () => {
    const r = calculateMortgage(base)
    expect(r.loanAmount).toBe(400000)
    expect(r.principalAndInterest).toBeCloseTo(2398.2, 0)
    expect(r.totalMonthlyHousing).toBeCloseTo(r.principalAndInterest, 2)
    expect(r.firstPaymentPrincipal + r.firstPaymentInterest).toBeCloseTo(r.principalAndInterest, 1)
  })

  it('uses Canadian rate conversion', () => {
    const usRate = usMonthlyRate(0.06)
    const caRate = canadianMonthlyRate(0.06)
    expect(caRate).toBeLessThan(usRate)
    const ca = calculateMortgage({ ...base, country: 'CA' })
    const us = calculateMortgage(base)
    expect(ca.principalAndInterest).toBeLessThan(us.principalAndInterest)
  })

  it('ignores taxes and costs unless includeTaxesAndCosts is on', () => {
    const hidden = calculateMortgage({
      ...base,
      includeTaxesAndCosts: false,
      propertyTax: 6000,
      homeInsurance: 150,
      hoa: 200,
      pmi: 100,
      otherCosts: 50,
    })
    const shown = calculateMortgage({
      ...base,
      includeTaxesAndCosts: true,
      propertyTax: 6000,
      homeInsurance: 150,
      hoa: 200,
      pmi: 100,
      otherCosts: 50,
    })
    expect(hidden.totalMonthlyHousing).toBeCloseTo(hidden.principalAndInterest, 2)
    expect(hidden.monthlyBreakdown.some((b) => b.label === 'Property tax')).toBe(false)
    expect(shown.monthlyBreakdown.some((b) => b.label === 'Property tax')).toBe(true)
    expect(shown.monthlyBreakdown.some((b) => b.label === 'HOA / strata')).toBe(true)
    // tax 6000/12=500 + insurance 150 + hoa 200 + pmi 100 + other 50 = 1000
    expect(shown.totalMonthlyHousing - hidden.totalMonthlyHousing).toBeCloseTo(1000, 5)
  })

  it('ignores extra payments unless includeExtraPayments is on', () => {
    const without = calculateMortgage({
      ...base,
      includeExtraPayments: false,
      extraPayment: 500,
    })
    const withExtras = calculateMortgage({
      ...base,
      includeExtraPayments: true,
      extraPayment: 500,
      extraFrequency: 'every',
    })
    expect(without.interestSaved).toBeUndefined()
    expect(withExtras.interestSaved).toBeGreaterThan(0)
    expect(withExtras.periodsSaved).toBeGreaterThan(0)
    expect(withExtras.payoffPeriod).toBeLessThan(without.payoffPeriod)
  })

  it('combines term years and months into periods', () => {
    const fullYears = calculateMortgage({ ...base, termYears: 30, termMonths: 0 })
    const withMonths = calculateMortgage({ ...base, termYears: 29, termMonths: 12 })
    expect(withMonths.principalAndInterest).toBeCloseTo(fullYears.principalAndInterest, 2)
    expect(withMonths.payoffPeriod).toBe(fullYears.payoffPeriod)
  })

  it('reports principal/interest percentages for the first month', () => {
    const r = calculateMortgage(base)
    const principal = r.monthlyBreakdown.find((b) => b.label === 'Principal')
    const interest = r.monthlyBreakdown.find((b) => b.label === 'Interest')
    expect(principal).toBeTruthy()
    expect(interest).toBeTruthy()
    expect((principal?.percent ?? 0) + (interest?.percent ?? 0)).toBeCloseTo(100, 0)
    expect(r.lifetimeBreakdown.find((b) => b.label === 'Principal')?.percent).toBeGreaterThan(0)
    expect(r.lifetimeBreakdown.find((b) => b.label === 'Interest')?.percent).toBeGreaterThan(0)
    const pctSum = r.lifetimeBreakdown.reduce((s, b) => s + b.percent, 0)
    expect(pctSum).toBeCloseTo(100, 0)
  })

  it('starts the schedule on the selected month', () => {
    const r = calculateMortgage({ ...base, startYear: 2027, startMonth: 3 })
    expect((r.schedule[0] as { date?: string }).date).toBe('2027-03-01')
  })

  it('applies multiple one-time extra payments on their months', () => {
    const withExtras = calculateMortgage({
      ...base,
      startYear: 2026,
      startMonth: 1,
      includeExtraPayments: true,
      extraFrequency: 'once',
      oneTimeExtraPayments: [
        { amount: 1000, year: 2026, month: 3 },
        { amount: 2000, year: 2027, month: 1 },
      ],
    })
    const without = calculateMortgage({ ...base, startYear: 2026, startMonth: 1 })
    const applied = withExtras.schedule.filter((row) => (row.extraPrincipal ?? 0) > 0)
    expect(applied.map((row) => (row as { date?: string }).date)).toEqual(['2026-03-01', '2027-01-01'])
    expect(applied.map((row) => row.extraPrincipal)).toEqual([1000, 2000])
    expect(withExtras.interestSaved).toBeGreaterThan(0)
    expect(withExtras.totalInterest).toBeLessThan(without.totalInterest)
  })

  it('applies monthly, yearly, and one-time extras together', () => {
    const start = { startYear: 2026, startMonth: 1 }
    const monthlyOnly = calculateMortgage({
      ...base,
      ...start,
      includeExtraPayments: true,
      monthlyExtraPayment: 100,
    })
    const combined = calculateMortgage({
      ...base,
      ...start,
      includeExtraPayments: true,
      monthlyExtraPayment: 100,
      yearlyExtraPayment: 1000,
      oneTimeExtraPayments: [
        { amount: 500, year: 2026, month: 6 },
        { amount: 750, year: 2027, month: 3 },
      ],
    })
    const dated = combined.schedule.filter((row) => (row.extraPrincipal ?? 0) > 0)
    const byDate = (date: string) =>
      dated
        .filter((row) => (row as { date?: string }).date === date)
        .reduce((sum, row) => sum + (row.extraPrincipal ?? 0), 0)
    expect(byDate('2026-06-01')).toBe(600)
    expect(byDate('2027-03-01')).toBe(850)
    expect(byDate('2026-12-01')).toBe(1100)
    expect(combined.totalInterest).toBeLessThan(monthlyOnly.totalInterest)
    expect(combined.interestSaved).toBeGreaterThan(monthlyOnly.interestSaved ?? 0)
  })

  it('rejects one-time extras outside the loan term', () => {
    const result = validateMortgage({
      ...base,
      startYear: 2026,
      startMonth: 1,
      termYears: 1,
      termMonths: 0,
      includeExtraPayments: true,
      extraFrequency: 'once',
      oneTimeExtraPayments: [{ amount: 100, year: 2028, month: 1 }],
    })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.errors['oneTimeExtraPayments.0.month']).toMatch(/loan term/)
    }
  })

  it('lists extra payments that finish the loan in shorter whole years', () => {
    const r = calculateMortgage({ ...base, startYear: 2026, startMonth: 1 })
    expect(r.payoffOptions.map((option) => option.years)).toEqual([30, 25, 20, 15, 10, 5])
    const full = r.payoffOptions[0]
    expect(full.monthlyExtra).toBe(0)
    expect(full.yearlyExtra).toBe(0)
    expect(full.interestSaved).toBe(0)
    const shorter = r.payoffOptions.find((option) => option.years === 15)
    expect(shorter).toBeTruthy()
    expect(shorter!.monthlyExtra).toBeGreaterThan(0)
    expect(shorter!.yearlyExtra).toBeGreaterThan(shorter!.monthlyExtra)
    expect(shorter!.interestSaved).toBeGreaterThan(0)
    expect(shorter!.totalExtraPaid).toBeGreaterThan(0)
    expect(shorter!.payoffDate).toMatch(/2040|2041/)
  })

  it('builds payment, lifetime, and principal/interest charts', () => {
    const charts = buildMortgageCharts(calculateMortgage(base))
    expect(charts.map((c) => c.title)).toEqual([
      'First month payment',
      'Lifetime cost breakdown',
      'Principal vs interest by year',
      'Remaining balance',
    ])
  })
})
