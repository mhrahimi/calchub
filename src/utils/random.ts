export function randomFloat(): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0] / (0xffffffff + 1)
}

export function randomInt(min: number, max: number): number {
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    throw new Error('Bounds must be integers')
  }
  if (min > max) throw new Error('Minimum cannot exceed maximum')
  const range = max - min + 1
  const maxUnbiased = Math.floor(0x100000000 / range) * range
  const buf = new Uint32Array(1)
  let x: number
  do {
    crypto.getRandomValues(buf)
    x = buf[0]
  } while (x >= maxUnbiased)
  return min + (x % range)
}

export interface RandomGeneratorOptions {
  min: number
  max: number
  count: number
  integer: boolean
  unique: boolean
  decimalPlaces?: number
}

export function generateRandomNumbers(options: RandomGeneratorOptions): number[] {
  const { min, max, count, integer, unique, decimalPlaces = 4 } = options
  if (count <= 0) throw new Error('Count must be positive')
  if (min > max) throw new Error('Minimum cannot exceed maximum')

  if (integer && unique) {
    const rangeSize = max - min + 1
    if (count > rangeSize) {
      throw new Error('Unique count exceeds integer range size')
    }
    const pool = Array.from({ length: rangeSize }, (_, i) => min + i)
    for (let i = pool.length - 1; i > 0; i--) {
      const j = randomInt(0, i)
      ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }
    return pool.slice(0, count)
  }

  const results: number[] = []
  for (let i = 0; i < count; i++) {
    if (integer) {
      results.push(randomInt(min, max))
    } else {
      const raw = min + randomFloat() * (max - min)
      const factor = 10 ** decimalPlaces
      results.push(Math.round(raw * factor) / factor)
    }
  }
  return results
}
