import { describe, it, expect } from 'vitest'
import {
  caretPositionForTokens,
  caretTokenCount,
  formatGroupedInput,
  parseMoney,
} from './currency'

describe('formatGroupedInput', () => {
  it('groups thousands on numeric values', () => {
    expect(formatGroupedInput(50000, 'en-US')).toBe('50,000')
    expect(formatGroupedInput(200, 'en-US')).toBe('200')
    expect(formatGroupedInput(0, 'en-US')).toBe('0')
  })

  it('groups while typing without forcing decimals', () => {
    expect(formatGroupedInput('50000', 'en-US')).toBe('50,000')
    expect(formatGroupedInput('50,000', 'en-US')).toBe('50,000')
    expect(formatGroupedInput('12.', 'en-US')).toBe('12.')
    expect(formatGroupedInput('12.5', 'en-US')).toBe('12.5')
    expect(formatGroupedInput('12.50', 'en-US')).toBe('12.50')
  })

  it('preserves empty and minus drafts', () => {
    expect(formatGroupedInput('', 'en-US')).toBe('')
    expect(formatGroupedInput('-', 'en-US')).toBe('-')
  })

  it('keeps the minus on negative grouped amounts', () => {
    expect(formatGroupedInput('-1200', 'en-US')).toBe('-1,200')
    expect(formatGroupedInput(-1200, 'en-US')).toBe('-1,200')
  })
})

describe('parseMoney', () => {
  it('strips grouping separators', () => {
    expect(parseMoney('50,000')).toBe(50000)
    expect(parseMoney('$ 50,000')).toBe(50000)
    expect(parseMoney('12.')).toBe(12)
  })

  it('parses negative grouped amounts', () => {
    expect(parseMoney('-1,000')).toBe(-1000)
    expect(parseMoney('-$1,200')).toBe(-1200)
  })
})

describe('caret mapping', () => {
  it('maps digit tokens around grouping commas', () => {
    expect(caretTokenCount('50,000', 3)).toBe(2)
    expect(caretPositionForTokens('50,000', 2)).toBe(2)
    expect(caretPositionForTokens('50,000', 3)).toBe(4)
  })
})
