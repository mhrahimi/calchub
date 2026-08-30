import type { CreWaterfallInput } from './types'

export function validateCreWaterfall(input: CreWaterfallInput) {
  const errors: Record<string, string> = {}
  if (input.lpContribution < 0) errors.lpContribution = 'LP contribution cannot be negative'
  if (input.gpContribution < 0) errors.gpContribution = 'GP contribution cannot be negative'
  if (input.totalDistribution < 0) errors.totalDistribution = 'Distribution cannot be negative'
  const totalContrib = input.lpContribution + input.gpContribution
  if (totalContrib <= 0) errors.lpContribution = 'Total contributions must be positive'
  if (input.lpPromotePercent < 0 || input.lpPromotePercent > 100) {
    errors.lpPromotePercent = 'LP promote share must be between 0 and 100'
  }
  if (Object.keys(errors).length) return { valid: false as const, errors }
  return { valid: true as const, data: input }
}
