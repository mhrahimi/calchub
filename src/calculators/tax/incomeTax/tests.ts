import { describe, it, expect } from 'vitest'
import { calculateIncomeTax } from './calculate'

describe('income tax', () => {
  it('handles zero taxable income', () => {
    const r = calculateIncomeTax({
      country: 'US',
      taxYear: 2026,
      jurisdictionId: 'texas',
      filingStatus: 'single',
      grossIncome: 10000,
      pretaxDeductions: 0,
      useStandardDeduction: true,
    })
    expect(r.taxableIncome).toBe(0)
    expect(r.totalTax).toBe(0)
  })

  it('computes US federal + no-tax state', () => {
    const r = calculateIncomeTax({
      country: 'US',
      taxYear: 2026,
      jurisdictionId: 'texas',
      filingStatus: 'single',
      grossIncome: 100000,
      pretaxDeductions: 0,
      useStandardDeduction: true,
    })
    expect(r.taxableIncome).toBe(100000 - 16100)
    expect(r.regionalTax).toBe(0)
    expect(r.federalTax).toBeGreaterThan(0)
    expect(r.federalBreakdown.length).toBeGreaterThan(0)
  })

  it('computes Canada Ontario tax', () => {
    const r = calculateIncomeTax({
      country: 'CA',
      taxYear: 2026,
      jurisdictionId: 'ontario',
      filingStatus: 'single',
      grossIncome: 90000,
      pretaxDeductions: 0,
      useStandardDeduction: false,
    })
    expect(r.federalTax).toBeGreaterThan(0)
    expect(r.regionalTax).toBeGreaterThan(0)
    expect(r.effectiveRate).toBeGreaterThan(0)
    expect(r.marginalRate).toBeGreaterThan(0)
  })
})
