import { convertBase } from '@/utils/baseConvert'
import type { NumberBaseInput, NumberBaseResult } from './types'
import type { CalculationExplanation, TableData } from '@/calculators/types'

export function calculateNumberBase(input: NumberBaseInput): NumberBaseResult {
  const r = convertBase(input.value, input.fromBase, input.toBase, input.fractionalPrecision)
  return {
    sourceValue: r.sourceValue,
    sourceBase: r.sourceBase,
    targetBase: r.targetBase,
    targetValue: r.targetValue,
    steps: r.steps,
  }
}

export function explainNumberBase(input: NumberBaseInput, result: NumberBaseResult): CalculationExplanation {
  return {
    title: 'Base conversion',
    steps: result.steps.map((s) => ({ label: s.label, result: s.value })),
    assumptions: [`Fractional precision: ${input.fractionalPrecision} digits`],
  }
}

export function buildNumberBaseTable(result: NumberBaseResult): TableData {
  return {
    title: 'Conversion steps',
    columns: [
      { key: 'step', label: 'Step', align: 'left' },
      { key: 'value', label: 'Value', align: 'left' },
    ],
    rows: result.steps.map((s, i) => ({ step: s.label, value: s.value, _index: i })),
  }
}
