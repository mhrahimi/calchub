import type { LoanInput } from './types'

export function validateLoan(input: LoanInput) {
  const errors: Record<string, string> = {}
  if (input.interestRate < 0) errors.interestRate = 'Rate cannot be negative'
  if (input.term <= 0) errors.term = 'Term must be positive'
  if (input.mode === 'standard') {
    if (!input.loanAmount || input.loanAmount <= 0) errors.loanAmount = 'Loan amount must be positive'
  } else {
    if (!input.vehiclePrice || input.vehiclePrice <= 0) errors.vehiclePrice = 'Vehicle price must be positive'
    const price = input.vehiclePrice ?? 0
    const financed =
      price +
      price * ((input.salesTaxRate ?? 0) / 100) +
      (input.taxableFees ?? 0) -
      (input.cashDown ?? 0) -
      (input.tradeIn ?? 0) -
      (input.rebates ?? 0)
    if (price > 0 && financed <= 0) {
      errors.cashDown = 'Down payment, trade-in, and rebates cannot exceed the price, tax, and financed fees'
    }
  }
  if (Object.keys(errors).length) return { valid: false as const, errors }
  return { valid: true as const, data: input }
}
