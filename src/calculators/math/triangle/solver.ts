import type { TriangleCase, TriangleSolution } from './types'

const DEG = Math.PI / 180

function toRad(deg: number): number {
  return deg * DEG
}

function toDeg(rad: number): number {
  return rad / DEG
}

function clamp(v: number, lo = -1, hi = 1): number {
  return Math.max(lo, Math.min(hi, v))
}

function heronArea(a: number, b: number, c: number): number {
  const s = (a + b + c) / 2
  const areaSq = s * (s - a) * (s - b) * (s - c)
  return areaSq <= 0 ? 0 : Math.sqrt(areaSq)
}

function buildVertices(a: number, b: number, c: number): Array<{ x: number; y: number }> {
  const xB = a
  const cosC = clamp((a * a + b * b - c * c) / (2 * a * b))
  const sinC = Math.sqrt(Math.max(0, 1 - cosC * cosC))
  const xC = b * cosC
  const yC = b * sinC
  return [
    { x: 0, y: 0 },
    { x: xB, y: 0 },
    { x: xC, y: yC },
  ]
}

function makeSolution(a: number, b: number, c: number, A: number, B: number, C: number): TriangleSolution {
  return {
    sideA: a,
    sideB: b,
    sideC: c,
    angleA: A,
    angleB: B,
    angleC: C,
    area: heronArea(a, b, c),
    perimeter: a + b + c,
    vertices: buildVertices(a, b, c),
  }
}

function lawOfCosinesSide(b: number, c: number, Adeg: number): number {
  const A = toRad(Adeg)
  return Math.sqrt(b * b + c * c - 2 * b * c * Math.cos(A))
}

function lawOfSinesAngle(opposite: number, knownOpposite: number, knownAngleDeg: number): number {
  return toDeg(Math.asin(clamp((opposite * Math.sin(toRad(knownAngleDeg))) / knownOpposite)))
}

export function solveTriangle(
  triangleCase: TriangleCase,
  sideA?: number,
  sideB?: number,
  sideC?: number,
  angleA?: number,
  angleB?: number,
): TriangleSolution[] {
  switch (triangleCase) {
    case 'SSS': {
      const a = sideA!
      const b = sideB!
      const c = sideC!
      const A = toDeg(Math.acos(clamp((b * b + c * c - a * a) / (2 * b * c))))
      const B = toDeg(Math.acos(clamp((a * a + c * c - b * b) / (2 * a * c))))
      const C = 180 - A - B
      return [makeSolution(a, b, c, A, B, C)]
    }
    case 'SAS': {
      const b = sideB!
      const c = sideC!
      const A = angleA!
      const a = lawOfCosinesSide(b, c, A)
      const B = lawOfSinesAngle(b, a, A)
      const C = 180 - A - B
      return [makeSolution(a, b, c, A, B, C)]
    }
    case 'ASA': {
      const A = angleA!
      const B = angleB!
      const C = 180 - A - B
      const c = sideC!
      const a = (c * Math.sin(toRad(A))) / Math.sin(toRad(C))
      const b = (c * Math.sin(toRad(B))) / Math.sin(toRad(C))
      return [makeSolution(a, b, c, A, B, C)]
    }
    case 'AAS': {
      const A = angleA!
      const B = angleB!
      const C = 180 - A - B
      const a = sideA!
      const b = (a * Math.sin(toRad(B))) / Math.sin(toRad(A))
      const c = (a * Math.sin(toRad(C))) / Math.sin(toRad(A))
      return [makeSolution(a, b, c, A, B, C)]
    }
    case 'SSA': {
      const a = sideA!
      const b = sideB!
      const A = angleA!
      const sinB = (b * Math.sin(toRad(A))) / a
      if (sinB > 1) return []
      if (Math.abs(sinB - 1) < 1e-10) {
        const B = 90
        const C = 180 - A - B
        const c = (a * Math.sin(toRad(C))) / Math.sin(toRad(A))
        return [makeSolution(a, b, c, A, B, C)]
      }
      const B1 = toDeg(Math.asin(sinB))
      const C1 = 180 - A - B1
      const c1 = (a * Math.sin(toRad(C1))) / Math.sin(toRad(A))
      const sol1 = makeSolution(a, b, c1, A, B1, C1)

      const B2 = 180 - B1
      if (B2 + A >= 180) return [sol1]
      const C2 = 180 - A - B2
      const c2 = (a * Math.sin(toRad(C2))) / Math.sin(toRad(A))
      const sol2 = makeSolution(a, b, c2, A, B2, C2)
      if (Math.abs(B1 - B2) < 1e-6) return [sol1]
      return [sol1, sol2]
    }
    default:
      return []
  }
}

export function isValidTriangle(a: number, b: number, c: number): boolean {
  return a + b > c && a + c > b && b + c > a && a > 0 && b > 0 && c > 0
}
