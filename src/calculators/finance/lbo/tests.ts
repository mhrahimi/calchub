import { describe, it, expect } from 'vitest'
import { calculateLbo } from './calculate'

describe('lbo', () => {
  const forecast = [
    { ebitda: 100, capex: 10, nwcChange: 5 },
    { ebitda: 110, capex: 11, nwcChange: 5 },
    { ebitda: 120, capex: 12, nwcChange: 5 },
    { ebitda: 130, capex: 13, nwcChange: 5 },
    { ebitda: 140, capex: 14, nwcChange: 5 },
  ]
  it('computes MOIC and IRR', () => {
    const r = calculateLbo({
      purchaseEv: 1000,
      sponsorEquity: 300,
      initialDebt: 700,
      interestRate: 8,
      forecast,
      exitMultiple: 8,
      exitYear: 5,
    })
    expect(r.moic).toBeGreaterThan(0)
    expect(r.exitEquity).toBeGreaterThan(0)
    expect(r.debtSchedule).toHaveLength(5)
    expect(r.irr).not.toBeNull()
  })
})
