import { z } from 'zod'
import type { MortgageInput } from './types'

export const mortgageSchema = z.object({
  country: z.enum(['US', 'CA']),
  homePrice: z.number().min(1, 'Home price must be positive'),
  downPayment: z.number().min(0),
  downPaymentIsPercent: z.boolean(),
  interestRate: z.number().min(0),
  term: z.number().min(1),
  termUnit: z.enum(['years', 'months']),
  propertyTax: z.number().min(0),
  propertyTaxPeriod: z.enum(['monthly', 'annual']),
  homeInsurance: z.number().min(0),
  hoa: z.number().min(0),
  pmi: z.number().min(0),
  otherCosts: z.number().min(0),
  extraPayment: z.number().min(0).optional(),
})

export function validateMortgage(input: MortgageInput) {
  const result = mortgageSchema.safeParse(input)
  if (!result.success) {
    const errors: Record<string, string> = {}
    result.error.errors.forEach((e) => {
      if (e.path[0]) errors[String(e.path[0])] = e.message
    })
    return { valid: false as const, errors }
  }
  const down = input.downPaymentIsPercent
    ? (input.homePrice * input.downPayment) / 100
    : input.downPayment
  if (down >= input.homePrice) {
    return { valid: false as const, errors: { downPayment: 'Down payment cannot exceed home price' } }
  }
  return { valid: true as const, data: result.data }
}
