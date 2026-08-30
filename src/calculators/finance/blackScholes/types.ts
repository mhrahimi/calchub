export interface BlackScholesInput {
  spot: number
  strike: number
  timeYears: number
  riskFreeRate: number
  volatility: number
  dividendYield: number
  showGreeks: boolean
}

export interface BlackScholesCalcResult {
  callPrice: number
  putPrice: number
  d1: number
  d2: number
  showGreeks: boolean
  greeks?: {
    deltaCall: number
    deltaPut: number
    gamma: number
    vega: number
    thetaCall: number
    thetaPut: number
    rhoCall: number
    rhoPut: number
  }
  chartParams: {
    spot: number
    strike: number
    timeYears: number
    riskFreeRate: number
    volatility: number
    dividendYield: number
  }
}
