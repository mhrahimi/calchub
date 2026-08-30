import { getUnit } from '@/units/registry'
import { areUnitsCompatible } from '@/units/convert'
import type { ConversionInput } from './types'

export function validateConversion(input: ConversionInput) {
  const errors: Record<string, string> = {}
  if (!Number.isFinite(input.value)) errors.value = 'Enter a valid number'
  const from = getUnit(input.fromUnitId)
  const to = getUnit(input.toUnitId)
  if (!from) errors.fromUnitId = 'Select a source unit'
  if (!to) errors.toUnitId = 'Select a target unit'
  if (from && to && !areUnitsCompatible(input.fromUnitId, input.toUnitId)) {
    errors.toUnitId = `Cannot convert ${from.dimension} to ${to.dimension}`
  }
  if (Object.keys(errors).length) return { valid: false as const, errors }
  return { valid: true as const, data: input }
}
