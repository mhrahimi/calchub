import { describe, it, expect } from 'vitest'
import { validateRandomNumber } from './validation'

describe('randomNumber', () => {
  it('validates unique range', () => {
    const r = validateRandomNumber({ min: 1, max: 3, count: 5, integer: true, unique: true, decimalPlaces: 2, sortResults: false })
    expect(r.valid).toBe(false)
  })
})
