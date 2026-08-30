import { describe, it, expect } from 'vitest'
import { calculateDti } from './calculate'

describe('dti', () => {
  it('calculates front and back end', () => {
    const r = calculateDti({
      grossMonthlyIncome: 8000,
      housingCost: 2000,
      debtPayments: 500,
      guideline: 43,
    })
    expect(r.frontEndDti).toBe(25)
    expect(r.backEndDti).toBe(31.25)
    expect(r.withinGuideline).toBe(true)
  })
})
