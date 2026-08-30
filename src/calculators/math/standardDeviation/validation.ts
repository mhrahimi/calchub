import { parseDataset } from '@/utils/statistics'
import type { StandardDeviationInput } from './types'

export function validateStandardDeviation(input: StandardDeviationInput) {
  const errors: Record<string, string> = {}
  try {
    const values = parseDataset(input.dataset)
    if (values.length === 0) errors.dataset = 'Enter at least one value'
  } catch (e) {
    errors.dataset = e instanceof Error ? e.message : 'Invalid dataset'
  }
  if (Object.keys(errors).length) return { valid: false as const, errors }
  return { valid: true as const, data: input }
}
