import { describe, it, expect } from 'vitest'
import {
  applyDraftSign,
  caretPositionForTokens,
  caretTokenCount,
  draftIsNegative,
  formatDecimalDisplay,
  formatGroupedInput,
  parseDecimalDraft,
  parseMoney,
  sanitizeDecimalDraft,
  toggleDraftSign,
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

describe('decimal drafts', () => {
  it('formats numbers without forced trailing zeros', () => {
    expect(formatDecimalDisplay(0)).toBe('0')
    expect(formatDecimalDisplay(5)).toBe('5')
    expect(formatDecimalDisplay(3.5)).toBe('3.5')
  })

  it('sanitizes to digits and one dot', () => {
    expect(sanitizeDecimalDraft('05')).toBe('05')
    expect(sanitizeDecimalDraft('5a%')).toBe('5')
    expect(sanitizeDecimalDraft('12.3.4')).toBe('12.34')
    expect(sanitizeDecimalDraft('3.')).toBe('3.')
    expect(sanitizeDecimalDraft('')).toBe('')
  })

  it('strips typed minus when allowSign is false', () => {
    expect(sanitizeDecimalDraft('-5', { allowSign: false })).toBe('5')
    expect(sanitizeDecimalDraft('-5', { allowSign: true })).toBe('-5')
  })

  it('parses empty and partial drafts to 0', () => {
    expect(parseDecimalDraft('')).toBe(0)
    expect(parseDecimalDraft('-')).toBe(0)
    expect(parseDecimalDraft('.')).toBe(0)
    expect(parseDecimalDraft('5.')).toBe(5)
    expect(parseDecimalDraft('-3.2')).toBe(-3.2)
  })

  it('toggles and applies draft signs', () => {
    expect(toggleDraftSign('5')).toBe('-5')
    expect(toggleDraftSign('-5')).toBe('5')
    expect(toggleDraftSign('')).toBe('-')
    expect(toggleDraftSign('-')).toBe('')
    expect(applyDraftSign('5', true)).toBe('-5')
    expect(applyDraftSign('-5', false)).toBe('5')
    expect(applyDraftSign('', true)).toBe('-')
    expect(draftIsNegative('-0')).toBe(true)
    expect(draftIsNegative('0')).toBe(false)
  })
})
