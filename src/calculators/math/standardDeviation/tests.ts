import { describe, it, expect } from 'vitest'
import { calculateStandardDeviation } from './calculate'

describe('standardDeviation', () => {
  it('computes population and sample SD', () => {
    const r = calculateStandardDeviation({ dataset: '2,4,4,4,5,5,7,9' })
    expect(r.populationSd).toBeCloseTo(2, 5)
    expect(r.sampleSd).toBeCloseTo(2.138, 2)
  })
})
