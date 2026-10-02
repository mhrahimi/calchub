import { describe, it, expect } from 'vitest'
import { calculateLoan } from './calculate'

describe('loan', () => {
  it('handles zero interest', () => {
    const r = calculateLoan({
      mode: 'standard',
      loanAmount: 12000,
      interestRate: 0,
      term: 1,
      termUnit: 'years',
      paymentFrequency: 'monthly',
    })
    expect(r.payment).toBe(1000)
  })

  it('calculates auto loan financed amount', () => {
    const r = calculateLoan({
      mode: 'auto',
      vehiclePrice: 35000,
      cashDown: 5000,
      tradeIn: 8000,
      rebates: 1000,
      salesTaxRate: 8,
      taxableFees: 500,
      interestRate: 5.9,
      term: 5,
      termUnit: 'years',
      paymentFrequency: 'monthly',
    })
    expect(r.financedAmount).toBe(35000 + 500 + 35000 * 0.08 - 5000 - 8000 - 1000)
    expect(r.payment).toBeGreaterThan(0)
    // Prepaid `fees` must not double-count auto financed taxableFees in totalCost
    expect(r.totalCost).toBeCloseTo(r.financedAmount + r.totalInterest, 2)
  })

  it('ignores prepaid fees field in auto mode total cost', () => {
    const base = {
      mode: 'auto' as const,
      vehiclePrice: 20000,
      salesTaxRate: 0,
      taxableFees: 1000,
      interestRate: 0,
      term: 1,
      termUnit: 'years' as const,
      paymentFrequency: 'monthly',
    }
    const without = calculateLoan(base)
    const withFees = calculateLoan({ ...base, fees: 999 })
    expect(withFees.financedAmount).toBe(without.financedAmount)
    expect(withFees.totalCost).toBe(without.totalCost)
  })
})
