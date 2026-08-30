import type { PValueInput } from './types'

export function validatePValue(input: PValueInput) {
  const errors: Record<string, string> = {}
  const n = input.sampleSize
  if (n !== undefined && n <= 0) errors.sampleSize = 'Sample size must be positive'
  if (input.mode === 'tTest' || input.mode === 'meanCi') {
    if (n !== undefined && n < 2) errors.sampleSize = 'Sample size must be at least 2 for t-based inference'
    if (input.sampleSd !== undefined && input.sampleSd < 0) errors.sampleSd = 'Sample SD cannot be negative'
  }
  if (input.mode === 'zTest' && input.populationSd !== undefined && input.populationSd <= 0) {
    errors.populationSd = 'Population SD must be positive'
  }
  if (input.mode === 'proportionCi') {
    if (input.proportion !== undefined && (input.proportion < 0 || input.proportion > 1)) {
      errors.proportion = 'Proportion must be between 0 and 1'
    }
    if (n !== undefined && n <= 0) errors.sampleSize = 'Sample size must be positive'
  }
  if (input.confidenceLevel !== undefined && (input.confidenceLevel <= 0 || input.confidenceLevel >= 100)) {
    errors.confidenceLevel = 'Confidence level must be between 0 and 100'
  }
  if (Object.keys(errors).length) return { valid: false as const, errors }
  return { valid: true as const, data: input }
}
