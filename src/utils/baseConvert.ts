const DIGIT_VALUES: Record<string, number> = {}
for (let i = 0; i <= 9; i++) DIGIT_VALUES[String(i)] = i
for (let i = 0; i < 26; i++) {
  DIGIT_VALUES[String.fromCharCode(65 + i)] = 10 + i
  DIGIT_VALUES[String.fromCharCode(97 + i)] = 10 + i
}

export function isValidDigit(char: string, base: number): boolean {
  const v = DIGIT_VALUES[char]
  return v !== undefined && v < base
}

export function validateBaseString(value: string, base: number): void {
  if (!Number.isInteger(base) || base < 2 || base > 36) throw new Error('Base must be between 2 and 36')
  const trimmed = value.trim()
  if (!trimmed) throw new Error('Value is required')
  const parts = trimmed.replace(/^[-+]/, '').split('.')
  if (parts.length > 2) throw new Error('Invalid number format')
  for (const part of parts) {
    if (!part) throw new Error('Invalid number format')
    for (const ch of part) {
      if (!isValidDigit(ch, base)) {
        throw new Error(`Invalid digit "${ch}" for base ${base}`)
      }
    }
  }
}

export function parseIntegerPart(value: string, base: number): bigint {
  validateBaseString(value, base)
  const trimmed = value.trim()
  const sign = trimmed.startsWith('-') ? -1n : 1n
  const body = trimmed.replace(/^[-+]/, '').split('.')[0]
  let result = 0n
  const b = BigInt(base)
  for (const ch of body) {
    result = result * b + BigInt(DIGIT_VALUES[ch])
  }
  return result * sign
}

export function encodeIntegerPart(value: bigint, base: number): string {
  if (!Number.isInteger(base) || base < 2 || base > 36) throw new Error('Base must be between 2 and 36')
  if (value === 0n) return '0'
  const sign = value < 0n ? '-' : ''
  let n = value < 0n ? -value : value
  const digits: string[] = []
  const b = BigInt(base)
  while (n > 0n) {
    const rem = Number(n % b)
    digits.push(rem < 10 ? String(rem) : String.fromCharCode(65 + rem - 10))
    n /= b
  }
  return sign + digits.reverse().join('')
}

export function convertFractionalPart(
  fractional: string,
  fromBase: number,
  toBase: number,
  maxDigits = 12,
): string {
  if (!fractional) return ''
  if (!Number.isInteger(fromBase) || !Number.isInteger(toBase) || fromBase < 2 || fromBase > 36 || toBase < 2 || toBase > 36 || !Number.isInteger(maxDigits) || maxDigits < 1 || maxDigits > 10000) throw new Error('Invalid base or precision')
  let numerator = 0n, denominator = 1n
  for (const ch of fractional) {
    if (!isValidDigit(ch, fromBase)) throw new Error(`Invalid digit "${ch}"`)
    numerator = numerator * BigInt(fromBase) + BigInt(DIGIT_VALUES[ch])
    denominator *= BigInt(fromBase)
  }
  let result = ''
  for (let i = 0; i < maxDigits; i++) {
    numerator *= BigInt(toBase)
    const digit = Number(numerator / denominator)
    result += digit.toString(36).toUpperCase()
    numerator %= denominator
    if (numerator === 0n) break
  }
  return result
}

export interface BaseConversionResult {
  repeating: boolean
  truncated: boolean
  sourceValue: string
  sourceBase: number
  targetBase: number
  integerPart: string
  fractionalPart: string
  targetValue: string
  steps: Array<{ label: string; value: string }>
}

export function convertBase(
  value: string,
  fromBase: number,
  toBase: number,
  fractionalPrecision = 12,
): BaseConversionResult {
  validateBaseString(value, fromBase)
  const trimmed = value.trim()
  const sign = trimmed.startsWith('-') ? '-' : ''
  const unsigned = trimmed.replace(/^[-+]/, '')
  const [intStr, fracStr = ''] = unsigned.split('.')

  const intVal = parseIntegerPart(intStr || '0', fromBase)
  const targetInt = encodeIntegerPart(intVal, toBase)

  const targetFrac = fracStr ? convertFractionalPart(fracStr, fromBase, toBase, fractionalPrecision) : ''
  let remainder = 0n, denominator = 1n
  for (const ch of fracStr) { remainder = remainder * BigInt(fromBase) + BigInt(DIGIT_VALUES[ch]); denominator *= BigInt(fromBase) }
  const seen = new Set<bigint>()
  let repeating = false
  for (let i = 0; remainder && i < 10000; i++) {
    if (seen.has(remainder)) { repeating = true; break }
    seen.add(remainder); remainder = remainder * BigInt(toBase) % denominator
  }
  let residual = 0n
  for (const ch of fracStr) residual = residual * BigInt(fromBase) + BigInt(DIGIT_VALUES[ch])
  for (let i = 0; i < targetFrac.length; i++) residual = residual * BigInt(toBase) % denominator
  const truncated = residual !== 0n

  const targetValue = targetFrac ? `${sign}${targetInt}.${targetFrac}` : `${sign}${targetInt}`

  const steps: Array<{ label: string; value: string }> = [
    { label: 'Parse integer in source base', value: intVal.toString() },
    { label: 'Encode integer in target base', value: targetInt },
  ]
  if (truncated) steps.push({ label: repeating ? 'Repeating fraction' : 'Precision limit', value: `Truncated to ${fractionalPrecision} digits` })
  if (fracStr) {
    steps.push({ label: 'Convert fractional part', value: targetFrac || '0' })
  }

  return {
    repeating,
    truncated,
    sourceValue: trimmed,
    sourceBase: fromBase,
    targetBase: toBase,
    integerPart: targetInt,
    fractionalPart: targetFrac,
    targetValue,
    steps,
  }
}
