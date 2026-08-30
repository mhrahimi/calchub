import { generateRandomNumbers } from '@/utils/random'
import { buildHistogramBins } from '@/utils/statistics'
import type { RandomNumberInput, RandomNumberResult } from './types'
import type { CalculationExplanation, ChartData, TableData } from '@/calculators/types'

export function calculateRandomNumber(input: RandomNumberInput): RandomNumberResult {
  let values = generateRandomNumbers({
    min: input.min,
    max: input.max,
    count: input.count,
    integer: input.integer,
    unique: input.unique,
    decimalPlaces: input.decimalPlaces,
  })
  if (input.sortResults) values = [...values].sort((a, b) => a - b)
  return {
    values,
    min: input.min,
    max: input.max,
    count: input.count,
    integer: input.integer,
    unique: input.unique,
  }
}

export function explainRandomNumber(_input: RandomNumberInput, result: RandomNumberResult): CalculationExplanation {
  return {
    title: 'Random number generation',
    steps: [
      { label: 'RNG source', result: 'crypto.getRandomValues (CSPRNG)' },
      { label: 'Integer mapping', result: result.integer ? 'Unbiased rejection sampling' : 'Uniform real in [min, max)' },
    ],
    assumptions: ['Not suitable for cryptographic key generation without additional review.'],
  }
}

export function buildRandomNumberCharts(result: RandomNumberResult): ChartData[] {
  if (result.values.length < 2) return []
  const bins = buildHistogramBins(result.values, Math.min(10, result.values.length))
  return [{
    type: 'bar',
    title: 'Frequency histogram',
    series: [{ name: 'Count', data: bins.map((b) => ({ x: b.bin, y: b.count })), color: '#163B8C' }],
  }]
}

export function buildRandomNumberTable(result: RandomNumberResult): TableData {
  return {
    title: 'Generated values',
    columns: [
      { key: 'index', label: '#', align: 'right' },
      { key: 'value', label: 'Value', align: 'right' },
    ],
    rows: result.values.map((v, i) => ({ index: i + 1, value: v })),
  }
}
