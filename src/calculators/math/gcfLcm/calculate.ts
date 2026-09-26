import { gcdMultiple, lcmMultiple, euclideanSteps, primeFactors, formatPrimeFactors, FactorizationLimitError } from '@/utils/gcd'
import { validateGcfLcm } from './validation'
import type { GcfLcmInput, GcfLcmResult } from './types'
import type { CalculationExplanation, TableData } from '@/calculators/types'

export function calculateGcfLcm(input: GcfLcmInput): GcfLcmResult {
  const validation = validateGcfLcm(input)
  if (!validation.valid) throw new Error(Object.values(validation.errors)[0])
  const inputs = input.values.split(/[\s,;]+/).filter(Boolean).map((v) => BigInt(v.trim()))
  const gcf = gcdMultiple(inputs)
  const lcm = lcmMultiple(inputs)
  const steps = inputs.length >= 2 ? euclideanSteps(inputs[0], inputs[1]) : []
  const warnings: string[] = []
  const factors = inputs.map((n) => {
    try {
      return { value: n.toString(), factors: formatPrimeFactors(primeFactors(n)) }
    } catch (error) {
      if (!(error instanceof FactorizationLimitError)) throw error
      if (!warnings.length) warnings.push('Some prime factorizations were omitted after reaching the calculation limit. GCF and LCM remain exact.')
      return { value: n.toString(), factors: 'Not expanded: calculation limit reached' }
    }
  })
  return { inputs, gcf, lcm, euclideanSteps: steps, primeFactors: factors, warnings }
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
