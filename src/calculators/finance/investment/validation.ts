import type { InvestmentInput } from './types'

export function validateInvestment(input: InvestmentInput) {
  const errors: Record<string, string> = {}
  if (input.period <= 0) errors.period = 'Period must be positive'
  if (input.returnRate < -100) errors.returnRate = 'Return rate is too low'
  if (Object.keys(errors).length) return { valid: false as const, errors }
  return { valid: true as const, data: input }
}
