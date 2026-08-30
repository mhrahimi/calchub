import type { TrigonometryInput } from './types'

export function validateTrigonometry(input: TrigonometryInput) {
  const errors: Record<string, string> = {}
  const provided = [input.opposite, input.adjacent, input.hypotenuse, input.angle].filter((v) => v !== undefined)
  if (provided.length < 2) errors.opposite = 'Provide at least two values'
  if (input.hypotenuse !== undefined && input.hypotenuse <= 0) errors.hypotenuse = 'Hypotenuse must be positive'
  if (input.opposite !== undefined && input.opposite <= 0) errors.opposite = 'Side lengths must be positive'
  if (input.adjacent !== undefined && input.adjacent <= 0) errors.adjacent = 'Side lengths must be positive'
  if (Object.keys(errors).length) return { valid: false as const, errors }
  return { valid: true as const, data: input }
}
