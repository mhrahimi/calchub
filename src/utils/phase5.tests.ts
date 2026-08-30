import { describe, it, expect } from 'vitest'
import { priceBlackScholes, putCallParityResidual } from './blackScholes'
import {
  bondPriceFromYield,
  solveYtm,
  macaulayDuration,
  buildCouponSchedule,
} from './bonds'
import { irr, moic } from './irr'
import { npv, sumPresentValues } from './npv'

describe('blackScholes', () => {
  const input = {
    spot: 100,
    strike: 100,
    timeYears: 1,
    riskFreeRate: 0.05,
    volatility: 0.2,
    dividendYield: 0,
  }
  it('satisfies put-call parity', () => {
    const r = priceBlackScholes(input)
    const residual = putCallParityResidual(input, r.callPrice, r.putPrice)
    expect(Math.abs(residual)).toBeLessThan(1e-6)
  })
  it('prices ATM call above zero', () => {
    const r = priceBlackScholes(input)
    expect(r.callPrice).toBeCloseTo(10.4506, 2)
    expect(r.putPrice).toBeCloseTo(5.5735, 2)
  })
})

describe('bonds', () => {
  it('reconstructs YTM from price', () => {
    const face = 1000
    const couponRate = 0.05
    const periods = 10
    const ytm = 0.06
    const price = bondPriceFromYield(face, couponRate, periods, ytm, 1)
    const solved = solveYtm(face, couponRate, periods, price, 1)
    expect(solved).not.toBeNull()
    expect(solved!).toBeCloseTo(ytm, 4)
  })
  it('computes Macaulay duration', () => {
    const face = 1000
    const couponRate = 0.05
    const periods = 20
    const ytm = 0.025
    const frequency = 2
    const price = bondPriceFromYield(face, couponRate, periods, ytm, frequency)
    const dur = macaulayDuration(face, couponRate, periods, ytm, price, frequency)
    expect(dur).toBeGreaterThan(6)
    expect(dur).toBeLessThan(12)
  })
  it('builds coupon schedule', () => {
    const schedule = buildCouponSchedule(1000, 0.05, 4, 2)
    expect(schedule).toHaveLength(4)
    expect(schedule[0].coupon).toBe(25)
    expect(schedule[3].principal).toBe(1000)
  })
})

describe('irr', () => {
  it('computes IRR for simple investment', () => {
    const flows = [-100, 110]
    const result = irr(flows)
    expect(result).toBeCloseTo(0.1, 3)
  })
  it('computes MOIC', () => {
    expect(moic(200, 100)).toBe(2)
  })
})

describe('npv', () => {
  it('discounts cash flows', () => {
    expect(npv(0.1, [-100, 110])).toBeCloseTo(0, 1)
  })
  it('sums present values', () => {
    expect(sumPresentValues([100, 100], 0.1, 1)).toBeCloseTo(173.55, 1)
  })
})
