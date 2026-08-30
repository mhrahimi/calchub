import type { LoanInput } from './types'

export function validateLoan(input: LoanInput) {
  const errors: Record<string, string> = {}
  if (input.interestRate < 0) errors.interestRate = 'Rate cannot be negative'
  if (input.term <= 0) errors.term = 'Term must be positive'
  if (input.mode === 'standard') {
    if (!input.loanAmount || input.loanAmount <= 0) errors.loanAmount = 'Loan amount must be positive'
  } else {
    if (!input.vehiclePrice || input.vehiclePrice <= 0) errors.vehiclePrice = 'Vehicle price must be positive'
  }
  if (Object.keys(errors).length) return { valid: false as const, errors }
  return { valid: true as const, data: input }
}
