import { Fraction } from '@/utils/fractions'
import type { FractionsPercentageInput, FractionsPercentageResult } from './types'
import type { CalculationExplanation, TableData } from '@/calculators/types'

export function calculateFractionsPercentage(input: FractionsPercentageInput): FractionsPercentageResult {
  if (input.mode === 'fraction') {
    const a = Fraction.parse(input.fractionA!)
    const b = Fraction.parse(input.fractionB!)
    let result: Fraction
    switch (input.fractionOperation) {
      case 'subtract':
        result = a.sub(b)
        break
      case 'multiply':
        result = a.mul(b)
        break
      case 'divide':
        result = a.div(b)
        break
      default:
        result = a.add(b)
    }
    return {
      mode: 'fraction',
      primary: result.toImproperString(),
      improper: result.toImproperString(),
      mixed: result.toMixedString(),
      decimal: result.toDecimal(),
    }
  }

  const mode = input.percentageMode ?? 'percentOf'
  if (mode === 'percentOf') {
    const value = (input.percentValue! / 100) * input.baseValue!
    return {
      mode: 'percentage',
      primary: String(value),
      improper: String(value),
      mixed: String(value),
      decimal: value,
      percentageLabel: `${input.percentValue}% of ${input.baseValue}`,
    }
  }
  if (mode === 'whatPercent') {
    const pct = (100 * input.percentValue!) / input.baseValue!
    return {
      mode: 'percentage',
      primary: `${pct}%`,
      improper: `${pct}%`,
      mixed: `${pct}%`,
      decimal: pct,
      percentageLabel: `${input.percentValue} is what % of ${input.baseValue}`,
    }
  }
  const pct = (100 * (input.newValue! - input.oldValue!)) / Math.abs(input.oldValue!)
  return {
    mode: 'percentage',
    primary: `${pct}%`,
    improper: `${pct}%`,
    mixed: `${pct}%`,
    decimal: pct,
    percentageLabel: `Change from ${input.oldValue} to ${input.newValue}`,
  }
}

export function explainFractionsPercentage(
  input: FractionsPercentageInput,
  result: FractionsPercentageResult,
): CalculationExplanation {
  if (input.mode === 'fraction') {
    const op = input.fractionOperation ?? 'add'
    const a = Fraction.parse(input.fractionA!)
    const b = Fraction.parse(input.fractionB!)
    const left = a.toImproperString()
    const right = b.toImproperString()
    const expressions: Record<typeof op, string> = {
      add: `${left} + ${right} = (${a.num}×${b.den} + ${b.num}×${a.den}) / (${a.den}×${b.den}) = ${result.primary}`,
      subtract: `${left} − ${right} = (${a.num}×${b.den} − ${b.num}×${a.den}) / (${a.den}×${b.den}) = ${result.primary}`,
      multiply: `${left} × ${right} = (${a.num}×${b.num}) / (${a.den}×${b.den}) = ${result.primary}`,
      divide: `${left} ÷ ${right} = (${a.num}×${b.den}) / (${a.den}×${b.num}) = ${result.primary}`,
    }
    return {
      title: 'Fraction arithmetic',
      steps: [{ label: op[0].toUpperCase() + op.slice(1), expression: expressions[op], result: result.primary }],
    }
  }
  const mode = input.percentageMode ?? 'percentOf'
  const expressions = {
    percentOf: `${input.percentValue}% of ${input.baseValue} = (${input.percentValue} / 100) × ${input.baseValue} = ${result.primary}`,
    whatPercent: `${input.percentValue} is what % of ${input.baseValue} = 100 × ${input.percentValue} / ${input.baseValue} = ${result.primary}`,
    percentChange: `Change from ${input.oldValue} to ${input.newValue} = 100 × (${input.newValue} − ${input.oldValue}) / |${input.oldValue}| = ${result.primary}`,
  }
  return {
    title: 'Percentage calculation',
    steps: [{ label: mode, expression: expressions[mode], result: result.primary }],
    assumptions: ['Percent change from zero is undefined.'],
  }
}

export function buildFractionsPercentageTable(result: FractionsPercentageResult): TableData {
  return {
    title: 'Result',
    columns: [
      { key: 'format', label: 'Format', align: 'left' },
      { key: 'value', label: 'Value', align: 'left' },
    ],
    rows: [
      { format: 'Primary', value: result.primary },
      { format: 'Decimal', value: result.decimal.toFixed(6) },
    ],
  }
}
