import { describe, it, expect } from 'vitest'
import { calculateCapTable } from './calculate'

describe('capTable', () => {
  it('computes dilution from new round', () => {
    const r = calculateCapTable({
      holders: [
        { id: '1', name: 'Founder', type: 'common', shares: 8_000_000 },
        { id: '2', name: 'Employees', type: 'options', shares: 2_000_000 },
      ],
      preMoneyValuation: 8_000_000,
      investmentAmount: 2_000_000,
      optionPoolTopUpPercent: 10,
    })
    expect(r.newInvestorShares).toBeGreaterThan(0)
    expect(r.holders.reduce((s, h) => s + h.postOwnership, 0)).toBeCloseTo(100, 0)
    const founder = r.holders.find((h) => h.name === 'Founder')!
    expect(founder.dilution).toBeGreaterThan(0)
  })
})
