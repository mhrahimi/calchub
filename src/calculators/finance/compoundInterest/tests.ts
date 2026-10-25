import { describe, it, expect } from 'vitest'
import { buildCompoundInterestCharts, calculateCompoundInterest } from './calculate'

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
    // 2026-01-01 through 2036-01-01 contains 521 actual weekly events.
    expect(weekly.totalContributions - 10000).toBe(52100)
  })

  it('applies funded withdrawals without borrowing', () => {
    const none = calculateCompoundInterest({ ...base, compoundingFrequency: 'monthly' })
    const withdraw = calculateCompoundInterest({
      ...base,
      compoundingFrequency: 'monthly',
      contribution: -200,
      duration: 1,
      contributionFrequency: 'monthly',
    })
    expect(withdraw.finalBalance).toBeLessThan(none.finalBalance)
    expect(withdraw.totalContributions).toBeLessThan(none.totalContributions)
    expect(withdraw.totalContributions).toBeCloseTo(10000 - 200 * 12, 0)
  })

  it('splits the final balance into principal, deposits, and interest', () => {
    const result = calculateCompoundInterest({
      ...base,
      compoundingFrequency: 'monthly',
      contribution: 200,
      contributionFrequency: 'monthly',
    })
    const pie = buildCompoundInterestCharts(result).find((chart) => chart.type === 'pie')
    expect(pie?.title).toBe('Where your balance comes from')
    const slices = pie?.series[0]?.data ?? []
    expect(slices.map((slice) => slice.x)).toEqual(['Principal', 'Deposits', 'Interest'])
    expect(slices[0]?.y).toBe(10000)
    expect(slices[1]?.y).toBeCloseTo(result.totalContributions - result.startingPrincipal, 2)
    expect(slices.reduce((sum, slice) => sum + slice.y, 0)).toBeCloseTo(result.finalBalance, 2)
  })

  it('shows net capital when withdrawals reduce the balance', () => {
    const result = calculateCompoundInterest({
      ...base,
      compoundingFrequency: 'monthly',
      contribution: -200,
      duration: 1,
      contributionFrequency: 'monthly',
    })
    const pie = buildCompoundInterestCharts(result).find((chart) => chart.type === 'pie')
    expect(pie?.series[0]?.data.map((slice) => slice.x)).toEqual(['Net capital', 'Interest'])
    expect(pie?.series[0]?.data.reduce((sum, slice) => sum + slice.y, 0)).toBeCloseTo(result.finalBalance, 2)
    expect(pie?.annotations?.[0]?.label).toMatch(/Withdrawals/)
  })

  it('attributes a loss to the principal that remains', () => {
    const result = calculateCompoundInterest({ ...base, compoundingFrequency: 'monthly', interestRate: -5, contribution: 0 })
    const pie = buildCompoundInterestCharts(result).find((chart) => chart.type === 'pie')
    expect(pie?.series[0]?.data).toEqual([{ x: 'Principal', y: result.finalBalance }])
    expect(pie?.annotations?.[0]?.label).toMatch(/Interest reduced/)
  })

  it('omits the source chart when the balance is depleted', () => {
    const result = calculateCompoundInterest({
      ...base,
      principal: 100,
      contribution: -200,
      interestRate: 0,
      duration: 1,
      compoundingFrequency: 'monthly',
    })
    expect(result.finalBalance).toBe(0)
    expect(buildCompoundInterestCharts(result).some((chart) => chart.type === 'pie')).toBe(false)
  })
})
