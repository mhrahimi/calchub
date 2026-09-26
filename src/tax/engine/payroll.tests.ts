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

  it('includes QPP, QPIP and Quebec EI with the published 2026 limits', () => {
    const r = computePayroll('CA', 80000, { jurisdictionId: 'quebec' })
    expect(r.qpp).toBe(4695.30)
    expect(r.qpip).toBe(344)
    expect(r.ei).toBe(895.70)
    expect(r.total).toBe(5935)
    expect(r.cpp).toBeUndefined()
  })

  it('caps all Quebec contributions and handles the basic exemption', () => {
    const high = computeCanadaPayroll(200000, true)
    expect(high.qpp).toBe(4895.30)
    expect(high.qpip).toBe(442.90)
    expect(high.ei).toBe(895.70)
    expect(high.total).toBe(6233.90)
    const low = computeCanadaPayroll(3500, true)
    expect(low.qpp).toBe(0)
    expect(low.qpip).toBe(15.05)
    expect(low.ei).toBe(45.50)
    expect(computeCanadaPayroll(0, true).total).toBe(0)
  })
})
