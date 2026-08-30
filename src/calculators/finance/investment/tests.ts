import { describe, it, expect } from 'vitest'
import { calculateInvestment } from './calculate'
import { fvEnd, pvFromFv } from '@/utils/annuity'

describe('investment', () => {
  const base = {
    startingInvestment: 10000,
    periodicContribution: 500,
    contributionFrequency: 'monthly',
    contributionTiming: 'end' as const,
    returnRate: 7,
    period: 20,
    periodUnit: 'years' as const,
  }

  it('calculates future value from the closed-form annuity', () => {
    const r = calculateInvestment({ ...base, solveFor: 'fv' })
    const expected = fvEnd(10000, 0.07 / 12, 240, 500)
    expect(r.endingBalance).toBeCloseTo(expected, 1)
    expect(r.schedule.at(-1)!.balance).toBeCloseTo(r.endingBalance, 1)
  })

  it('solves PV as the discounted residual after contribution FV', () => {
    const target = 250000
    const r = calculateInvestment({ ...base, solveFor: 'pv', targetValue: target })
    const expected = pvFromFv(target, 0.07 / 12, 240, 500)
    expect(r.solvedValue).toBeCloseTo(expected, 1)
    expect(r.endingBalance).toBeCloseTo(target, 1)
    expect(r.schedule.at(-1)!.balance).toBeCloseTo(target, 1)
  })

  it('beginning contributions beat end contributions', () => {
    const end = calculateInvestment({ ...base, solveFor: 'fv', contributionTiming: 'end' })
    const begin = calculateInvestment({ ...base, solveFor: 'fv', contributionTiming: 'begin' })
    expect(begin.endingBalance).toBeGreaterThan(end.endingBalance)
  })
})
