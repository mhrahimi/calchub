import { describe, it, expect } from 'vitest'
import { calculateTrigonometry } from './calculate'

describe('trigonometry', () => {
  it('solves 3-4-5 triangle', () => {
    const r = calculateTrigonometry({ angleUnit: 'degrees', opposite: 3, adjacent: 4 })
    expect(r.hypotenuse).toBeCloseTo(5, 5)
    expect(r.angleA).toBeCloseTo(Math.atan(3 / 4) * (180 / Math.PI), 2)
  })
})
