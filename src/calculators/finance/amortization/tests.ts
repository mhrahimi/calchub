import { describe, it, expect } from 'vitest'
import { calculateAmortization } from './calculate'

describe('amortization', () => {
  it('handles zero interest', () => {
    const result = calculateAmortization({
      principal: 12000,
      interestRate: 0,
      term: 1,
      termUnit: 'years',
      paymentFrequency: 'monthly',
    })
    expect(result.payment).toBe(1000)
    expect(result.totalInterest).toBe(0)
  })

  it('calculates standard amortization', () => {
    const result = calculateAmortization({
      principal: 200000,
      interestRate: 6,
      term: 30,
      termUnit: 'years',
      paymentFrequency: 'monthly',
    })
    expect(result.payment).toBeCloseTo(1199.1, 2)
    expect(result.schedule.length).toBe(360)
    expect(result.schedule[result.schedule.length - 1].balance).toBeLessThanOrEqual(0.01)
  })

  it('applies extra payments', () => {
    const base = calculateAmortization({
      principal: 200000,
      interestRate: 6,
      term: 30,
      termUnit: 'years',
      paymentFrequency: 'monthly',
    })
    const extra = calculateAmortization({
      principal: 200000,
      interestRate: 6,
      term: 30,
      termUnit: 'years',
      paymentFrequency: 'monthly',
      extraPayment: 200,
      extraFrequency: 'every',
    })
    expect(extra.payoffPeriod).toBeLessThan(base.payoffPeriod)
    expect(extra.totalInterest).toBeLessThan(base.totalInterest)
    expect(extra.interestSaved).toBeGreaterThan(0)
  })
})
