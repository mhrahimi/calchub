import { getUnit, type Unit } from './registry'

export function convertUnits(value: number, fromUnitId: string, toUnitId: string): number {
  const from = getUnit(fromUnitId)
  const to = getUnit(toUnitId)
  if (!from || !to) throw new Error('Unknown unit')
  if (from.dimension !== to.dimension) {
    throw new Error(`Cannot convert ${from.dimension} to ${to.dimension}`)
  }

  if (from.kind === 'affine' && to.kind === 'affine') {
    const base = from.toBase(value)
    return to.fromBase(base)
  }

  if (from.kind === 'multiplicative' && to.kind === 'multiplicative') {
    const base = value * from.factor
    return base / to.factor
  }

  throw new Error('Incompatible unit conversion types')
}

export function areUnitsCompatible(fromUnitId: string, toUnitId: string): boolean {
  const from = getUnit(fromUnitId)
  const to = getUnit(toUnitId)
  return !!from && !!to && from.dimension === to.dimension
}

export function formatConvertedValue(value: number, unit: Unit): string {
  const abs = Math.abs(value)
  let precision = 6
  if (abs >= 1000) precision = 2
  else if (abs >= 1) precision = 4
  else if (abs >= 0.01) precision = 6
  else precision = 8
  return `${value.toFixed(precision)} ${unit.symbol}`
}
