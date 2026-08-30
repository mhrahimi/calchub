import { convertUnits } from '@/units/convert'
import { getUnit } from '@/units/registry'
import type { ConversionInput, ConversionResult } from './types'
import type { CalculationExplanation, TableData } from '@/calculators/types'

export function calculateConversion(input: ConversionInput): ConversionResult {
  const outputValue = convertUnits(input.value, input.fromUnitId, input.toUnitId)
  const from = getUnit(input.fromUnitId)!
  const to = getUnit(input.toUnitId)!
  return {
    inputValue: input.value,
    outputValue,
    fromUnitId: input.fromUnitId,
    toUnitId: input.toUnitId,
    fromSymbol: from.symbol,
    toSymbol: to.symbol,
    category: input.category,
  }
}

export function explainConversion(input: ConversionInput, result: ConversionResult): CalculationExplanation {
  const from = getUnit(input.fromUnitId)!
  const to = getUnit(input.toUnitId)!
  if (from.kind === 'affine' && to.kind === 'affine') {
    return {
      title: 'Unit conversion',
      steps: [
        {
          label: 'Affine path',
          expression: `${from.symbol} → Kelvin → ${to.symbol}`,
        },
      ],
      assumptions: ['Temperature is not a simple multiplier; it uses an offset plus a scale.'],
    }
  }
  const fromFactor = from.kind === 'multiplicative' ? from.factor : 1
  const toFactor = to.kind === 'multiplicative' ? to.factor : 1
  return {
    title: 'Unit conversion',
    steps: [
      {
        label: 'Via base unit',
        expression: `${result.fromSymbol} × ${fromFactor} / ${toFactor} → ${result.toSymbol}`,
      },
    ],
    assumptions: ['Each unit has a factor relative to a canonical base for that dimension.'],
  }
}

export function buildConversionTable(result: ConversionResult): TableData {
  return {
    title: 'Conversion',
    columns: [
      { key: 'field', label: 'Field', align: 'left' },
      { key: 'value', label: 'Value', align: 'left' },
    ],
    rows: [
      { field: 'Input', value: `${result.inputValue} ${result.fromSymbol}` },
      { field: 'Output', value: `${result.outputValue} ${result.toSymbol}` },
      { field: 'Category', value: result.category },
    ],
  }
}
