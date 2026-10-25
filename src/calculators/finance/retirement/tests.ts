import { describe, it, expect } from 'vitest'
import { calculateSalary } from '@/calculators/finance/salary/calculate'
import { buildRetirementCharts, calculateRetirement, explainRetirement } from './calculate'
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
    expect(r.contributionPath).toBe('direct')
    expect(r.estimatedNetAnnual).toBeUndefined()
  })

  it('keeps a dollar contribution when income fields are present but unused', () => {
    const plain = calculateRetirement(simple)
    const decorated = calculateRetirement({
      ...simple,
      contributionPath: 'direct',
      grossIncome: 250000,
      country: 'US',
      jurisdictionId: 'not-a-place',
      investMode: 'percent-gross',
      investPercent: 90,
      employerMatchPercent: 100,
      employerMatchCapPercent: 100,
    })
    expect(validateRetirement({ ...simple, contributionPath: 'direct', country: 'US', jurisdictionId: 'not-a-place' }).valid).toBe(true)
    expect(decorated.annualSchedule).toEqual(plain.annualSchedule)
    expect(decorated.projectedBalance).toBe(plain.projectedBalance)
    expect(buildRetirementCharts(plain).some((chart) => chart.type === 'pie')).toBe(false)
    expect(explainRetirement(simple, plain).assumptions?.join(' ')).not.toMatch(/tax brackets/)
  })

  const incomeBase: RetirementInput = {
    currentAge: 35,
    retirementAge: 40,
    currentSavings: 50000,
    annualContribution: 0,
    contributionGrowth: 2,
    expectedReturn: 7,
    inflation: 2.5,
    retirementSpending: 70000,
    retirementDuration: 25,
    otherRetirementIncome: 20000,
    contributionPath: 'income',
    grossIncome: 100000,
    country: 'US',
    jurisdictionId: 'texas',
    filingStatus: 'single',
    taxYear: 2026,
    otherPretaxDeductions: 0,
    investMode: 'percent-gross',
    investPercent: 10,
    contributionTaxTreatment: 'pretax',
    employerMatchPercent: 50,
    employerMatchCapPercent: 6,
  }

  it('invests a pre-tax percent of gross plus a capped employer match', () => {
    const result = calculateRetirement(incomeBase)
    expect(result.employeeContribution).toBe(10000)
    expect(result.employerMatch).toBe(3000)
    expect(result.investedThisYear).toBe(13000)
    expect(result.estimatedNetAnnual).toBeLessThan(90000)
    const direct = calculateRetirement({ ...incomeBase, contributionPath: 'direct', annualContribution: 13000 })
    expect(result.projectedBalance).toBe(direct.projectedBalance)
    expect(result.requiredBalance).toBe(direct.requiredBalance)
    expect(result.accumulation).toEqual(direct.accumulation)
    expect(result.projectedBalanceToday).toBe(Math.round(result.projectedBalance / Math.pow(1.025, 5) * 100) / 100)
    expect(result.paycheckSlices?.reduce((sum, slice) => sum + slice.amount, 0)).toBeCloseTo(100000, 1)
    expect(result.investmentSlices).toEqual([
      { label: 'You invest', amount: 10000 },
      { label: 'Employer match', amount: 3000 },
    ])
    expect(result.balanceSlices?.reduce((sum, slice) => sum + slice.amount, 0)).toBeCloseTo(result.projectedBalance, 1)
    const charts = buildRetirementCharts(result).filter((chart) => chart.type === 'pie').map((chart) => chart.title)
    expect(charts).toEqual(["This year's pay", 'Invested this year', 'Balance at retirement'])
    expect(explainRetirement(incomeBase, result).assumptions?.join(' ')).toMatch(/do not recalculate tax brackets/)
    expect(validateRetirement({ ...incomeBase, annualContribution: Number.POSITIVE_INFINITY }).valid).toBe(true)
  })

  it('adds other pre-tax deductions to a pre-tax investment before estimating take-home', () => {
    const result = calculateRetirement({ ...incomeBase, otherPretaxDeductions: 5000, employerMatchPercent: 0, employerMatchCapPercent: 0 })
    const salary = calculateSalary({
      mode: 'take-home',
      amount: 100000,
      fromFrequency: 'annual',
      toFrequency: 'annual',
      country: 'US',
      jurisdictionId: 'texas',
      filingStatus: 'single',
      pretaxDeductions: 15000,
      taxYear: 2026,
    })
    expect(result.estimatedNetAnnual).toBe(salary.estimatedNetAnnual)
    expect(result.investedThisYear).toBe(10000)
  })

  it('takes an after-tax percent of take-home without reducing the tax estimate', () => {
    const input: RetirementInput = {
      ...incomeBase,
      investMode: 'percent-net',
      investPercent: 15,
      otherPretaxDeductions: 0,
      employerMatchPercent: 0,
      employerMatchCapPercent: 0,
    }
    const pretaxChoice = calculateRetirement({ ...input, contributionTaxTreatment: 'pretax' })
    const afterTaxChoice = calculateRetirement({ ...input, contributionTaxTreatment: 'aftertax' })
    const salary = calculateSalary({
      mode: 'take-home',
      amount: 100000,
      fromFrequency: 'annual',
      toFrequency: 'annual',
      country: 'US',
      jurisdictionId: 'texas',
      filingStatus: 'single',
      pretaxDeductions: 0,
      taxYear: 2026,
    })
    expect(pretaxChoice.estimatedNetAnnual).toBe(salary.estimatedNetAnnual)
    expect(pretaxChoice.estimatedNetAnnual).toBe(afterTaxChoice.estimatedNetAnnual)
    expect(pretaxChoice.employeeContribution).toBe(Math.round((salary.estimatedNetAnnual ?? 0) * (15 / 100) * 100) / 100)
    expect(pretaxChoice.employeeContribution).toBe(afterTaxChoice.employeeContribution)
    expect(pretaxChoice.employerMatch).toBe(0)
    const invested = pretaxChoice.investedThisYear ?? Number.NaN
    expect(Number.isFinite(invested)).toBe(true)
    const direct = calculateRetirement({ ...input, contributionPath: 'direct', annualContribution: invested })
    expect(pretaxChoice.projectedBalance).toBe(direct.projectedBalance)
  })

  it('lowers take-home for a pre-tax investment and leaves the invested dollars unchanged', () => {
    const shared = { ...incomeBase, employerMatchPercent: 0, employerMatchCapPercent: 0 }
    const pretax = calculateRetirement({ ...shared, contributionTaxTreatment: 'pretax' })
    const afterTax = calculateRetirement({ ...shared, contributionTaxTreatment: 'aftertax' })
    expect(pretax.employeeContribution).toBe(10000)
    expect(afterTax.employeeContribution).toBe(10000)
    expect(pretax.estimatedNetAnnual).toBeLessThan(afterTax.estimatedNetAnnual ?? 0)
    expect(pretax.projectedBalance).toBe(afterTax.projectedBalance)
  })

  it('adds no employer match when the cap is zero', () => {
    const result = calculateRetirement({ ...incomeBase, employerMatchPercent: 50, employerMatchCapPercent: 0 })
    expect(result.employerMatch).toBe(0)
    expect(result.investedThisYear).toBe(10000)
  })

  it('rejects an income path that cannot estimate take-home or fund an after-tax investment', () => {
    expect(validateRetirement({ ...incomeBase, jurisdictionId: '' }).valid).toBe(false)
    expect(validateRetirement({ ...incomeBase, taxYear: 2025 }).valid).toBe(false)
    const overInvested = validateRetirement({
      ...incomeBase,
      investMode: 'percent-gross',
      investPercent: 100,
      contributionTaxTreatment: 'aftertax',
      employerMatchPercent: 0,
      employerMatchCapPercent: 0,
    })
    expect(overInvested.valid).toBe(false)
    if (!overInvested.valid) expect(overInvested.errors.investPercent).toMatch(/take-home/)
    expect(validateRetirement({ ...simple, contributionPath: 'paycheck' as 'direct' }).valid).toBe(false)
  })
})
