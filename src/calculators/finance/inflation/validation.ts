import { getCpi, getAvailableYears } from '@/data/cpi/us-cpi-u'
import type { InflationInput } from './types'

export function validateInflation(input: InflationInput) {
  const errors: Record<string, string> = {}
  if (input.amount < 0) errors.amount = 'Amount cannot be negative'
  if (input.mode === 'historical') {
    if (input.baseYear == null) errors.baseYear = 'Base year is required'
    if (input.targetYear == null) errors.targetYear = 'Target year is required'
    if (input.baseYear != null && getCpi(input.baseYear) === null) {
      errors.baseYear = `No CPI data for ${input.baseYear}. Available: ${getAvailableYears()[0]}-${getAvailableYears().at(-1)}`
    }
    if (input.targetYear != null && getCpi(input.targetYear) === null) {
      errors.targetYear = `No CPI data for ${input.targetYear}`
    }
  } else {
    if (input.inflationRate == null || input.inflationRate < -100) {
      errors.inflationRate = 'Inflation rate is required'
    }
    if (!input.durationYears || input.durationYears <= 0) {
      errors.durationYears = 'Duration must be positive'
    }
  }
  if (Object.keys(errors).length) return { valid: false as const, errors }
  return { valid: true as const, data: input }
}
