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
  if (base < 2 || base > 36) throw new Error('Base must be between 2 and 36')
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
  if (base < 2 || base > 36) throw new Error('Base must be between 2 and 36')
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
  let value = 0
  const fb = fromBase
  for (const ch of fractional) {
    if (!isValidDigit(ch, fromBase)) throw new Error(`Invalid digit "${ch}"`)
    value = (value + DIGIT_VALUES[ch]) / fb
  }
  let result = ''
  for (let i = 0; i < maxDigits; i++) {
    value *= toBase
    const digit = Math.floor(value)
    result += digit < 10 ? String(digit) : String.fromCharCode(65 + digit - 10)
    value -= digit
    if (value === 0) break
  }
  return result
}

export interface BaseConversionResult {
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

  let targetFrac = ''
  if (fracStr) {
    let decimal = 0
    for (const ch of fracStr) {
      decimal = (decimal + DIGIT_VALUES[ch]) / fromBase
    }
    for (let i = 0; i < fractionalPrecision; i++) {
      decimal *= toBase
      const digit = Math.floor(decimal)
      targetFrac += digit < 10 ? String(digit) : String.fromCharCode(65 + digit - 10)
      decimal -= digit
      if (decimal === 0) break
    }
  }

  const targetValue = targetFrac ? `${sign}${targetInt}.${targetFrac}` : `${sign}${targetInt}`

  const steps: Array<{ label: string; value: string }> = [
    { label: 'Parse integer in source base', value: intVal.toString() },
    { label: 'Encode integer in target base', value: targetInt },
  ]
  if (fracStr) {
    steps.push({ label: 'Convert fractional part', value: targetFrac || '0' })
  }

  return {
    sourceValue: trimmed,
    sourceBase: fromBase,
    targetBase: toBase,
    integerPart: targetInt,
    fractionalPart: targetFrac,
    targetValue,
    steps,
  }
}
