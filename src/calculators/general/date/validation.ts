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
  if (Object.keys(errors).length) return { valid: false as const, errors }
  return { valid: true as const, data: input }
}
