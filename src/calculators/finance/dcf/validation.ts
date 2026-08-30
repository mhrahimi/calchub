import type { DcfInput } from './types'

export function validateDcf(input: DcfInput) {
  const errors: Record<string, string> = {}
  if (input.forecast.length === 0) errors.forecast = 'Add at least one forecast year'
  if (input.wacc <= 0) errors.wacc = 'WACC must be positive'
  if (input.terminalMethod === 'gordon' && input.wacc <= input.terminalGrowth) {
    errors.terminalGrowth = 'Terminal growth must be less than WACC for Gordon growth'
  }
  if (input.exitMultiple <= 0 && input.terminalMethod === 'exitMultiple') {
    errors.exitMultiple = 'Exit multiple must be positive'
  }
  if (Object.keys(errors).length) return { valid: false as const, errors }
  return { valid: true as const, data: input }
}
