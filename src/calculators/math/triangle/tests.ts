import { describe, it, expect } from 'vitest'
import { calculateTriangle } from './calculate'
import { isValidTriangle } from './solver'

describe('triangle', () => {
  it('validates triangle inequality', () => {
    expect(isValidTriangle(1, 2, 5)).toBe(false)
    expect(isValidTriangle(3, 4, 5)).toBe(true)
  })
  it('solves SSS', () => {
    const r = calculateTriangle({ case: 'SSS', sideA: 3, sideB: 4, sideC: 5 })
    expect(r.solutions).toHaveLength(1)
    expect(r.solutions[0].angleC).toBeCloseTo(90, 0)
  })
  it('handles SSA ambiguity', () => {
    const r = calculateTriangle({ case: 'SSA', sideA: 7, sideB: 10, angleA: 30 })
    expect(r.solutions.length).toBe(2)
  })
})
