import { describe, it, expect } from 'vitest'
import { calculateCompoundInterest } from './calculate'

describe('compound interest', () => {
  it('compounds with end contributions', () => {
    const end = calculateCompoundInterest({
      principal: 10000,
      interestRate: 7,
      duration: 10,
      durationUnit: 'years',
      compoundingFrequency: 'monthly',
      contribution: 200,
      contributionFrequency: 'monthly',
      contributionTiming: 'end',
      continuous: false,
      adjustForInflation: false,
      inflationRate: 0,
    })
    const begin = calculateCompoundInterest({
      principal: 10000,
      interestRate: 7,
      duration: 10,
      durationUnit: 'years',
      compoundingFrequency: 'monthly',
      contribution: 200,
      contributionFrequency: 'monthly',
      contributionTiming: 'begin',
      continuous: false,
      adjustForInflation: false,
      inflationRate: 0,
    })
    expect(begin.finalBalance).toBeGreaterThan(end.finalBalance)
  })

  it('applies contributions under continuous compounding and fills a schedule', () => {
    const none = calculateCompoundInterest({
      principal: 10000,
      interestRate: 7,
      duration: 10,
      durationUnit: 'years',
      compoundingFrequency: 'monthly',
      contribution: 0,
      contributionFrequency: 'monthly',
      contributionTiming: 'end',
      continuous: true,
      adjustForInflation: false,
      inflationRate: 0,
    })
    expect(none.finalBalance).toBeCloseTo(10000 * Math.exp(0.7), 1)
    expect(none.schedule.length).toBeGreaterThan(0)

    const withContrib = calculateCompoundInterest({
      principal: 10000,
      interestRate: 7,
      duration: 10,
      durationUnit: 'years',
      compoundingFrequency: 'monthly',
      contribution: 200,
      contributionFrequency: 'monthly',
      contributionTiming: 'end',
      continuous: true,
      adjustForInflation: false,
      inflationRate: 0,
    })
    expect(withContrib.finalBalance).toBeGreaterThan(none.finalBalance)
    expect(withContrib.schedule.at(-1)!.balance).toBeCloseTo(withContrib.finalBalance, 1)
  })
})
