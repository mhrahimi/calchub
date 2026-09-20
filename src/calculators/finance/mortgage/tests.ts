import { describe, it, expect } from 'vitest'
import { calculateMortgage, buildMortgageCharts } from './calculate'
import { usMonthlyRate, canadianMonthlyRate } from '@/utils/annuity'
import type { MortgageInput } from './types'

const base: MortgageInput = {
  country: 'US',
  homePrice: 500000,
  downPayment: 100000,
  downPaymentIsPercent: false,
  interestRate: 6,
  term: 30,
  termUnit: 'years',
  propertyTax: 6000,
  propertyTaxPeriod: 'annual',
  homeInsurance: 150,
  includeMiscCosts: false,
  hoa: 0,
  pmi: 0,
  otherCosts: 0,
}

describe('mortgage', () => {
  it('calculates US mortgage', () => {
    const r = calculateMortgage(base)
    expect(r.loanAmount).toBe(400000)
    expect(r.principalAndInterest).toBeCloseTo(2398.2, 0)
    expect(r.totalMonthlyHousing).toBeGreaterThan(r.principalAndInterest)
    expect(r.firstPaymentPrincipal + r.firstPaymentInterest).toBeCloseTo(r.principalAndInterest, 1)
  })

  it('uses Canadian rate conversion', () => {
    const usRate = usMonthlyRate(0.06)
    const caRate = canadianMonthlyRate(0.06)
    expect(caRate).toBeLessThan(usRate)
    const ca = calculateMortgage({ ...base, country: 'CA', propertyTax: 0, homeInsurance: 0 })
    const us = calculateMortgage({ ...base, propertyTax: 0, homeInsurance: 0 })
    expect(ca.principalAndInterest).toBeLessThan(us.principalAndInterest)
  })

  it('ignores HOA/PMI/other unless includeMiscCosts is on', () => {
    const hidden = calculateMortgage({
      ...base,
      includeMiscCosts: false,
      hoa: 200,
      pmi: 100,
      otherCosts: 50,
    })
    const shown = calculateMortgage({
      ...base,
      includeMiscCosts: true,
      hoa: 200,
      pmi: 100,
      otherCosts: 50,
    })
    expect(hidden.totalMonthlyHousing).toBeLessThan(shown.totalMonthlyHousing)
    expect(hidden.monthlyBreakdown.some((b) => b.label === 'HOA / strata')).toBe(false)
    expect(shown.monthlyBreakdown.some((b) => b.label === 'HOA / strata')).toBe(true)
    expect(shown.totalMonthlyHousing - hidden.totalMonthlyHousing).toBeCloseTo(350, 5)
  })

  it('reports principal/interest percentages for the first month', () => {
    const r = calculateMortgage(base)
    const principal = r.monthlyBreakdown.find((b) => b.label === 'Principal')
    const interest = r.monthlyBreakdown.find((b) => b.label === 'Interest')
    expect(principal).toBeTruthy()
    expect(interest).toBeTruthy()
    expect((principal?.percent ?? 0) + (interest?.percent ?? 0)).toBeLessThan(100)
    expect(r.lifetimeBreakdown.find((b) => b.label === 'Principal')?.percent).toBeGreaterThan(0)
    expect(r.lifetimeBreakdown.find((b) => b.label === 'Interest')?.percent).toBeGreaterThan(0)
    const pctSum = r.lifetimeBreakdown.reduce((s, b) => s + b.percent, 0)
    expect(pctSum).toBeCloseTo(100, 0)
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
