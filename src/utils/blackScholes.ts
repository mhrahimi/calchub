import { normalCDF } from './distributions'

export interface BlackScholesInputs {
  spot: number
  strike: number
  timeYears: number
  riskFreeRate: number
  volatility: number
  dividendYield: number
}

export interface BlackScholesGreeks {
  deltaCall: number
  deltaPut: number
  gamma: number
  vega: number
  thetaCall: number
  thetaPut: number
  rhoCall: number
  rhoPut: number
}

export interface BlackScholesResult {
  d1: number
  d2: number
  callPrice: number
  putPrice: number
  greeks: BlackScholesGreeks
}

function normalPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI)
}

export function priceBlackScholes(input: BlackScholesInputs): BlackScholesResult {
  const { spot: S, strike: K, timeYears: T, riskFreeRate: r, volatility: sigma, dividendYield: q } = input
  const sqrtT = Math.sqrt(T)
  const d1 = (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * sqrtT)
  const d2 = d1 - sigma * sqrtT
  const nd1 = normalCDF(d1)
  const nd2 = normalCDF(d2)
  const nNegD1 = normalCDF(-d1)
  const nNegD2 = normalCDF(-d2)
  const discSpot = S * Math.exp(-q * T)
  const discStrike = K * Math.exp(-r * T)

  const callPrice = discSpot * nd1 - discStrike * nd2
  const putPrice = discStrike * nNegD2 - discSpot * nNegD1

  const pdfD1 = normalPdf(d1)
  const deltaCall = Math.exp(-q * T) * nd1
  const deltaPut = deltaCall - Math.exp(-q * T)
  const gamma = (Math.exp(-q * T) * pdfD1) / (S * sigma * sqrtT)
  const vega = (S * Math.exp(-q * T) * pdfD1 * sqrtT) / 100
  const thetaCall =
    (-(S * Math.exp(-q * T) * pdfD1 * sigma) / (2 * sqrtT) -
      r * K * Math.exp(-r * T) * nd2 +
      q * S * Math.exp(-q * T) * nd1) /
    365
  const thetaPut =
    (-(S * Math.exp(-q * T) * pdfD1 * sigma) / (2 * sqrtT) +
      r * K * Math.exp(-r * T) * nNegD2 -
      q * S * Math.exp(-q * T) * nNegD1) /
    365
  const rhoCall = (K * T * Math.exp(-r * T) * nd2) / 100
  const rhoPut = (-K * T * Math.exp(-r * T) * nNegD2) / 100

  return {
    d1,
    d2,
    callPrice,
    putPrice,
    greeks: { deltaCall, deltaPut, gamma, vega, thetaCall, thetaPut, rhoCall, rhoPut },
  }
}

export function putCallParityResidual(input: BlackScholesInputs, call: number, put: number): number {
  const { spot: S, strike: K, timeYears: T, riskFreeRate: r, dividendYield: q } = input
  return call - put - S * Math.exp(-q * T) + K * Math.exp(-r * T)
}
