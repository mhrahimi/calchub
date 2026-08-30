import type { SavingsGoalInput } from './types'

export function validateSavingsGoal(input: SavingsGoalInput) {
  const errors: Record<string, string> = {}
  if (input.goalAmount <= 0) errors.goalAmount = 'Goal must be positive'
  if (input.currentSavings < 0) errors.currentSavings = 'Current savings cannot be negative'
  if (input.solveFor !== 'contribution' && (input.periodicContribution ?? 0) < 0) {
    errors.periodicContribution = 'Contribution cannot be negative'
  }
  if (Object.keys(errors).length) return { valid: false as const, errors }
  return { valid: true as const, data: input }
}
