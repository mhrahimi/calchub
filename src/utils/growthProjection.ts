import { CalculationError } from './rootSolve'

export const MAX_GROWTH_YEARS = 500
export const MAX_GROWTH_EVENTS = 200000
// Above this limit, JavaScript cannot reliably represent cents.
export const MAX_GROWTH_AMOUNT = Number.MAX_SAFE_INTEGER / 100
export const GROWTH_FREQUENCIES: Record<string, { periods: number; label: string; unit: string }> = {
  daily: { periods: 365, label: 'Daily', unit: 'day' },
  weekly: { periods: 52, label: 'Weekly', unit: 'week' },
  'bi-weekly': { periods: 26, label: 'Every two weeks', unit: 'two-week period' },
  'bi-monthly': { periods: 24, label: 'Twice a month', unit: 'half-month period' },
  semimonthly: { periods: 24, label: 'Twice a month', unit: 'half-month period' },
  monthly: { periods: 12, label: 'Monthly', unit: 'month' },
  quarterly: { periods: 4, label: 'Quarterly', unit: 'quarter' },
  'semi-annual': { periods: 2, label: 'Every six months', unit: 'six-month period' },
  annual: { periods: 1, label: 'Yearly', unit: 'year' },
  yearly: { periods: 1, label: 'Yearly', unit: 'year' },
}
export const CONTRIBUTION_OPTIONS = ['daily', 'weekly', 'bi-weekly', 'bi-monthly', 'monthly', 'quarterly', 'yearly'].map(value => ({ value, label: GROWTH_FREQUENCIES[value].label }))
export function growthFrequency(value: string) {
  return Object.hasOwn(GROWTH_FREQUENCIES, value) ? GROWTH_FREQUENCIES[value] : undefined
}
export function contributionUnit(frequency: string): string {
  return growthFrequency(frequency)?.unit ?? 'period'
}
export function validGrowthAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= MAX_GROWTH_AMOUNT
}
export function checkedAmount(value: number): number {
  if (!validGrowthAmount(value)) throw new CalculationError('invalid_domain', 'Projection exceeds the supported monetary range. Reduce the amount, rate, or duration.')
  return value
}
export function growthMoney(value: number): number {
  return Math.round(checkedAmount(value) * 100) / 100
}
export function effectiveAnnualPercent(nominalPercent: number, periods: number, continuous = false): number {
  const value = Math.expm1(continuous ? nominalPercent / 100 : periods * Math.log1p(nominalPercent / 100 / periods)) * 100
  if (!Number.isFinite(value)) throw new CalculationError('invalid_domain', 'The effective annual rate exceeds the numeric range. Enter a smaller rate.')
  return value
}
export function applyGrowthCashFlow(balance: number, requested: number) {
  checkedAmount(balance)
  const actual = requested < 0 ? -Math.min(balance, -requested) : requested
  const unmet = requested < 0 ? Math.max(0, -requested + actual) : 0
  return { balance: checkedAmount(balance + actual), actual, unmet }
}
export function elapsedTimeLabel(periods: number, frequency: string): string {
  if (periods === 0) return 'Immediately (0 periods)'
  const ppy = growthFrequency(frequency)!.periods
  const years = Math.floor(periods / ppy)
  const remaining = periods % ppy
  const yearText = `${years} ${years === 1 ? 'year' : 'years'}`
  if (!remaining) return yearText
  const unit = contributionUnit(frequency)
  const rest = `${remaining} ${unit}${remaining === 1 ? '' : 's'}`
  return years ? `${yearText}, ${rest}` : rest
}
