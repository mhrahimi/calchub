import type { UnitDimension } from '@/units/registry'

export interface ConversionInput {
  value: number
  fromUnitId: string
  toUnitId: string
  category: UnitDimension
}

export interface ConversionResult {
  inputValue: number
  outputValue: number
  fromUnitId: string
  toUnitId: string
  fromSymbol: string
  toSymbol: string
  category: UnitDimension
}
