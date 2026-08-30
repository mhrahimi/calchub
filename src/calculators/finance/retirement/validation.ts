import type { RetirementInput } from './types'

export function validateRetirement(input: RetirementInput) {
  const errors: Record<string, string> = {}
  if (input.currentAge < 0) errors.currentAge = 'Current age cannot be negative'
  if (input.retirementAge <= input.currentAge) {
    errors.retirementAge = 'Retirement age must be greater than your current age.'
  }
  if (input.currentSavings < 0) errors.currentSavings = 'Current savings cannot be negative'
  if (input.retirementDuration <= 0) {
    errors.retirementDuration = 'Retirement duration must be positive'
  }
  if (input.expectedReturn < -100) errors.expectedReturn = 'Return rate is out of domain'
  if (Object.keys(errors).length) return { valid: false as const, errors }
  return { valid: true as const, data: input }
}
