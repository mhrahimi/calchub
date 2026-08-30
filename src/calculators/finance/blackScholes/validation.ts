import type { BlackScholesInput } from './types'

export function validateBlackScholes(input: BlackScholesInput) {
  const errors: Record<string, string> = {}
  if (input.spot <= 0) errors.spot = 'Stock price must be positive'
  if (input.strike <= 0) errors.strike = 'Strike must be positive'
  if (input.timeYears <= 0) errors.timeYears = 'Time to expiration must be positive'
  if (input.volatility <= 0) errors.volatility = 'Volatility must be positive'
  if (Object.keys(errors).length) return { valid: false as const, errors }
  return { valid: true as const, data: input }
}
