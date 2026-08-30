import { parseDataset, computeDescriptiveStats, buildHistogramBins } from '@/utils/statistics'
import type { StandardDeviationInput, StandardDeviationResult } from './types'
import type { CalculationExplanation, ChartData, TableData } from '@/calculators/types'

export function calculateStandardDeviation(input: StandardDeviationInput): StandardDeviationResult {
  const values = parseDataset(input.dataset)
  const stats = computeDescriptiveStats(values)
  return { ...stats, values }
}

export function explainStandardDeviation(
  _input: StandardDeviationInput,
  result: StandardDeviationResult,
): CalculationExplanation {
  return {
    title: 'Standard deviation',
    steps: [
      { label: 'Population SD (σ)', expression: '√(Σ(x−μ)²/N)', result: result.populationSd.toFixed(6) },
      { label: 'Sample SD (s)', expression: '√(Σ(x−x̄)²/(n−1))', result: result.sampleSd.toFixed(6) },
    ],
    assumptions: ['Sample SD requires at least two values.', 'Computed with Welford’s method.'],
  }
}

export function buildStandardDeviationCharts(result: StandardDeviationResult): ChartData[] {
  const bins = buildHistogramBins(result.values)
  return [{
    type: 'bar',
    title: 'Histogram',
    series: [{ name: 'Frequency', data: bins.map((b) => ({ x: b.bin, y: b.count })), color: '#163B8C' }],
  }]
}

export function buildStandardDeviationTable(result: StandardDeviationResult): TableData {
  return {
    title: 'Summary statistics',
    columns: [
      { key: 'metric', label: 'Metric', align: 'left' },
      { key: 'value', label: 'Value', align: 'right' },
    ],
    rows: [
      { metric: 'Count (n)', value: result.count },
      { metric: 'Sum', value: result.sum.toFixed(4) },
      { metric: 'Mean', value: result.mean.toFixed(4) },
      { metric: 'Min', value: result.min.toFixed(4) },
      { metric: 'Max', value: result.max.toFixed(4) },
      { metric: 'Range', value: result.range.toFixed(4) },
      { metric: 'Population variance', value: result.populationVariance.toFixed(6) },
      { metric: 'Sample variance', value: result.sampleVariance.toFixed(6) },
      { metric: 'Population SD (σ)', value: result.populationSd.toFixed(6) },
      { metric: 'Sample SD (s)', value: result.sampleSd.toFixed(6) },
    ],
  }
}
