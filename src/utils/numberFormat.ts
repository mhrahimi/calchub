/** Shared display rules. Never use formatted values as calculation inputs. */
export function displayNumber(value: number, locale = 'en-US', precision = 2, fixed = false): string {
  if (!Number.isFinite(value)) return 'Not defined'
  const normalized = Object.is(value, -0) ? 0 : value
  // Keep very small nonzero results distinguishable from zero (p-values, Greeks).
  if (normalized !== 0 && Math.abs(normalized) < 10 ** -precision) {
    return new Intl.NumberFormat(locale, { notation: 'scientific', maximumFractionDigits: 3 }).format(normalized).replace(/^-/, '−')
  }
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: precision,
    minimumFractionDigits: fixed ? precision : 0,
  }).format(normalized).replace(/^-/, '−')
}

/** Localize legacy result strings only when they are a complete numeric metric. */
export function displayMetric(value: string | number, locale = 'en-US', precision = 4): string {
  if (typeof value === 'number') return displayNumber(value, locale, precision)
  const match = value.match(/^(-?\d+(?:\.\d+)?)(%|x|°| rad| years| months)?$/)
  if (!match) return value.replace(/(^|\s)-(?=\d)/g, '$1−')
  if (!match[1].includes('.')) return new Intl.NumberFormat(locale).format(BigInt(match[1])).replace(/^-/, '−') + (match[2] ?? '')
  const decimals = match[1].split('.')[1]?.length ?? 0
  return displayNumber(Number(match[1]), locale, decimals, decimals > 0) + (match[2] ?? '')
}
