import type { CompoundInterestInput } from './types'

export function validateCompoundInterest(input: CompoundInterestInput) {
  const errors: Record<string, string> = {}
  if (input.principal < 0) errors.principal = 'Principal cannot be negative'
  if (input.duration <= 0) errors.duration = 'Duration must be positive'
  if (Object.keys(errors).length) return { valid: false as const, errors }
  return { valid: true as const, data: input }
}
