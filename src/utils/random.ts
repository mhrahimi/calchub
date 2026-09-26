export function randomFloat(): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0] / (0xffffffff + 1)
}

export function randomInt(min: number, max: number): number {
  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max)) {
    throw new Error('Bounds must be safe integers')
  }
  if (min > max) throw new Error('Minimum cannot exceed maximum')
  const range = max - min + 1
  if (range > 0x100000000) throw new Error('Integer range must contain no more than 4,294,967,296 values')
  const maxUnbiased = Math.floor(0x100000000 / range) * range
  const buf = new Uint32Array(1)
  for (let attempt = 0; attempt < 128; attempt++) {
    crypto.getRandomValues(buf)
    const x = buf[0]
    if (x < maxUnbiased) return min + (x % range)
  }
  throw new Error('The random source could not produce a value. Please try again.')
}

export interface RandomGeneratorOptions {
  min: number
  max: number
  count: number
  integer: boolean
  unique: boolean
  decimalPlaces?: number
}

export const MAX_RANDOM_COUNT = 10_000

export function randomInputErrors(options: RandomGeneratorOptions): Record<string, string> {
  const { min, max, count, integer, unique, decimalPlaces = 4 } = options
  const errors: Record<string, string> = {}
  for (const [key, value] of [['min', min], ['max', max]] as const) {
    if (!Number.isFinite(value)) errors[key] = 'Enter a finite bound'
    else if (integer && !Number.isSafeInteger(value)) errors[key] = 'Enter a safe whole number'
    else if (!integer && Math.abs(value) > 1e12) errors[key] = 'Decimal bounds must be within ±1 trillion'
  }
  if (min > max) errors.max = 'Maximum cannot be less than minimum'
  if (integer && max - min + 1 > 0x100000000) errors.max = 'Integer range must contain no more than 4,294,967,296 values'
  if (!Number.isInteger(count) || count < 1 || count > MAX_RANDOM_COUNT) errors.count = 'Enter a whole count from 1 to 10,000'
  if (integer && unique && count > max - min + 1) errors.count = 'Unique count exceeds the integer range'
  if (!integer && unique) errors.unique = 'Unique generation is available for integers only'
  if (!Number.isInteger(decimalPlaces) || decimalPlaces < 0 || decimalPlaces > 10) errors.decimalPlaces = 'Enter 0 to 10 decimal places'
  return errors
}

export function generateRandomNumbers(options: RandomGeneratorOptions): number[] {
  const { min, max, count, integer, unique, decimalPlaces = 4 } = options
  const errors = randomInputErrors(options)
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0])

  if (integer && unique) {
    const rangeSize = max - min + 1
    // Partial Fisher–Yates with a sparse map: memory depends on count, not range.
    const swaps = new Map<number, number>()
    const values: number[] = []
    for (let i = 0; i < count; i++) {
      const j = randomInt(i, rangeSize - 1)
      values.push(min + (swaps.get(j) ?? j))
      swaps.set(j, swaps.get(i) ?? i)
      swaps.delete(i)
    }
    return values
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
