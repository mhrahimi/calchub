import type { TrigonometryInput, TrigonometryResult } from './types'
import type { CalculationExplanation, TableData } from '@/calculators/types'

const DEG = Math.PI / 180

function toRad(angle: number, unit: TrigonometryInput['angleUnit']): number {
  return unit === 'degrees' ? angle * DEG : angle
}

function toDisplay(angleRad: number, unit: TrigonometryInput['angleUnit']): number {
  return unit === 'degrees' ? angleRad / DEG : angleRad
}

export function calculateTrigonometry(input: TrigonometryInput): TrigonometryResult {
  let opposite = input.opposite
  let adjacent = input.adjacent
  let hypotenuse = input.hypotenuse
  let angleRad: number | undefined = input.angle !== undefined ? toRad(input.angle, input.angleUnit) : undefined

  if (opposite !== undefined && adjacent !== undefined) {
    hypotenuse = Math.sqrt(opposite * opposite + adjacent * adjacent)
    angleRad = Math.atan(opposite / adjacent)
  } else if (opposite !== undefined && hypotenuse !== undefined) {
    adjacent = Math.sqrt(hypotenuse * hypotenuse - opposite * opposite)
    angleRad = Math.asin(opposite / hypotenuse)
  } else if (adjacent !== undefined && hypotenuse !== undefined) {
    opposite = Math.sqrt(hypotenuse * hypotenuse - adjacent * adjacent)
    angleRad = Math.acos(adjacent / hypotenuse)
  } else if (angleRad !== undefined && adjacent !== undefined) {
    opposite = adjacent * Math.tan(angleRad)
    hypotenuse = adjacent / Math.cos(angleRad)
  } else if (angleRad !== undefined && opposite !== undefined) {
    adjacent = opposite / Math.tan(angleRad)
    hypotenuse = opposite / Math.sin(angleRad)
  } else if (angleRad !== undefined && hypotenuse !== undefined) {
    opposite = hypotenuse * Math.sin(angleRad)
    adjacent = hypotenuse * Math.cos(angleRad)
  }

  opposite = opposite!
  adjacent = adjacent!
  hypotenuse = hypotenuse!
  angleRad = angleRad ?? Math.atan(opposite / adjacent)
  const angleA = toDisplay(angleRad, input.angleUnit)
  const angleB = toDisplay(Math.PI / 2 - angleRad, input.angleUnit)

  return {
    opposite,
    adjacent,
    hypotenuse,
    angleA,
    angleB,
    sinA: opposite / hypotenuse,
    cosA: adjacent / hypotenuse,
    tanA: opposite / adjacent,
    angleUnit: input.angleUnit,
    vertices: [
      { x: 0, y: 0 },
      { x: adjacent, y: 0 },
      { x: adjacent, y: opposite },
    ],
  }
}

export function explainTrigonometry(_input: TrigonometryInput, result: TrigonometryResult): CalculationExplanation {
  return {
    title: 'Right triangle trigonometry',
    steps: [
      { label: 'Pythagorean theorem', expression: 'c² = a² + b²', result: result.hypotenuse.toFixed(4) },
      { label: 'Complementary angle', result: `${result.angleB.toFixed(2)} ${result.angleUnit}` },
    ],
  }
}

export function buildTrigonometryTable(result: TrigonometryResult): TableData {
  const unit = result.angleUnit === 'degrees' ? '°' : ' rad'
  return {
    title: 'Results',
    columns: [
      { key: 'metric', label: 'Metric', align: 'left' },
      { key: 'value', label: 'Value', align: 'right' },
    ],
    rows: [
      { metric: 'Opposite', value: result.opposite.toFixed(4) },
      { metric: 'Adjacent', value: result.adjacent.toFixed(4) },
      { metric: 'Hypotenuse', value: result.hypotenuse.toFixed(4) },
      { metric: 'Angle A', value: `${result.angleA.toFixed(4)}${unit}` },
      { metric: 'Angle B', value: `${result.angleB.toFixed(4)}${unit}` },
      { metric: 'sin(A)', value: result.sinA.toFixed(6) },
      { metric: 'cos(A)', value: result.cosA.toFixed(6) },
      { metric: 'tan(A)', value: result.tanA.toFixed(6) },
    ],
  }
}
