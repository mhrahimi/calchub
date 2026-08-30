export function absBigInt(n: bigint): bigint {
  return n < 0n ? -n : n
}

export function gcdBigInt(a: bigint, b: bigint): bigint {
  a = absBigInt(a)
  b = absBigInt(b)
  while (b !== 0n) {
    const t = a % b
    a = b
    b = t
  }
  return a
}

export function lcmBigInt(a: bigint, b: bigint): bigint {
  if (a === 0n || b === 0n) return 0n
  const g = gcdBigInt(a, b)
  return absBigInt((a / g) * b)
}

export function gcdMultiple(values: bigint[]): bigint {
  if (values.length === 0) return 0n
  return values.reduce((acc, v) => gcdBigInt(acc, v))
}

export function lcmMultiple(values: bigint[]): bigint {
  if (values.length === 0) return 0n
  return values.reduce((acc, v) => lcmBigInt(acc, v))
}

export interface EuclideanStep {
  step: number
  a: string
  b: string
  remainder: string
}

export function euclideanSteps(a: bigint, b: bigint): EuclideanStep[] {
  let x = absBigInt(a)
  let y = absBigInt(b)
  const steps: EuclideanStep[] = []
  let step = 1
  while (y !== 0n) {
    const r = x % y
    steps.push({
      step,
      a: x.toString(),
      b: y.toString(),
      remainder: r.toString(),
    })
    x = y
    y = r
    step++
  }
  return steps
}

export function primeFactors(n: bigint): Map<bigint, number> {
  let x = absBigInt(n)
  if (x <= 1n) return new Map()
  const factors = new Map<bigint, number>()
  let d = 2n
  while (d * d <= x) {
    while (x % d === 0n) {
      factors.set(d, (factors.get(d) ?? 0) + 1)
      x /= d
    }
    d = d === 2n ? 3n : d + 2n
  }
  if (x > 1n) factors.set(x, (factors.get(x) ?? 0) + 1)
  return factors
}

export function formatPrimeFactors(factors: Map<bigint, number>): string {
  if (factors.size === 0) return '1'
  return [...factors.entries()]
    .map(([p, e]) => (e === 1 ? p.toString() : `${p}^${e}`))
    .join(' × ')
}
