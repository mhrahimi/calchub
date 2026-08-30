import { describe, it, expect } from 'vitest'
import { calculatePValue, buildPValueCharts } from './calculate'
import { twoSidedPValue, normalCDF } from '@/utils/distributions'

describe('pValue', () => {
  it('computes z-test p-value', () => {
    const r = calculatePValue({
      mode: 'zTest',
      tail: 'two',
      sampleMean: 105,
      hypothesizedMean: 100,
      populationSd: 15,
      sampleSize: 30,
    })
    expect(r.pValue).toBeDefined()
    expect(r.pValue!).toBeLessThan(0.2)
  })
  it('matches reference two-sided z p-value', () => {
    expect(twoSidedPValue(normalCDF, 1.96)).toBeCloseTo(0.05, 2)
  })
  it('shades both tails without stacking above the density', () => {
    const r = calculatePValue({
      mode: 'zTest',
      tail: 'two',
      sampleMean: 105,
      hypothesizedMean: 100,
      populationSd: 15,
      sampleSize: 30,
    })
    expect(r.shadedRegion.length).toBeGreaterThan(0)
    expect(r.shadedRegionLower?.length).toBeGreaterThan(0)
    const density = new Map(r.distributionPoints.map((p) => [p.x, p.y]))
    for (const p of r.shadedRegion) {
      const d = density.get(p.x)
      if (d !== undefined) expect(p.y).toBeLessThanOrEqual(d + 1e-12)
    }
    const charts = buildPValueCharts(r)
    expect(charts[0].stacked).toBeUndefined()
    expect(charts[0].series.some((s) => s.name === 'Lower tail')).toBe(true)
    expect(charts[0].series.some((s) => s.name === 'Upper tail')).toBe(true)
  })
  it('plots the interval for confidence-interval modes', () => {
    const r = calculatePValue({
      mode: 'meanCi',
      sampleMean: 100,
      sampleSd: 10,
      sampleSize: 25,
      confidenceLevel: 95,
    })
    const charts = buildPValueCharts(r)
    expect(charts[0].type).toBe('line')
    expect(charts[0].series[0].data[0].x).toBeCloseTo(r.ciLower!, 8)
    expect(charts[0].series[0].data[1].x).toBeCloseTo(r.ciUpper!, 8)
  })
})
