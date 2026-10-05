import { CalculationError } from '@/utils/rootSolve'
import { solveTriangle } from './solver'
import { validateTriangle } from './validation'
import type { TriangleInput, TriangleResult } from './types'
import type { CalculationExplanation, TableData } from '@/calculators/types'

export function calculateTriangle(input: TriangleInput): TriangleResult {
  const validation = validateTriangle(input)
  if (!validation.valid) {
    throw new CalculationError('invalid_domain', Object.values(validation.errors).join('. '))
  }
  const solutions = solveTriangle(
    input.case,
    input.sideA,
    input.sideB,
    input.sideC,
    input.angleA,
    input.angleB,
  )
  return {
    case: input.case,
    solutions,
    ambiguous: solutions.length > 1,
  }
}

export function explainTriangle(input: TriangleInput, result: TriangleResult): CalculationExplanation {
  const assumptions = [
    `Case: ${input.case}`,
    'Area via Heron’s formula.',
    result.ambiguous ? 'SSA produced two valid triangles.' : undefined,
  ].filter(Boolean) as string[]
  return {
    title: 'Triangle solution',
    steps: result.solutions.flatMap((s, i) => {
      const prefix = result.solutions.length > 1 ? `Solution ${i + 1} — ` : ''
      const semi = (s.sideA + s.sideB + s.sideC) / 2
      return [
        {
          label: `${prefix}Area`,
          expression: `s = (${s.sideA.toFixed(4)} + ${s.sideB.toFixed(4)} + ${s.sideC.toFixed(4)}) / 2 = ${semi.toFixed(4)}; area = √[s(s−a)(s−b)(s−c)]`,
          result: s.area.toFixed(4),
        },
        {
          label: `${prefix}Angles`,
          result: `A ${s.angleA.toFixed(2)}°, B ${s.angleB.toFixed(2)}°, C ${s.angleC.toFixed(2)}°`,
        },
      ]
    }),
    assumptions,
  }
}

export function buildTriangleTable(result: TriangleResult): TableData {
  const rows = result.solutions.flatMap((s, i) => [
    { solution: `${i + 1}`, metric: 'Side a', value: s.sideA.toFixed(4) },
    { solution: `${i + 1}`, metric: 'Side b', value: s.sideB.toFixed(4) },
    { solution: `${i + 1}`, metric: 'Side c', value: s.sideC.toFixed(4) },
    { solution: `${i + 1}`, metric: 'Angle A', value: `${s.angleA.toFixed(2)}°` },
    { solution: `${i + 1}`, metric: 'Angle B', value: `${s.angleB.toFixed(2)}°` },
    { solution: `${i + 1}`, metric: 'Angle C', value: `${s.angleC.toFixed(2)}°` },
    { solution: `${i + 1}`, metric: 'Area', value: s.area.toFixed(4) },
    { solution: `${i + 1}`, metric: 'Perimeter', value: s.perimeter.toFixed(4) },
  ])
  return {
    title: 'Triangle results',
    columns: [
      { key: 'solution', label: 'Solution', align: 'right' },
      { key: 'metric', label: 'Metric', align: 'left' },
      { key: 'value', label: 'Value', align: 'right' },
    ],
    rows,
  }
}
