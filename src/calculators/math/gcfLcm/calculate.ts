import { gcdMultiple, lcmMultiple, euclideanSteps, primeFactors, formatPrimeFactors, FactorizationLimitError, gcdBigInt, lcmBigInt } from '@/utils/gcd'
import { validateGcfLcm } from './validation'
import type { GcfLcmInput, GcfLcmResult } from './types'
import type { CalculationExplanation, TableData } from '@/calculators/types'

export function calculateGcfLcm(input: GcfLcmInput): GcfLcmResult {
  const validation = validateGcfLcm(input)
  if (!validation.valid) throw new Error(Object.values(validation.errors)[0])
  const inputs = input.values.split(/[\s,;]+/).filter(Boolean).map((v) => BigInt(v.trim()))
  const gcf = gcdMultiple(inputs)
  const lcm = lcmMultiple(inputs)
  const euclid = inputs.length < 2 ? [] : inputs.slice(1).reduce<{ running: bigint; steps: ReturnType<typeof euclideanSteps> }>((state, value) => {
    const nextSteps = euclideanSteps(state.running, value).map((step, index) => ({ ...step, step: state.steps.length + index + 1 }))
    return { running: gcdBigInt(state.running, value), steps: [...state.steps, ...nextSteps] }
  }, { running: inputs[0], steps: [] }).steps
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
  return { inputs, gcf, lcm, euclideanSteps: euclid, primeFactors: factors, warnings }
}

export function explainGcfLcm(_input: GcfLcmInput, result: GcfLcmResult): CalculationExplanation {
  const fold = (op: (a: bigint, b: bigint) => bigint, symbol: string) => {
    if (result.inputs.length < 2) return `${symbol}(${result.inputs[0] ?? 0}) = ${result.inputs[0] ?? 0}`
    let acc = result.inputs[0]
    const lines = result.inputs.slice(1).map((value) => {
      const next = op(acc, value)
      const line = `${symbol}(${acc}, ${value}) = ${next}`
      acc = next
      return line
    })
    return lines.join('; ')
  }
  return {
    title: 'GCF and LCM',
    steps: [
      { label: 'GCF', expression: fold(gcdBigInt, 'gcd'), result: result.gcf.toString() },
      { label: 'LCM', expression: fold(lcmBigInt, 'lcm'), result: result.lcm.toString() },
    ],
    assumptions: ['gcd(0, a) = |a|; lcm(0, a) = 0', 'The Euclidean table shows each pairwise reduction, including every number after the first pair.'],
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
