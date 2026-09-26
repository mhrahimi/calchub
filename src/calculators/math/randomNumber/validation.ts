import type { RandomNumberInput } from './types'
import { randomInputErrors } from '@/utils/random'

export function validateRandomNumber(input: RandomNumberInput) {
  const errors = randomInputErrors(input)
  if (Object.keys(errors).length) return { valid: false as const, errors }
  return { valid: true as const, data: input }
}
