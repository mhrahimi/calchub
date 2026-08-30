import { describe, it, expect } from 'vitest'
import { calculateRetirement } from './calculate'
import { validateRetirement } from './validation'

describe('retirement', () => {
  it('rejects retirement age not greater than current age', () => {
    const v = validateRetirement({
      currentAge: 40,
      retirementAge: 40,
      currentSavings: 100000,
      annualContribution: 10000,
      contributionGrowth: 0,
      expectedReturn: 7,
      inflation: 2.5,
      retirementSpending: 60000,
      retirementDuration: 25,
      otherRetirementIncome: 0,
    })
    expect(v.valid).toBe(false)
    if (!v.valid) {
      expect(v.errors.retirementAge).toMatch(/greater than/)
    }
  })

  it('projects accumulation and shortfall/surplus', () => {
    const r = calculateRetirement({
      currentAge: 35,
      retirementAge: 65,
      currentSavings: 50000,
      annualContribution: 15000,
      contributionGrowth: 2,
      expectedReturn: 7,
      inflation: 2.5,
      retirementSpending: 70000,
      retirementDuration: 25,
      otherRetirementIncome: 20000,
    })
    expect(r.yearsToRetirement).toBe(30)
    expect(r.projectedBalance).toBeGreaterThan(50000)
    expect(r.accumulation.length).toBe(30)
    expect(r.drawdown.length).toBe(25)
    expect(typeof r.shortfallOrSurplus).toBe('number')
  })
})
