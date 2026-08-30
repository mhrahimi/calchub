import { describe, it, expect } from 'vitest'
import { computeUsPayroll, computeCanadaPayroll, computePayroll } from './payroll'

describe('payroll engine', () => {
  it('caps Social Security at wage base', () => {
    const under = computeUsPayroll(100000)
    expect(under.socialSecurity).toBeCloseTo(100000 * 0.062, 2)

    const over = computeUsPayroll(200000)
    expect(over.socialSecurity).toBeCloseTo(184500 * 0.062, 2)
  })

  it('applies Medicare without ordinary wage cap', () => {
    const r = computeUsPayroll(300000)
    expect(r.medicare).toBeCloseTo(300000 * 0.0145, 2)
  })

  it('applies Additional Medicare above filing-status threshold', () => {
    const single = computeUsPayroll(250000, 'single')
    expect(single.additionalMedicare).toBeCloseTo(50000 * 0.009, 2)

    const mfj = computeUsPayroll(250000, 'married_joint')
    expect(mfj.additionalMedicare).toBe(0)
  })

  it('caps CPP and EI at 2026 ceilings', () => {
    const high = computeCanadaPayroll(200000)
    expect(high.cpp).toBe(4230.45)
    expect(high.cpp2).toBe(416)
    expect(high.ei).toBe(1123.07)
  })

  it('computes CPP1 below YMPE correctly', () => {
    const r = computeCanadaPayroll(50000)
    expect(r.cpp).toBeCloseTo(0.0595 * (50000 - 3500), 2)
    expect(r.cpp2).toBe(0)
  })

  it('uses QPP/QPIP for Quebec instead of CPP/EI', () => {
    const r = computePayroll('CA', 80000, { jurisdictionId: 'quebec' })
    expect(r.qpp).toBeGreaterThan(0)
    expect(r.ei).toBeUndefined()
    expect(r.cpp).toBeUndefined()
  })
})
