import { describe, it, expect } from 'vitest'
import { calculateMortgage } from './calculate'
import { usMonthlyRate, canadianMonthlyRate } from '@/utils/annuity'

describe('mortgage', () => {
  it('calculates US mortgage', () => {
    const r = calculateMortgage({
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
      hoa: 0,
      pmi: 0,
      otherCosts: 0,
    })
    expect(r.loanAmount).toBe(400000)
    expect(r.principalAndInterest).toBeCloseTo(2398.2, 0)
    expect(r.totalMonthlyHousing).toBeGreaterThan(r.principalAndInterest)
  })

  it('uses Canadian rate conversion', () => {
    const usRate = usMonthlyRate(0.06)
    const caRate = canadianMonthlyRate(0.06)
    expect(caRate).toBeLessThan(usRate)
    const ca = calculateMortgage({
      country: 'CA',
      homePrice: 500000,
      downPayment: 100000,
      downPaymentIsPercent: false,
      interestRate: 6,
      term: 30,
      termUnit: 'years',
      propertyTax: 0,
      propertyTaxPeriod: 'monthly',
      homeInsurance: 0,
      hoa: 0,
      pmi: 0,
      otherCosts: 0,
    })
    const us = calculateMortgage({
      country: 'US',
      homePrice: 500000,
      downPayment: 100000,
      downPaymentIsPercent: false,
      interestRate: 6,
      term: 30,
      termUnit: 'years',
      propertyTax: 0,
      propertyTaxPeriod: 'monthly',
      homeInsurance: 0,
      hoa: 0,
      pmi: 0,
      otherCosts: 0,
    })
    expect(ca.principalAndInterest).toBeLessThan(us.principalAndInterest)
  })
})
