import { describe, it, expect } from 'vitest'
import { calculateGcfLcm } from './calculate'

describe('gcfLcm', () => {
  it('computes GCF and LCM', () => {
    const r = calculateGcfLcm({ values: '48, 18, 30' })
    expect(r.gcf).toBe(6n)
    expect(r.lcm).toBe(720n)
  })
})
