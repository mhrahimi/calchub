export type CouponFrequency = 1 | 2 | 4 | 12

export interface BondsInput {
  faceValue: number
  bondPrice: number
  couponRate: number
  couponFrequency: CouponFrequency
  periodsToMaturity: number
}

export interface BondsResult {
  ytm: number
  ytmPercent: number
  couponPayment: number
  currentYield: number
  macaulayDuration: number
  modifiedDuration: number
  convexity: number
  cashFlows: Array<{ period: number; coupon: number; principal: number; total: number; pv: number }>
  chartParams: {
    faceValue: number
    couponRate: number
    periods: number
    ytmPerPeriod: number
    frequency: number
  }
}
