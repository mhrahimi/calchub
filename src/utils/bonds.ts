import { brentSolve } from './rootSolve'

export interface BondCashFlow {
  period: number
  coupon: number
  principal: number
  total: number
}

function couponPerPeriod(faceValue: number, couponRate: number, frequency: number): number {
  return (faceValue * couponRate) / frequency
}

export function buildCouponSchedule(
  faceValue: number,
  couponRate: number,
  periods: number,
  frequency: number,
): BondCashFlow[] {
  const coupon = couponPerPeriod(faceValue, couponRate, frequency)
  return Array.from({ length: periods }, (_, i) => {
    const period = i + 1
    const principal = period === periods ? faceValue : 0
    return { period, coupon, principal, total: coupon + principal }
  })
}

export function bondPriceFromYield(
  faceValue: number,
  couponRate: number,
  periods: number,
  yieldPerPeriod: number,
  frequency: number,
): number {
  const coupon = couponPerPeriod(faceValue, couponRate, frequency)
  if (yieldPerPeriod === 0) return coupon * periods + faceValue
  const discount = Math.pow(1 + yieldPerPeriod, periods)
  const pvCoupons = (coupon * (discount - 1)) / (yieldPerPeriod * discount)
  const pvFace = faceValue / discount
  return pvCoupons + pvFace
}

export function solveYtm(
  faceValue: number,
  couponRate: number,
  periods: number,
  price: number,
  frequency: number,
): number | null {
  const objective = (y: number) =>
    bondPriceFromYield(faceValue, couponRate, periods, y, frequency) - price
  let lo = 0.0001
  let hi = 0.5
  if (objective(lo) * objective(hi) > 0) {
    hi = 2
    if (objective(lo) * objective(hi) > 0) return null
  }
  return brentSolve(objective, lo, hi)
}

export function macaulayDuration(
  faceValue: number,
  couponRate: number,
  periods: number,
  yieldPerPeriod: number,
  price: number,
  frequency: number,
): number {
  const coupon = couponPerPeriod(faceValue, couponRate, frequency)
  let weighted = 0
  for (let t = 1; t <= periods; t++) {
    const cf = t === periods ? coupon + faceValue : coupon
    const pv = cf / Math.pow(1 + yieldPerPeriod, t)
    weighted += (t / frequency) * pv
  }
  return weighted / price
}

export function modifiedDuration(macaulay: number, yieldPerPeriod: number): number {
  return macaulay / (1 + yieldPerPeriod)
}

export function convexity(
  faceValue: number,
  couponRate: number,
  periods: number,
  yieldPerPeriod: number,
  price: number,
  frequency: number,
): number {
  const coupon = couponPerPeriod(faceValue, couponRate, frequency)
  let conv = 0
  for (let t = 1; t <= periods; t++) {
    const cf = t === periods ? coupon + faceValue : coupon
    conv += (t * (t + 1) * cf) / Math.pow(1 + yieldPerPeriod, t)
  }
  return conv / (price * Math.pow(1 + yieldPerPeriod, 2) * frequency * frequency)
}

export function priceYieldCurve(
  faceValue: number,
  couponRate: number,
  periods: number,
  yieldPerPeriod: number,
  frequency: number,
  steps = 20,
): Array<{ yield: number; price: number }> {
  const centerAnnual = yieldPerPeriod * frequency
  const points: Array<{ yield: number; price: number }> = []
  for (let i = 0; i <= steps; i++) {
    const annual = Math.max(0.001, centerAnnual - 0.05 + (0.1 * i) / steps)
    const yPeriod = annual / frequency
    points.push({
      yield: annual * 100,
      price: bondPriceFromYield(faceValue, couponRate, periods, yPeriod, frequency),
    })
  }
  return points
}
