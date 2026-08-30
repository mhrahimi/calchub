import type { RandomNumberInput } from './types'

export function validateRandomNumber(input: RandomNumberInput) {
  const errors: Record<string, string> = {}
  if (input.min > input.max) errors.max = 'Maximum must be greater than or equal to minimum'
  if (input.count <= 0) errors.count = 'Count must be positive'
  if (input.integer && input.unique && input.count > input.max - input.min + 1) {
    errors.count = 'Unique count exceeds the integer range'
  }
  if (Object.keys(errors).length) return { valid: false as const, errors }
  return { valid: true as const, data: input }
}
