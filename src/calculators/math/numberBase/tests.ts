import { describe, it, expect } from 'vitest'
import { calculateNumberBase } from './calculate'

describe('numberBase', () => {
  it('converts hex to decimal', () => {
    const r = calculateNumberBase({ value: 'FF', fromBase: 16, toBase: 10, fractionalPrecision: 8 })
    expect(r.targetValue).toBe('255')
  })
  it('converts with fractional part', () => {
    const r = calculateNumberBase({ value: '10.5', fromBase: 10, toBase: 2, fractionalPrecision: 4 })
    expect(r.targetValue.startsWith('1010.1')).toBe(true)
  })
})
