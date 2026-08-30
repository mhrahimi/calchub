import { describe, it, expect } from 'vitest'
import { calculateFractionsPercentage } from './calculate'

describe('fractionsPercentage', () => {
  it('adds fractions', () => {
    const r = calculateFractionsPercentage({
      mode: 'fraction',
      fractionOperation: 'add',
      fractionA: '1/2',
      fractionB: '1/3',
    })
    expect(r.improper).toBe('5/6')
  })
  it('computes percent change', () => {
    const r = calculateFractionsPercentage({
      mode: 'percentage',
      percentageMode: 'percentChange',
      oldValue: 100,
      newValue: 125,
    })
    expect(r.decimal).toBe(25)
  })
})
