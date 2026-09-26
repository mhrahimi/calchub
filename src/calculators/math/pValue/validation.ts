import type { PValueInput } from './types'

export function validatePValue(input: PValueInput) {
  const errors: Record<string, string> = {}
  if (!['zTest', 'tTest', 'meanCi', 'proportionCi'].includes(input.mode)) errors.mode = 'Choose a supported inference mode'
  const n = input.sampleSize
  if (!Number.isInteger(n) || n! < 1 || n! > 1_000_000) errors.sampleSize = 'Enter a whole sample size from 1 to 1,000,000'
  if (input.mode === 'tTest' || input.mode === 'meanCi') {
    if (n !== undefined && n < 2) errors.sampleSize = 'Sample size must be at least 2 for t-based inference'
    if (!Number.isFinite(input.sampleSd) || input.sampleSd! < 0 || (input.mode === 'tTest' && input.sampleSd === 0)) {
      errors.sampleSd = input.mode === 'tTest' ? 'Sample SD must be positive for a t-test' : 'Enter a nonnegative sample SD'
    }
  }
  if (input.mode !== 'proportionCi' && !Number.isFinite(input.sampleMean)) errors.sampleMean = 'Enter a finite sample mean'
  if (input.mode === 'zTest' || input.mode === 'tTest') {
    if (!Number.isFinite(input.hypothesizedMean)) errors.hypothesizedMean = 'Enter a finite hypothesized mean'
    if (input.tail !== undefined && !['two', 'oneLower', 'oneUpper'].includes(input.tail)) errors.tail = 'Choose a supported tail'
  }
  if (input.mode === 'zTest' && (!Number.isFinite(input.populationSd) || input.populationSd! <= 0)) {
    errors.populationSd = 'Population SD must be positive'
  }
  if (input.mode === 'proportionCi') {
    if (!Number.isFinite(input.proportion) || input.proportion! < 0 || input.proportion! > 1) {
      errors.proportion = 'Proportion must be between 0 and 1'
    }
    if (n !== undefined && n <= 0) errors.sampleSize = 'Sample size must be positive'
  }
  if (input.mode === 'meanCi' || input.mode === 'proportionCi') {
    const confidence = input.confidenceLevel ?? 95
    if (!Number.isFinite(confidence) || confidence <= 0 || confidence >= 100 || 1 - (1 - confidence / 100) / 2 === 1) {
      errors.confidenceLevel = 'Enter a confidence level strictly between 0% and 100%'
    }
  }
  if (Object.keys(errors).length) return { valid: false as const, errors }
  return { valid: true as const, data: input }
}
