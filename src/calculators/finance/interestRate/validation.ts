import type { InterestRateInput } from './types'

export function validateInterestRate(input: InterestRateInput) {
  const errors: Record<string, string> = {}
  if (input.principal <= 0) errors.principal = 'Principal must be positive'
  if (input.payment <= 0) errors.payment = 'Payment must be positive'
  if (input.term <= 0) errors.term = 'Term must be positive'
  if (Object.keys(errors).length) return { valid: false as const, errors }
  return { valid: true as const, data: input }
}
