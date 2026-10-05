import type { LboInput } from './types'

export function validateLbo(input: LboInput) {
  const errors: Record<string, string> = {}
  if (input.purchaseEv <= 0) errors.purchaseEv = 'Purchase EV must be positive'
  if (input.sponsorEquity <= 0) errors.sponsorEquity = 'Sponsor equity must be positive'
  if (input.initialDebt < 0) errors.initialDebt = 'Debt cannot be negative'
  if (input.exitYear < 1 || input.exitYear > input.forecast.length) {
    errors.exitYear = 'Exit year must be within forecast range'
  }
  if (input.exitMultiple <= 0) errors.exitMultiple = 'Exit multiple must be positive'
  const debt = input.debtTranches?.reduce((sum, tranche) => sum + tranche.amount, 0) ?? input.initialDebt
  const sources = input.sponsorEquity + debt
  const uses = input.purchaseEv + (input.transactionFees ?? 0) + (input.minimumCash ?? 0)
  if (Number.isFinite(sources) && Number.isFinite(uses) && Math.abs(sources - uses) > 0.01) {
    const message = 'Equity plus debt must equal the purchase price, fees, and minimum cash'
    errors.purchaseEv = message
    errors.transactionFees = message
  }
  if (Object.keys(errors).length) return { valid: false as const, errors }
  return { valid: true as const, data: input }
}
