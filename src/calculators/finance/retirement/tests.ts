import { describe, it, expect } from 'vitest'
import { calculateRetirement } from './calculate'
import { validateRetirement } from './validation'
import type { RetirementInput } from './types'

const simple: RetirementInput = {
  currentAge:64, retirementAge:65, currentSavings:0, annualContribution:0,
  contributionGrowth:0, expectedReturn:0, inflation:10,
  retirementSpending:100, retirementDuration:1, otherRetirementIncome:0,
}

describe('retirement', () => {
  it('funds the same nominal withdrawal stream used by drawdown', () => {
    const result = calculateRetirement(simple)
    expect(result.requiredBalance).toBe(110)
    expect(result.requiredAnnualContribution).toBe(110)
    expect(result.drawdown[0]).toMatchObject({plannedWithdrawal:110,withdrawal:0,unmetSpending:110,balance:0})
    expect(result.depletionAge).toBe(65)
    expect(result.totalUnmetSpending).toBe(110)
    const funded = calculateRetirement({...simple, annualContribution:result.requiredAnnualContribution})
    expect(funded.drawdown[0]).toMatchObject({withdrawal:110,unmetSpending:0,balance:0})
    expect(funded.status).toBe('success')
  })
  it('discounts a growing three-year stream and reports actual unmet spending', () => {
    const input = {...simple, inflation:0, expectedReturn:10, retirementDuration:3, currentSavings:0, annualContribution:100}
    // 100/1.1 + 100/1.1² + 100/1.1³ = 248.685..., at retirement.
    const result = calculateRetirement(input)
    expect(result.requiredBalance).toBe(248.69)
    expect(result.drawdown.map(row => row.withdrawal)).toEqual([100,23.1,0])
    expect(result.drawdown.map(row => row.unmetSpending)).toEqual([0,76.9,100])
    expect(result.totalUnmetSpending).toBe(176.9)
    expect(result.depletionAge).toBe(67)
  })
  it('solves the minimum even when the entered contribution creates a surplus', () => {
    expect(calculateRetirement({...simple,annualContribution:1000}).requiredAnnualContribution).toBe(110)
    expect(calculateRetirement({...simple,currentSavings:1000}).requiredAnnualContribution).toBe(0)
  })
  it('rejects finite inputs that overflow monetary calculations', () => {
    expect(() => calculateRetirement({...simple, currentSavings:1e308})).toThrow(/numerical range/)
  })
  it.each([-20, 0, 7])('required contributions fund withdrawals at %s%% return', (expectedReturn) => {
    const input = {...simple,currentAge:40,retirementAge:65,retirementDuration:25,inflation:2,expectedReturn,contributionGrowth:3,retirementSpending:20000}
    const required = calculateRetirement(input).requiredAnnualContribution
    const funded = calculateRetirement({...input,annualContribution:required})
    expect(funded.totalUnmetSpending).toBe(0)
    expect(funded.status).toBe('success')
  })
  it.each([{inflation:-100},{expectedReturn:-100},{annualContribution:Infinity},{retirementDuration:1e9},{currentAge:40.5}])('rejects unsafe assumptions %j', (patch) => {
    expect(validateRetirement({...simple,...patch}).valid).toBe(false)
    expect(() => calculateRetirement({...simple,...patch})).toThrow()
  })
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
