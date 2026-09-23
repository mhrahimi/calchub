import { describe, expect, it } from 'vitest'
import { getCopyText, normalizePastedText, parsePastedText } from './clipboard'
import { initialCalculatorState } from './engine'

describe('normalizePastedText', () => {
  it('strips grouping commas and spaces', () => {
    expect(normalizePastedText(' 1,234,567.89 ')).toBe('1234567.89')
  })

  it('maps operator glyphs', () => {
    expect(normalizePastedText('2 × 3 ÷ 4 − 1')).toBe('2*3/4-1')
  })
})

describe('parsePastedText', () => {
  it('accepts plain and scientific numbers', () => {
    expect(parsePastedText('1,234.5')).toEqual({ kind: 'number', value: '1234.5' })
    expect(parsePastedText('-0.25')).toEqual({ kind: 'number', value: '-0.25' })
    expect(parsePastedText('1.5e2')).toEqual({ kind: 'number', value: '1.5e2' })
  })

  it('evaluates simple expressions', () => {
    expect(parsePastedText('2+3*4')).toEqual({
      kind: 'result',
      value: '14',
      expression: '2+3*4',
    })
  })

  it('rejects empty or invalid input', () => {
    expect(parsePastedText('')).toBeNull()
    expect(parsePastedText('hello')).toBeNull()
  })
})

describe('getCopyText', () => {
  it('returns the entry when valid', () => {
    expect(getCopyText({ ...initialCalculatorState, entry: '42' })).toBe('42')
  })

  it('returns null on error', () => {
    expect(getCopyText({ ...initialCalculatorState, entry: 'Error', error: true })).toBeNull()
  })
})
