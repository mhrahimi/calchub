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
  if (typeof value === 'number') return value
  const cleaned = value.replace(/[^0-9.-]/g, '')
  return parseFloat(cleaned) || 0
}

export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100
}
