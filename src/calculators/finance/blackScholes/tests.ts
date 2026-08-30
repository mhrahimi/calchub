import { describe, it, expect } from 'vitest'
import { calculateBlackScholes } from './calculate'
import { putCallParityResidual } from '@/utils/blackScholes'

describe('blackScholes engine', () => {
  const input = {
    spot: 100,
    strike: 100,
    timeYears: 1,
    riskFreeRate: 5,
    volatility: 20,
    dividendYield: 0,
    showGreeks: true,
  }
  it('prices call and put', () => {
    const r = calculateBlackScholes(input)
    expect(r.callPrice).toBeCloseTo(10.4506, 2)
    expect(r.putPrice).toBeCloseTo(5.5735, 2)
    expect(r.greeks).toBeDefined()
  })
  it('put-call parity holds', () => {
    const r = calculateBlackScholes(input)
    const residual = putCallParityResidual(
      { spot: 100, strike: 100, timeYears: 1, riskFreeRate: 0.05, volatility: 0.2, dividendYield: 0 },
      r.callPrice,
      r.putPrice,
    )
    expect(Math.abs(residual)).toBeLessThan(1e-6)
  })
})
