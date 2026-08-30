import { describe, it, expect } from 'vitest'
import { calculateDcf } from './calculate'

describe('dcf', () => {
  const forecast = [
    { revenue: 100, ebitdaMargin: 20, taxRate: 25, capexPercent: 5, nwcPercent: 10 },
    { revenue: 110, ebitdaMargin: 20, taxRate: 25, capexPercent: 5, nwcPercent: 10 },
    { revenue: 121, ebitdaMargin: 20, taxRate: 25, capexPercent: 5, nwcPercent: 10 },
  ]
  it('computes Gordon terminal value', () => {
    const r = calculateDcf({
      forecast,
      wacc: 10,
      terminalGrowth: 2,
      terminalMethod: 'gordon',
      exitMultiple: 8,
      netDebt: 50,
      cash: 10,
    })
    expect(r.enterpriseValue).toBeGreaterThan(0)
    expect(r.equityValue).toBe(r.enterpriseValue - 50 + 10)
    expect(r.terminalValue).toBeGreaterThan(0)
  })
  it('computes exit multiple terminal value', () => {
    const r = calculateDcf({
      forecast,
      wacc: 10,
      terminalGrowth: 2,
      terminalMethod: 'exitMultiple',
      exitMultiple: 8,
      netDebt: 0,
      cash: 0,
    })
    expect(r.terminalValue).toBeCloseTo(forecast[2].revenue * 0.2 * 8, 0)
  })
})
