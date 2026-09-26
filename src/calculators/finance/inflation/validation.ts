import { getCpi, getAvailableYears } from '@/data/cpi/us-cpi-u'
import type { InflationInput } from './types'

export function validateInflation(input: InflationInput) {
  const errors: Record<string, string> = {}
  if (!Number.isFinite(input.amount) || input.amount < 0) errors.amount = 'Enter a finite, nonnegative amount'
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
    if (input.inflationRate == null || !Number.isFinite(input.inflationRate) || input.inflationRate <= -100 || input.inflationRate > 100) {
      errors.inflationRate = 'Enter a finite rate greater than -100% and no more than 100%'
    }
    if (!Number.isInteger(input.durationYears) || input.durationYears! <= 0 || input.durationYears! > 1000) {
      errors.durationYears = 'Enter 1 to 1,000 whole years'
    }
  }
  if (Object.keys(errors).length) return { valid: false as const, errors }
  return { valid: true as const, data: input }
}
