import type { GcfLcmInput } from './types'

export function validateGcfLcm(input: GcfLcmInput) {
  const errors: Record<string, string> = {}
  const parts = input.values.split(/[\s,;]+/).filter(Boolean)
  if (parts.length < 2) errors.values = 'Enter at least two integers'
  for (const p of parts) {
    if (!/^-?\d+$/.test(p.trim())) {
      errors.values = 'All values must be integers'
      break
    }
  }
  if (Object.keys(errors).length) return { valid: false as const, errors }
  return { valid: true as const, data: input }
}
