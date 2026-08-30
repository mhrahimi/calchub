export type TriangleCase = 'SSS' | 'SAS' | 'ASA' | 'AAS' | 'SSA'

export interface TriangleInput {
  case: TriangleCase
  sideA?: number
  sideB?: number
  sideC?: number
  angleA?: number
  angleB?: number
  angleC?: number
}

export interface TriangleSolution {
  sideA: number
  sideB: number
  sideC: number
  angleA: number
  angleB: number
  angleC: number
  area: number
  perimeter: number
  vertices: Array<{ x: number; y: number }>
}

export interface TriangleResult {
  case: TriangleCase
  solutions: TriangleSolution[]
  ambiguous: boolean
}
