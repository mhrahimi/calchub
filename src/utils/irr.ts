import { brentSolve } from './rootSolve'
import { npv } from './npv'

export function irr(cashFlows: number[], guess = 0.1): number | null {
  if (cashFlows.length < 2) return null
  const objective = (r: number) => npv(r, cashFlows)
  let lo = -0.99
  let hi = guess
  let fLo = objective(lo)
  let fHi = objective(hi)
  if (fLo * fHi > 0) {
    hi = 1
    fHi = objective(hi)
    if (fLo * fHi > 0) {
      hi = 5
      fHi = objective(hi)
      if (fLo * fHi > 0) return null
    }
  }
  return brentSolve(objective, lo, hi)
}

export function moic(totalDistributed: number, totalInvested: number): number {
  if (totalInvested === 0) return 0
  return totalDistributed / totalInvested
}

export function irrFromDates(
  flows: Array<{ amount: number; yearFraction: number }>,
): number | null {
  if (flows.length < 2) return null
  const objective = (r: number) =>
    flows.reduce((sum, f) => sum + f.amount / Math.pow(1 + r, f.yearFraction), 0)
  let lo = -0.99
  let hi = 0.5
  if (objective(lo) * objective(hi) > 0) {
    hi = 2
    if (objective(lo) * objective(hi) > 0) return null
  }
  return brentSolve(objective, lo, hi)
}
