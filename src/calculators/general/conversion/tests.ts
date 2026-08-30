import { describe, it, expect } from 'vitest'
import { calculateConversion } from './calculate'

describe('conversion', () => {
  it('converts temperature', () => {
    const r = calculateConversion({ value: 100, fromUnitId: 'c', toUnitId: 'f', category: 'temperature' })
    expect(r.outputValue).toBeCloseTo(212, 5)
  })
  it('converts mass', () => {
    const r = calculateConversion({ value: 1, fromUnitId: 'kg', toUnitId: 'lb', category: 'mass' })
    expect(r.outputValue).toBeCloseTo(2.20462, 3)
  })
})
