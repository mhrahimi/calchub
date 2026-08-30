export type AngleUnit = 'degrees' | 'radians'

export interface TrigonometryInput {
  angleUnit: AngleUnit
  opposite?: number
  adjacent?: number
  hypotenuse?: number
  angle?: number
}

export interface TrigonometryResult {
  opposite: number
  adjacent: number
  hypotenuse: number
  angleA: number
  angleB: number
  sinA: number
  cosA: number
  tanA: number
  angleUnit: AngleUnit
  vertices: Array<{ x: number; y: number }>
}
