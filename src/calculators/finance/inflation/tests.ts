import { describe, it, expect } from 'vitest'
import { calculateInflation } from './calculate'
import { convertPurchasingPower, getCpi } from '@/data/cpi/us-cpi-u'

describe('inflation', () => {
  it('converts historical purchasing power via CPI ratio', () => {
    const r = calculateInflation({
      mode: 'historical',
      amount: 100,
      baseYear: 2000,
      targetYear: 2020,
    })
    const expected = convertPurchasingPower(100, 2000, 2020)
    expect(r.primaryAmount).toBe(expected.equivalent)
    expect(r.percentChange).toBe(expected.percentChange)
  })

  it('matches BLS CPI-U annual averages for 2000 to 2024', () => {
    const r = convertPurchasingPower(100, 2000, 2024)
    expect(r.baseCpi).toBe(172.2)
    expect(r.targetCpi).toBe(313.689)
    expect(r.equivalent).toBeCloseTo((100 * 313.689) / 172.2, 2)
  })

  it('does not treat 2026 as a published annual average', () => {
    expect(getCpi(2026)).toBeNull()
    expect(getCpi(2025)).toBe(321.943)
  })

  it('projects future price and real value', () => {
    const r = calculateInflation({
      mode: 'projection',
      amount: 1000,
      inflationRate: 3,
      durationYears: 10,
    })
    expect(r.futurePrice).toBeCloseTo(1000 * Math.pow(1.03, 10), 1)
    expect(r.realValue).toBeCloseTo(1000 / Math.pow(1.03, 10), 1)
    expect(r.schedule.length).toBe(11)
    expect(r.schedule[10].realValue).toBeCloseTo(r.realValue!, 1)
  })
})
