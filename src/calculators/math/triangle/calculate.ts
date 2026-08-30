import { solveTriangle } from './solver'
import type { TriangleInput, TriangleResult } from './types'
import type { CalculationExplanation, TableData } from '@/calculators/types'

export function calculateTriangle(input: TriangleInput): TriangleResult {
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
    steps: result.solutions.flatMap((s, i) => [
      { label: `Solution ${i + 1} — side a`, result: s.sideA.toFixed(4) },
      { label: `Solution ${i + 1} — angle A`, result: `${s.angleA.toFixed(2)}°` },
      { label: `Solution ${i + 1} — area`, result: s.area.toFixed(4) },
    ]),
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
