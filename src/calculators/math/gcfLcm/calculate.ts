import { gcdMultiple, lcmMultiple, euclideanSteps, primeFactors, formatPrimeFactors } from '@/utils/gcd'
import type { GcfLcmInput, GcfLcmResult } from './types'
import type { CalculationExplanation, TableData } from '@/calculators/types'

export function calculateGcfLcm(input: GcfLcmInput): GcfLcmResult {
  const inputs = input.values.split(/[\s,;]+/).filter(Boolean).map((v) => BigInt(v.trim()))
  const gcf = gcdMultiple(inputs)
  const lcm = lcmMultiple(inputs)
  const steps = inputs.length >= 2 ? euclideanSteps(inputs[0], inputs[1]) : []
  const factors = inputs.map((n) => ({
    value: n.toString(),
    factors: formatPrimeFactors(primeFactors(n)),
  }))
  return { inputs, gcf, lcm, euclideanSteps: steps, primeFactors: factors }
}

export function explainGcfLcm(_input: GcfLcmInput, result: GcfLcmResult): CalculationExplanation {
  return {
    title: 'GCF and LCM',
    steps: [
      {
        label: 'GCF',
        expression: result.inputs.length >= 2
          ? 'gcd via the Euclidean algorithm (steps in the table below)'
          : 'gcd of a single value is the value itself',
      },
      {
        label: 'LCM',
        expression: 'lcm(a, b) = |a × b| / gcd(a, b); extend pairwise for more than two numbers',
      },
    ],
    assumptions: ['gcd(0, a) = |a|; lcm(0, a) = 0'],
  }
}

export function buildGcfLcmTable(result: GcfLcmResult): TableData {
  return {
    title: 'Euclidean algorithm',
    columns: [
      { key: 'step', label: 'Step', align: 'right' },
      { key: 'a', label: 'a', align: 'right' },
      { key: 'b', label: 'b', align: 'right' },
      { key: 'remainder', label: 'Remainder', align: 'right' },
    ],
    rows: result.euclideanSteps.map((s) => ({
      step: s.step,
      a: s.a,
      b: s.b,
      remainder: s.remainder,
    })),
  }
}
