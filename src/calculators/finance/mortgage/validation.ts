import { z } from 'zod'
import { mortgageStartParts } from './calculate'
import type { MortgageInput } from './types'

const money = z.number().finite('Enter a finite amount').min(0, 'Amount cannot be negative').max(1e12, 'Enter an amount of 1 trillion or less')

const oneTimeExtraSchema = z.object({
  amount: money,
  year: z.number().int().min(1900).max(2200),
  month: z.number().int().min(1).max(12),
})

export const mortgageSchema = z.object({
  country: z.enum(['US', 'CA']),
  homePrice: money.min(1, 'Home price must be positive'),
  downPayment: money,
  downPaymentIsPercent: z.boolean(),
  interestRate: z.number().finite('Enter a finite interest rate').min(0).max(100, 'Enter a rate of 100% or less'),
  termYears: z.number().int('Enter whole years; use months for a partial year').min(0).max(50, 'Use an amortization of 50 years or less'),
  termMonths: z.number().int('Enter a whole number of months').min(0).max(600, 'Use an amortization of 600 months or less'),
  includeTaxesAndCosts: z.boolean().default(false),
  propertyTax: money,
  propertyTaxPeriod: z.enum(['monthly', 'annual']),
  homeInsurance: money,
  hoa: money,
  pmi: money,
  otherCosts: money,
  includeExtraPayments: z.boolean().default(false),
  extraPayment: money.optional(),
  extraFrequency: z.enum(['every', 'yearly', 'once']).optional(),
  monthlyExtraPayment: money.optional(),
  yearlyExtraPayment: money.optional(),
  startYear: z.number().int().min(1900).max(2200).optional(),
  startMonth: z.number().int().min(1).max(12).optional(),
  oneTimeExtraPayments: z.array(oneTimeExtraSchema).optional(),
})

function monthIndex(year: number, month: number) {
  return year * 12 + (month - 1)
}

export function validateMortgage(input: MortgageInput) {
  const result = mortgageSchema.safeParse(input)
  if (!result.success) {
    const errors: Record<string, string> = {}
    result.error.errors.forEach((e) => {
      const key = e.path.map(String).join('.')
      if (key) errors[key] = e.message
    })
    return { valid: false as const, errors }
  }
  const down = input.downPaymentIsPercent
    ? (input.homePrice * input.downPayment) / 100
    : input.downPayment
  if (down >= input.homePrice) {
    return { valid: false as const, errors: { downPayment: 'Down payment must be less than the home price' } }
  }
  if (Math.round((input.homePrice - down) * 100) < 1) {
    return { valid: false as const, errors: { downPayment: 'Leave at least 0.01 to finance' } }
  }
  const totalMonths = input.termYears * 12 + input.termMonths
  if (totalMonths < 1) {
    return { valid: false as const, errors: { termYears: 'Term must be at least 1 month' } }
  }
  if (totalMonths > 600) {
    return { valid: false as const, errors: { termYears: 'Total amortization must be 50 years or less' } }
  }
  if (input.includeExtraPayments) {
    const { startYear, startMonth } = mortgageStartParts(input)
    const first = monthIndex(startYear, startMonth)
    const last = first + totalMonths - 1
    const rangeErrors: Record<string, string> = {}
    ;(input.oneTimeExtraPayments ?? []).forEach((payment, index) => {
      if (payment.amount <= 0) return
      const at = monthIndex(payment.year, payment.month)
      if (at < first || at > last) {
        rangeErrors[`oneTimeExtraPayments.${index}.month`] =
          'Extra payment must fall within the loan term'
      }
    })
    if (Object.keys(rangeErrors).length > 0) {
      return { valid: false as const, errors: rangeErrors }
    }
  }
  return { valid: true as const, data: result.data }
}
