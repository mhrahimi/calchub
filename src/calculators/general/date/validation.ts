import { parseIsoDate } from '@/utils/dates'
import type { DateInput } from './types'

export function validateDate(input: DateInput) {
  const errors: Record<string, string> = {}
  try {
    parseIsoDate(input.startDate)
  } catch {
    errors.startDate = 'Enter a valid start date'
  }
  if (input.mode === 'difference') {
    try {
      parseIsoDate(input.endDate ?? '')
    } catch {
      errors.endDate = 'Enter a valid end date'
    }
  }
  if (input.mode === 'addSubtract') {
    for (const key of ['years', 'months', 'weeks', 'days'] as const) {
      const value = input[key] ?? 0
      if (!Number.isSafeInteger(value) || Math.abs(value) > 10_000_000) {
        errors[key] = 'Enter a whole number within the supported calendar range'
      }
    }
  }
  if (Object.keys(errors).length) return { valid: false as const, errors }
  return { valid: true as const, data: input }
}
