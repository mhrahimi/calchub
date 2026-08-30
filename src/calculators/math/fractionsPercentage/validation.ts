import type { FractionsPercentageInput } from './types'

export function validateFractionsPercentage(input: FractionsPercentageInput) {
  const errors: Record<string, string> = {}
  if (input.mode === 'fraction') {
    if (!input.fractionA?.trim()) errors.fractionA = 'Enter the first fraction'
    if (!input.fractionB?.trim()) errors.fractionB = 'Enter the second fraction'
  } else {
    if (input.percentageMode === 'percentOf') {
      if (input.percentValue === undefined) errors.percentValue = 'Enter a percentage'
      if (input.baseValue === undefined) errors.baseValue = 'Enter a base value'
    } else if (input.percentageMode === 'whatPercent') {
      if (input.percentValue === undefined) errors.baseValue = 'Enter part value'
      if (input.baseValue === undefined || input.baseValue === 0) errors.baseValue = 'Base value must be non-zero'
    } else if (input.percentageMode === 'percentChange') {
      if (input.oldValue === undefined) errors.oldValue = 'Enter the old value'
      if (input.newValue === undefined) errors.newValue = 'Enter the new value'
      if (input.oldValue === 0) errors.oldValue = 'Old value cannot be zero for percent change'
    }
  }
  if (Object.keys(errors).length) return { valid: false as const, errors }
  return { valid: true as const, data: input }
}
