export function npv(rate: number, cashFlows: number[]): number {
  return cashFlows.reduce((sum, cf, t) => sum + cf / Math.pow(1 + rate, t), 0)
}

export function discountFactor(rate: number, period: number): number {
  return 1 / Math.pow(1 + rate, period)
}

export function presentValue(cashFlow: number, rate: number, period: number): number {
  return cashFlow * discountFactor(rate, period)
}

export function sumPresentValues(cashFlows: number[], rate: number, startPeriod = 1): number {
  return cashFlows.reduce((sum, cf, i) => sum + presentValue(cf, rate, startPeriod + i), 0)
}
