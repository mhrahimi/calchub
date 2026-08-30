import { describe, it, expect } from 'vitest'
import { calculateCreWaterfall } from './calculate'

describe('creWaterfall', () => {
  it('distributes through tiers', () => {
    const r = calculateCreWaterfall({
      lpContribution: 9_000_000,
      gpContribution: 1_000_000,
      totalDistribution: 15_000_000,
      preferredReturnPercent: 8,
      catchUpPercent: 20,
      lpPromotePercent: 80,
    })
    expect(r.lpTotal + r.gpTotal).toBeCloseTo(15_000_000, 0)
    expect(r.tiers.length).toBeGreaterThan(0)
    expect(r.lpMoic).toBeGreaterThan(1)
  })
  it('handles tier boundary at return of capital only', () => {
    const r = calculateCreWaterfall({
      lpContribution: 900,
      gpContribution: 100,
      totalDistribution: 500,
      preferredReturnPercent: 8,
      catchUpPercent: 0,
      lpPromotePercent: 80,
    })
    expect(r.tiers[0].tier).toBe('Return of capital')
    expect(r.lpTotal + r.gpTotal).toBeCloseTo(500, 0)
  })
})
