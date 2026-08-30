import type { CapTableInput } from './types'

export function validateCapTable(input: CapTableInput) {
  const errors: Record<string, string> = {}
  if (input.holders.length === 0) errors.holders = 'Add at least one holder'
  for (const h of input.holders) {
    if (h.shares < 0) errors.holders = 'Share counts cannot be negative'
    if (!h.name.trim()) errors.holders = 'All holders need a name'
  }
  if (input.preMoneyValuation <= 0) errors.preMoneyValuation = 'Pre-money valuation must be positive'
  if (input.investmentAmount <= 0) errors.investmentAmount = 'Investment must be positive'
  if (input.optionPoolTopUpPercent < 0 || input.optionPoolTopUpPercent >= 100) {
    errors.optionPoolTopUpPercent = 'Option pool top-up must be between 0 and 100'
  }
  if (Object.keys(errors).length) return { valid: false as const, errors }
  return { valid: true as const, data: input }
}
