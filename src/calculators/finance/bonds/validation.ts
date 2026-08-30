import type { BondsInput } from './types'

export function validateBonds(input: BondsInput) {
  const errors: Record<string, string> = {}
  if (input.faceValue <= 0) errors.faceValue = 'Face value must be positive'
  if (input.bondPrice <= 0) errors.bondPrice = 'Bond price must be positive'
  if (input.periodsToMaturity <= 0) errors.periodsToMaturity = 'Maturity must be positive'
  if (input.couponRate < 0) errors.couponRate = 'Coupon rate cannot be negative'
  if (Object.keys(errors).length) return { valid: false as const, errors }
  return { valid: true as const, data: input }
}
