import { describe, it, expect } from 'vitest'
import { CalculationError } from '@/utils/rootSolve'
import { calculateTriangle } from './calculate'
import { isValidTriangle } from './solver'
import { validateTriangle } from './validation'

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
  it('solves SAS with obtuse angle B', () => {
    // Side b opposite A is long enough that B is obtuse (asin would wrongly return acute).
    const r = calculateTriangle({ case: 'SAS', sideB: 10, sideC: 3, angleA: 20 })
    expect(r.solutions).toHaveLength(1)
    const s = r.solutions[0]
    expect(s.angleB).toBeCloseTo(151.87, 1)
    expect(s.angleC).toBeCloseTo(8.13, 1)
    expect(s.angleA + s.angleB + s.angleC).toBeCloseTo(180, 5)
  })
  it('handles SSA ambiguity', () => {
    const r = calculateTriangle({ case: 'SSA', sideA: 7, sideB: 10, angleA: 30 })
    expect(r.solutions.length).toBe(2)
  })
  it('rejects AAS when angles sum to 180° or more', () => {
    const v = validateTriangle({ case: 'AAS', sideA: 5, angleA: 100, angleB: 90 })
    expect(v.valid).toBe(false)
    expect(() => calculateTriangle({ case: 'AAS', sideA: 5, angleA: 100, angleB: 90 })).toThrow(
      CalculationError,
    )
  })
})
