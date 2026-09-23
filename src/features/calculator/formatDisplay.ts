/**
 * Display-only thousand grouping for calculator strings.
 * Engine state stays ungrouped; never feed this output back into evaluate.
 */

function groupInteger(digits: string): string {
  if (digits.length <= 3) return digits
  const parts: string[] = []
  let i = digits.length
  while (i > 0) {
    const start = Math.max(0, i - 3)
    parts.unshift(digits.slice(start, i))
    i = start
  }
  return parts.join(',')
}

/** Group a single numeric token (`-1234.5`, `1234.`, `0.5`). */
export function formatGroupedNumber(raw: string): string {
  if (!raw || raw === 'Error') return raw
  if (/e/i.test(raw)) return raw

  const negative = raw.startsWith('-')
  const body = negative ? raw.slice(1) : raw
  if (body === '' || body === '.') return raw

  const dot = body.indexOf('.')
  const intRaw = dot === -1 ? body : body.slice(0, dot)
  const frac = dot === -1 ? null : body.slice(dot + 1)
  const intDigits = intRaw === '' ? '0' : intRaw
  if (!/^\d+$/.test(intDigits)) return raw

  const grouped = groupInteger(intDigits)
  const sign = negative ? '-' : ''
  if (dot === -1) return `${sign}${grouped}`
  return `${sign}${grouped}.${frac ?? ''}`
}

/** Group every number token inside an expression or result string. */
export function formatCalculatorDisplay(raw: string): string {
  if (!raw || raw === 'Error') return raw
  return raw.replace(/-?\d+(?:\.\d*)?(?:e[+-]?\d+)?/gi, (match) => {
    if (/e/i.test(match)) return match
    return formatGroupedNumber(match)
  })
}
