import Decimal from 'decimal.js'

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

export { Decimal }

/** Periodic payment (PMT) for an annuity. Rate as decimal per period. */
export function pmt(principal: number, ratePerPeriod: number, periods: number): number {
  if (periods <= 0) return 0
  if (ratePerPeriod === 0) return principal / periods
  const r = ratePerPeriod
  const n = periods
  const factor = Math.pow(1 + r, n)
  return (principal * r * factor) / (factor - 1)
}

/** Future value with end-period contributions */
export function fvEnd(
  pv: number,
  ratePerPeriod: number,
  periods: number,
  pmtAmount = 0,
): number {
  if (periods <= 0) return pv
  if (ratePerPeriod === 0) return pv + pmtAmount * periods
  const r = ratePerPeriod
  const n = periods
  const factor = Math.pow(1 + r, n)
  return pv * factor + pmtAmount * ((factor - 1) / r)
}

/** Future value with beginning-period contributions (annuity term only is due). */
export function fvBegin(
  pv: number,
  ratePerPeriod: number,
  periods: number,
  pmtAmount = 0,
): number {
  if (periods <= 0) return pv
  if (ratePerPeriod === 0) return pv + pmtAmount * periods
  const r = ratePerPeriod
  const n = periods
  const factor = Math.pow(1 + r, n)
  return pv * factor + pmtAmount * ((factor - 1) / r) * (1 + r)
}

/** Present value */
export function pv(
  fvAmount: number,
  ratePerPeriod: number,
  periods: number,
): number {
  if (periods <= 0) return fvAmount
  if (ratePerPeriod === 0) return fvAmount
  return fvAmount / Math.pow(1 + ratePerPeriod, periods)
}

/** Invert FV for the starting principal given a target and contributions. */
export function pvFromFv(
  fvTarget: number,
  ratePerPeriod: number,
  periods: number,
  pmtAmount = 0,
  beginning = false,
): number {
  if (periods <= 0) return fvTarget
  if (ratePerPeriod === 0) return fvTarget - pmtAmount * periods
  const r = ratePerPeriod
  const n = periods
  const factor = Math.pow(1 + r, n)
  const annuityFactor = beginning ? ((factor - 1) / r) * (1 + r) : (factor - 1) / r
  return (fvTarget - pmtAmount * annuityFactor) / factor
}

/** Periods needed to reach a target FV with end- or beginning-of-period contributions. */
export function periodsFromFv(
  pvAmount: number,
  ratePerPeriod: number,
  pmtAmount: number,
  fvTarget: number,
  beginning = false,
): number | null {
  if (fvTarget <= pvAmount) return 0
  if (ratePerPeriod === 0) {
    if (pmtAmount <= 0) return null
    return (fvTarget - pvAmount) / pmtAmount
  }
  const r = ratePerPeriod
  const k = (pmtAmount * (beginning ? 1 + r : 1)) / r
  const denom = pvAmount + k
  if (denom === 0) return null
  const ratio = (fvTarget + k) / denom
  if (ratio <= 0) return null
  return Math.log(ratio) / Math.log(1 + r)
}

/** Solve for payment given FV target */
export function pmtFromFv(
  pvAmount: number,
  ratePerPeriod: number,
  periods: number,
  fvTarget: number,
  beginning = false,
): number {
  if (periods <= 0) return 0
  if (ratePerPeriod === 0) return (fvTarget - pvAmount) / periods
  const r = ratePerPeriod
  const n = periods
  const factor = Math.pow(1 + r, n)
  const fvFromPv = pvAmount * factor
  const annuityFactor = beginning ? ((factor - 1) / r) * (1 + r) : (factor - 1) / r
  return (fvTarget - fvFromPv) / annuityFactor
}

/** Convert annual nominal rate to periodic rate */
export function annualToPeriodic(annualRate: number, periodsPerYear: number): number {
  return annualRate / periodsPerYear
}

/** Canadian mortgage: nominal semi-annual compounding to monthly equivalent */
export function canadianMonthlyRate(nominalAnnualRate: number): number {
  const j = nominalAnnualRate
  return Math.pow(1 + j / 2, 2 / 12) - 1
}

/** US mortgage: APR divided by 12 */
export function usMonthlyRate(apr: number): number {
  return apr / 12
}

/** Periods per year from frequency string */
export function periodsPerYear(frequency: string): number {
  const map: Record<string, number> = {
    monthly: 12,
    'bi-weekly': 26,
    weekly: 52,
    quarterly: 4,
    'semi-annual': 2,
    annual: 1,
  }
  return map[frequency] ?? 12
}

/** Convert term to number of payment periods */
export function termToPeriods(term: number, termUnit: string, frequency: string): number {
  const ppy = periodsPerYear(frequency)
  if (termUnit === 'years') return term * ppy
  if (termUnit === 'months') return Math.round((term / 12) * ppy)
  return term
}
