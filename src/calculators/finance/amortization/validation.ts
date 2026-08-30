import { z } from 'zod'
import type { AmortizationInput } from './types'

export const amortizationSchema = z.object({
  principal: z.number().min(0.01, 'Principal must be greater than zero'),
  interestRate: z.number().min(0, 'Interest rate cannot be negative'),
  term: z.number().min(1, 'Term must be positive'),
  termUnit: z.enum(['years', 'months']),
  paymentFrequency: z.string(),
  startDate: z.string().optional(),
  extraPayment: z.number().min(0).optional(),
  extraFrequency: z.enum(['every', 'monthly', 'yearly', 'once']).optional(),
})

export function validateAmortization(input: AmortizationInput) {
  const result = amortizationSchema.safeParse(input)
  if (!result.success) {
    const errors: Record<string, string> = {}
    result.error.errors.forEach((e) => {
      if (e.path[0]) errors[String(e.path[0])] = e.message
    })
    return { valid: false as const, errors }
  }
  return { valid: true as const, data: result.data }
}
