import { getSettings } from '@/persistence/settings'

export function formatCurrency(
  value: number,
  currency?: string,
  locale?: string,
): string {
  const settings = getSettings()
  const curr = currency ?? settings.currency
  const loc = locale ?? settings.numberFormat
  return new Intl.NumberFormat(loc, {
    style: 'currency',
    currency: curr,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPercent(value: number, decimals = 2): string {
  return `${(value * 100).toFixed(decimals)}%`
}

export function formatNumber(value: number, decimals = 2): string {
  const settings = getSettings()
  return new Intl.NumberFormat(settings.numberFormat, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function parseMoney(value: string | number): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const cleaned = value.replace(/[^0-9.-]/g, '')
  return parseFloat(cleaned) || 0
}

/** Live input grouping: thousands separators, no forced trailing decimals. */
export function formatGroupedInput(value: string | number, locale?: string): string {
  const loc = locale ?? getSettings().numberFormat

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '0'
    return new Intl.NumberFormat(loc, {
      useGrouping: true,
      maximumFractionDigits: 20,
      minimumFractionDigits: 0,
    }).format(value)
  }

  if (value === '' || value === '-') return value

  const negative = value.trimStart().startsWith('-')
  const cleaned = value.replace(/[^0-9.]/g, '')
  if (cleaned === '') return negative ? '-' : ''

  const trailingDot = cleaned.endsWith('.') && cleaned.indexOf('.') === cleaned.length - 1
  const dotIndex = cleaned.indexOf('.')
  const intDigits = (dotIndex === -1 ? cleaned : cleaned.slice(0, dotIndex)) || '0'
  const fracDigits = dotIndex === -1 ? null : cleaned.slice(dotIndex + 1).replace(/\./g, '')

  const groupedInt = new Intl.NumberFormat(loc, {
    useGrouping: true,
    maximumFractionDigits: 0,
  }).format(parseInt(intDigits, 10) || 0)

  let result = groupedInt
  if (trailingDot) result += '.'
  else if (fracDigits !== null) result += `.${fracDigits}`

  return negative ? `-${result}` : result
}

export function caretTokenCount(value: string, position: number): number {
  let count = 0
  const end = Math.min(position, value.length)
  for (let i = 0; i < end; i++) {
    if (/[0-9.-]/.test(value[i]!)) count++
  }
  return count
}

export function caretPositionForTokens(value: string, tokens: number): number {
  if (tokens <= 0) return 0
  let count = 0
  for (let i = 0; i < value.length; i++) {
    if (/[0-9.-]/.test(value[i]!)) {
      count++
      if (count === tokens) return i + 1
    }
  }
  return value.length
}

export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100
}
