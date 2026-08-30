import { describe, it, expect } from 'vitest'
import { calculateSalary } from './calculate'

describe('salary', () => {
  it('converts hourly to annual', () => {
    const r = calculateSalary({
      mode: 'conversion',
      amount: 50,
      fromFrequency: 'hourly',
      toFrequency: 'annual',
      hoursPerWeek: 40,
      weeksPerYear: 52,
    })
    expect(r.annualGross).toBe(104000)
    expect(r.convertedAmount).toBe(104000)
  })

  it('converts annual to monthly', () => {
    const r = calculateSalary({
      mode: 'conversion',
      amount: 120000,
      fromFrequency: 'annual',
      toFrequency: 'monthly',
    })
    expect(r.convertedAmount).toBe(10000)
  })

  it('estimates take-home for US Texas (no state tax)', () => {
    const r = calculateSalary({
      mode: 'take-home',
      amount: 100000,
      fromFrequency: 'annual',
      toFrequency: 'monthly',
      country: 'US',
      jurisdictionId: 'texas',
      filingStatus: 'single',
    })
    expect(r.regionalTax).toBe(0)
    expect(r.federalTax).toBeGreaterThan(0)
    expect(r.payrollTotal).toBeGreaterThan(0)
    expect(r.estimatedNetAnnual).toBeLessThan(100000)
    expect(r.waterfall?.length).toBeGreaterThan(3)
  })

  it('estimates take-home for Canada Ontario', () => {
    const r = calculateSalary({
      mode: 'take-home',
      amount: 80000,
      fromFrequency: 'annual',
      toFrequency: 'biweekly',
      country: 'CA',
      jurisdictionId: 'ontario',
    })
    expect(r.federalTax).toBeGreaterThan(0)
    expect(r.regionalTax).toBeGreaterThan(0)
    expect(r.payrollTotal).toBeGreaterThan(0)
  })
})
