import type { TriangleInput } from './types'
import { isValidTriangle } from './solver'

export function validateTriangle(input: TriangleInput) {
  const errors: Record<string, string> = {}
  const positive = (v: number | undefined, name: string) => {
    if (v === undefined || v <= 0) errors[name] = 'Must be a positive number'
  }
  const angle = (v: number | undefined, name: string) => {
    if (v === undefined || v <= 0 || v >= 180) errors[name] = 'Angle must be between 0° and 180°'
  }

  switch (input.case) {
    case 'SSS':
      positive(input.sideA, 'sideA')
      positive(input.sideB, 'sideB')
      positive(input.sideC, 'sideC')
      if (input.sideA && input.sideB && input.sideC && !isValidTriangle(input.sideA, input.sideB, input.sideC)) {
        errors.sideC = 'Sides do not satisfy the triangle inequality'
      }
      break
    case 'SAS':
      positive(input.sideB, 'sideB')
      positive(input.sideC, 'sideC')
      angle(input.angleA, 'angleA')
      break
    case 'ASA':
      angle(input.angleA, 'angleA')
      angle(input.angleB, 'angleB')
      if (input.angleA && input.angleB && input.angleA + input.angleB >= 180) {
        errors.angleB = 'Sum of angles A and B must be less than 180°'
      }
      positive(input.sideC, 'sideC')
      break
    case 'AAS':
      angle(input.angleA, 'angleA')
      angle(input.angleB, 'angleB')
      positive(input.sideA, 'sideA')
      break
    case 'SSA':
      positive(input.sideA, 'sideA')
      positive(input.sideB, 'sideB')
      angle(input.angleA, 'angleA')
      break
  }

  if (Object.keys(errors).length) return { valid: false as const, errors }
  return { valid: true as const, data: input }
}
