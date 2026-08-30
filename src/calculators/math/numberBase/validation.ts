import type { NumberBaseInput } from './types'

export function validateNumberBase(input: NumberBaseInput) {
  const errors: Record<string, string> = {}
  if (!input.value.trim()) errors.value = 'Enter a value to convert'
  if (input.fromBase < 2 || input.fromBase > 36) errors.fromBase = 'Base must be between 2 and 36'
  if (input.toBase < 2 || input.toBase > 36) errors.toBase = 'Base must be between 2 and 36'
  if (input.fractionalPrecision < 0 || input.fractionalPrecision > 32) {
    errors.fractionalPrecision = 'Precision must be between 0 and 32'
  }
  if (Object.keys(errors).length) return { valid: false as const, errors }
  return { valid: true as const, data: input }
}
