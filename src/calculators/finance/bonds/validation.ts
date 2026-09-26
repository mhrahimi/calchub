import type { BondsInput } from './types'

export function validateBonds(input: BondsInput) {
  const errors: Record<string, string> = {}
  if (input.faceValue <= 0) errors.faceValue = 'Face value must be positive'
  if (input.bondPrice <= 0) errors.bondPrice = 'Bond price must be positive'
  for (const key of ['faceValue','bondPrice','couponRate','couponFrequency','periodsToMaturity'] as const) {
    if (!Number.isFinite(input[key])) errors[key] = 'Enter a finite number'
  }
  if (!Number.isInteger(input.periodsToMaturity) || input.periodsToMaturity < 1 || input.periodsToMaturity > 10000) errors.periodsToMaturity = 'Enter 1 to 10,000 whole regular coupon periods'
  if (![1,2,4,12].includes(input.couponFrequency)) errors.couponFrequency = 'Choose a supported coupon frequency'
  if (input.couponRate < 0) errors.couponRate = 'Coupon rate cannot be negative'
  if (Object.keys(errors).length) return { valid: false as const, errors }
  return { valid: true as const, data: input }
}
