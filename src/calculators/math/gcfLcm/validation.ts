import type { GcfLcmInput } from './types'

export function validateGcfLcm(input: GcfLcmInput) {
  const errors: Record<string, string> = {}
  if (typeof input.values !== 'string' || input.values.length > 2200) return { valid: false as const, errors: { values: 'Enter 2 to 20 integers, each no longer than 100 digits' } }
  const parts = input.values.split(/[\s,;]+/).filter(Boolean)
  if (parts.length < 2 || parts.length > 20) errors.values = 'Enter 2 to 20 integers'
  for (const p of parts) {
    if (!/^-?\d{1,100}$/.test(p.trim())) {
      errors.values = 'All values must be integers of no more than 100 digits'
      break
    }
  }
  if (Object.keys(errors).length) return { valid: false as const, errors }
  return { valid: true as const, data: input }
}
