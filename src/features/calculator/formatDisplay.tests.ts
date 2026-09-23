import { describe, expect, it } from 'vitest'
import { formatCalculatorDisplay, formatGroupedNumber } from './formatDisplay'

describe('formatGroupedNumber', () => {
  it('groups the integer part in threes', () => {
    expect(formatGroupedNumber('1234')).toBe('1,234')
    expect(formatGroupedNumber('1234567')).toBe('1,234,567')
    expect(formatGroupedNumber('12')).toBe('12')
  })

  it('preserves decimals and a trailing dot', () => {
    expect(formatGroupedNumber('1234.56')).toBe('1,234.56')
    expect(formatGroupedNumber('1234.')).toBe('1,234.')
    expect(formatGroupedNumber('-1000.5')).toBe('-1,000.5')
  })

  it('leaves Error and scientific notation alone', () => {
    expect(formatGroupedNumber('Error')).toBe('Error')
    expect(formatGroupedNumber('1.23e+10')).toBe('1.23e+10')
  })
})

describe('formatCalculatorDisplay', () => {
  it('groups numbers inside an expression', () => {
    expect(formatCalculatorDisplay('2000 + 3000 × 4')).toBe('2,000 + 3,000 × 4')
  })
})
