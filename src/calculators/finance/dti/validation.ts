import type { DtiInput } from './types'

export function validateDti(input: DtiInput) {
  const errors: Record<string, string> = {}
  if (input.grossMonthlyIncome <= 0) errors.grossMonthlyIncome = 'Income must be positive'
  if (input.housingCost < 0) errors.housingCost = 'Housing cost cannot be negative'
  if (Object.keys(errors).length) return { valid: false as const, errors }
  return { valid: true as const, data: input }
}
