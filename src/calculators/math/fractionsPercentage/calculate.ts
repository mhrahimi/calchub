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
  _result: FractionsPercentageResult,
): CalculationExplanation {
  if (input.mode === 'fraction') {
    const op = input.fractionOperation ?? 'add'
    const expressions: Record<typeof op, string> = {
      add: 'a/b + c/d = (ad + bc) / bd, then reduce',
      subtract: 'a/b − c/d = (ad − bc) / bd, then reduce',
      multiply: 'a/b × c/d = (a × c) / (b × d), then reduce',
      divide: 'a/b ÷ c/d = (a × d) / (b × c), then reduce',
    }
    return {
      title: 'Fraction arithmetic',
      steps: [{ label: op[0].toUpperCase() + op.slice(1), expression: expressions[op] }],
    }
  }
  const mode = input.percentageMode ?? 'percentOf'
  const expressions = {
    percentOf: 'value = (percent / 100) × base',
    whatPercent: 'percent = 100 × part / whole',
    percentChange: 'change = 100 × (new − old) / |old|',
  }
  return {
    title: 'Percentage calculation',
    steps: [{ label: mode, expression: expressions[mode] }],
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
