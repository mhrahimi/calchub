import { describe, it, expect } from 'vitest'
import { calculateInterestRate } from './calculate'
import { pmt } from '@/utils/annuity'

describe('interest rate', () => {
  it('reconstructs known rate', () => {
    const principal = 200000
    const rate = 0.06 / 12
    const periods = 360
    const payment = pmt(principal, rate, periods)
    const result = calculateInterestRate({
      principal,
      payment,
      term: 30,
      termUnit: 'years',
      paymentFrequency: 'monthly',
    })
    expect(result.annualRate).toBeCloseTo(0.06, 3)
  })
})
