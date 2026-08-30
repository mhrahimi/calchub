import { describe, it, expect } from 'vitest'
import { fvEnd, fvBegin, pmtFromFv, pvFromFv, periodsFromFv, pmt } from './annuity'

describe('annuity', () => {
  it('does not extra-compound principal for beginning contributions', () => {
    const pv = 1000
    const r = 0.01
    const n = 12
    const pmtAmt = 100
    const end = fvEnd(pv, r, n, pmtAmt)
    const begin = fvBegin(pv, r, n, pmtAmt)
    const factor = Math.pow(1 + r, n)
    const expectedBegin = pv * factor + pmtAmt * ((factor - 1) / r) * (1 + r)
    expect(begin).toBeCloseTo(expectedBegin, 8)
    expect(begin).toBeGreaterThan(end)
    expect(begin).toBeLessThan(end * (1 + r))
  })

  it('inverts FV for PV and PMT consistently', () => {
    const start = 10000
    const r = 0.07 / 12
    const n = 240
    const pmtAmt = 500
    const fv = fvEnd(start, r, n, pmtAmt)
    expect(pvFromFv(fv, r, n, pmtAmt)).toBeCloseTo(start, 6)
    expect(pmtFromFv(start, r, n, fv)).toBeCloseTo(pmtAmt, 6)
    const nSolved = periodsFromFv(start, r, pmtAmt, fv)
    expect(nSolved).not.toBeNull()
    expect(nSolved!).toBeCloseTo(n, 6)
  })

  it('matches the standard 6% 30-year payment on $200k', () => {
    expect(pmt(200000, 0.06 / 12, 360)).toBeCloseTo(1199.1, 2)
  })
})
