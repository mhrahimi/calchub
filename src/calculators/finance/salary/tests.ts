import { describe, it, expect } from 'vitest'
import { calculateSalary } from './calculate'
import { explainSalary } from './calculate'
import { resultMetadata } from '@/exports/resultMetadata'

describe('salary', () => {
  it('shows Quebec payroll and the same income-tax exclusions in take-home results', () => {
    const input = {mode:'take-home' as const,amount:100000,fromFrequency:'annual' as const,toFrequency:'monthly' as const,country:'CA' as const,jurisdictionId:'quebec'}
    const r = calculateSalary(input)
    expect(r.payrollTotal).toBe(6221)
    expect(r.payrollLabels).toContainEqual({label:'EI (Quebec)',amount:895.7})
    expect(r.coverage?.excluded).toContain('Quebec federal abatement')
    expect(r.coverage?.excluded).not.toContain('Payroll contributions and local taxes')
    expect(explainSalary(input,r).assumptions?.join(' ')).toContain('QPP, QPIP and EI')
    expect(explainSalary(input,r).assumptions?.join(' ')).not.toContain('Do not apply CPP/EI')
    expect(resultMetadata('salary',r).status).toBe('approximate')
  })
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
