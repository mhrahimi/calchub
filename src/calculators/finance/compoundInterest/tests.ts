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

  const base = {
    principal: 10000,
    interestRate: 7,
    duration: 10,
    durationUnit: 'years' as const,
    contribution: 0,
    contributionFrequency: 'monthly',
    contributionTiming: 'end' as const,
    continuous: false,
    adjustForInflation: false,
    inflationRate: 0,
  }

  it('daily compounding outpaces monthly with no contributions', () => {
    const monthly = calculateCompoundInterest({ ...base, compoundingFrequency: 'monthly' })
    const daily = calculateCompoundInterest({ ...base, compoundingFrequency: 'daily' })
    expect(daily.finalBalance).toBeGreaterThan(monthly.finalBalance)
  })

  it('treats compoundingFrequency continuous like the continuous flag', () => {
    const viaFlag = calculateCompoundInterest({ ...base, compoundingFrequency: 'monthly', continuous: true })
    const viaFreq = calculateCompoundInterest({ ...base, compoundingFrequency: 'continuous', continuous: false })
    expect(viaFreq.finalBalance).toBeCloseTo(viaFlag.finalBalance, 6)
    expect(viaFreq.finalBalance).toBeCloseTo(10000 * Math.exp(0.7), 1)
  })

  it('scales contributions with contribution frequency', () => {
    const monthly = calculateCompoundInterest({
      ...base,
      compoundingFrequency: 'monthly',
      contribution: 100,
      contributionFrequency: 'monthly',
    })
    const weekly = calculateCompoundInterest({
      ...base,
      compoundingFrequency: 'monthly',
      contribution: 100,
      contributionFrequency: 'weekly',
    })
    const yearly = calculateCompoundInterest({
      ...base,
      compoundingFrequency: 'monthly',
      contribution: 100,
      contributionFrequency: 'yearly',
    })
    expect(weekly.totalContributions).toBeGreaterThan(monthly.totalContributions)
    expect(monthly.totalContributions).toBeGreaterThan(yearly.totalContributions)
    expect(weekly.totalContributions - 10000).toBeCloseTo((monthly.totalContributions - 10000) * (52 / 12), 0)
  })
})
