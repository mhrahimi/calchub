import type { SalaryInput } from './types'

export function validateSalary(input: SalaryInput) {
  const errors: Record<string, string> = {}
  if (input.amount < 0) errors.amount = 'Amount cannot be negative'
  if (input.fromFrequency === 'hourly' || input.toFrequency === 'hourly') {
    if (!input.hoursPerWeek || input.hoursPerWeek <= 0) {
      errors.hoursPerWeek = 'Hours per week are required for hourly conversion'
    }
    if (!input.weeksPerYear || input.weeksPerYear <= 0) {
      errors.weeksPerYear = 'Weeks per year are required for hourly conversion'
    }
  }
  if (input.mode === 'take-home') {
    if (!input.country) errors.country = 'Country is required for take-home pay'
    if (!input.jurisdictionId) errors.jurisdictionId = 'State or province is required for take-home pay'
  }
  if (Object.keys(errors).length) return { valid: false as const, errors }
  return { valid: true as const, data: input }
}
