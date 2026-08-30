import type { IncomeTaxInput } from './types'

export function validateIncomeTax(input: IncomeTaxInput) {
  const errors: Record<string, string> = {}
  if (input.grossIncome < 0) errors.grossIncome = 'Gross income cannot be negative'
  if (input.pretaxDeductions < 0) errors.pretaxDeductions = 'Deductions cannot be negative'
  if (!input.jurisdictionId) errors.jurisdictionId = 'State or province is required'
  if (input.country === 'US' && !input.filingStatus) {
    errors.filingStatus = 'Filing status is required for United States'
  }
  if (input.taxYear !== 2026) errors.taxYear = 'Only tax year 2026 is supported'
  if (Object.keys(errors).length) return { valid: false as const, errors }
  return { valid: true as const, data: input }
}
