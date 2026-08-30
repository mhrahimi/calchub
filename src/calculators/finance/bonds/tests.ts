import { describe, it, expect } from 'vitest'
import { calculateBonds } from './calculate'
import { bondPriceFromYield, macaulayDuration, modifiedDuration } from '@/utils/bonds'

describe('bonds engine', () => {
  it('uses coupon = face × rate / frequency', () => {
    const r = calculateBonds({
      faceValue: 1000,
      bondPrice: 950,
      couponRate: 5,
      couponFrequency: 2,
      periodsToMaturity: 20,
    })
    expect(r.couponPayment).toBe(25)
    expect(r.currentYield).toBeCloseTo((50 / 950) * 100, 4)
    expect(r.cashFlows).toHaveLength(20)
    expect(r.macaulayDuration).toBeGreaterThan(6)
    expect(r.macaulayDuration).toBeLessThan(10)
    expect(r.modifiedDuration).toBeCloseTo(r.macaulayDuration / (1 + r.ytm / 2), 4)
  })

  it('matches closed-form Macaulay duration for a par annual bond', () => {
    const face = 1000
    const couponRate = 0.06
    const periods = 10
    const frequency = 1
    const y = 0.06
    const price = bondPriceFromYield(face, couponRate, periods, y, frequency)
    expect(price).toBeCloseTo(1000, 6)
    const mac = macaulayDuration(face, couponRate, periods, y, price, frequency)
    const expected = ((1 + y) / y) * (1 - Math.pow(1 + y, -periods))
    expect(mac).toBeCloseTo(expected, 6)
    expect(modifiedDuration(mac, y)).toBeCloseTo(mac / (1 + y), 10)
  })

  it('reconstructs annual YTM from price', () => {
    const input = {
      faceValue: 1000,
      bondPrice: 0,
      couponRate: 5,
      couponFrequency: 2 as const,
      periodsToMaturity: 20,
    }
    const annualYtm = 0.06
    input.bondPrice = bondPriceFromYield(1000, 0.05, 20, annualYtm / 2, 2)
    const r = calculateBonds(input)
    expect(r.ytm).toBeCloseTo(annualYtm, 4)
    expect(r.couponPayment).toBe(25)
  })
})
