import type { RetirementInput } from './types'

export function validateRetirement(input: RetirementInput) {
  const errors: Record<string, string> = {}
  for (const [key, value] of Object.entries(input)) {
    if (!Number.isFinite(value)) errors[key] = 'Enter a finite number'
  }
  for (const key of ['currentAge', 'retirementAge', 'retirementDuration'] as const) {
    if (!Number.isInteger(input[key]) || input[key] < 0 || input[key] > 150) errors[key] = 'Enter a whole number between 0 and 150'
  }
  if (input.retirementAge <= input.currentAge) {
    errors.retirementAge = 'Retirement age must be greater than your current age.'
  }
  if (input.currentSavings < 0) errors.currentSavings = 'Current savings cannot be negative'
  if (input.retirementDuration <= 0) {
    errors.retirementDuration = 'Retirement duration must be positive'
  }
  if (input.retirementAge + input.retirementDuration > 150) errors.retirementDuration = 'The projection must end by age 150'
  for (const key of ['expectedReturn', 'inflation', 'contributionGrowth'] as const) {
    if (!Number.isFinite(input[key]) || input[key] <= -100 || input[key] > 100) errors[key] = 'Enter a rate greater than -100% and no more than 100%'
  }
  for (const key of ['currentSavings', 'annualContribution', 'retirementSpending', 'otherRetirementIncome'] as const) {
    if (!Number.isFinite(input[key])) errors[key] = 'Enter a finite amount'
    else if (key !== 'annualContribution' && input[key] < 0) errors[key] = 'Amount cannot be negative'
  }
  if (Object.keys(errors).length) return { valid: false as const, errors }
  return { valid: true as const, data: input }
}
