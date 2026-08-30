import type { LboInput } from './types'

export function validateLbo(input: LboInput) {
  const errors: Record<string, string> = {}
  if (input.purchaseEv <= 0) errors.purchaseEv = 'Purchase EV must be positive'
  if (input.sponsorEquity <= 0) errors.sponsorEquity = 'Sponsor equity must be positive'
  if (input.initialDebt < 0) errors.initialDebt = 'Debt cannot be negative'
  if (input.exitYear < 1 || input.exitYear > input.forecast.length) {
    errors.exitYear = 'Exit year must be within forecast range'
  }
  if (input.exitMultiple <= 0) errors.exitMultiple = 'Exit multiple must be positive'
  if (Object.keys(errors).length) return { valid: false as const, errors }
  return { valid: true as const, data: input }
}
