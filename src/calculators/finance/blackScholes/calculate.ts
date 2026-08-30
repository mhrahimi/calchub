import { priceBlackScholes } from '@/utils/blackScholes'
import type { BlackScholesInput, BlackScholesCalcResult } from './types'
import type { CalculationExplanation, ChartData, TableData } from '@/calculators/types'

export function calculateBlackScholes(input: BlackScholesInput): BlackScholesCalcResult {
  const params = {
    spot: input.spot,
    strike: input.strike,
    timeYears: input.timeYears,
    riskFreeRate: input.riskFreeRate / 100,
    volatility: input.volatility / 100,
    dividendYield: input.dividendYield / 100,
  }
  const r = priceBlackScholes(params)
  return {
    callPrice: r.callPrice,
    putPrice: r.putPrice,
    d1: r.d1,
    d2: r.d2,
    showGreeks: input.showGreeks,
    greeks: input.showGreeks ? r.greeks : undefined,
    chartParams: params,
  }
}

export function explainBlackScholes(_input: BlackScholesInput, _result: BlackScholesCalcResult): CalculationExplanation {
  return {
    title: 'Black-Scholes-Merton',
    steps: [
      {
        label: 'd1',
        expression: 'd1 = [ln(S/K) + (r − q + σ²/2)T] / (σ√T)',
      },
      {
        label: 'd2',
        expression: 'd2 = d1 − σ√T',
      },
      {
        label: 'Call',
        expression: 'C = S e^{−qT} N(d1) − K e^{−rT} N(d2)',
      },
      {
        label: 'Put',
        expression: 'P = K e^{−rT} N(−d2) − S e^{−qT} N(−d1)',
      },
    ],
    assumptions: [
      'European exercise only',
      'Constant volatility and interest rate',
      'Lognormal price diffusion',
      'No transaction costs',
    ],
  }
}

export function buildBlackScholesCharts(result: BlackScholesCalcResult): ChartData[] {
  const base = result.chartParams
  const spotSeries = Array.from({ length: 21 }, (_, i) => {
    const s = base.strike * 0.5 + (base.strike * i) / 10
    const p = priceBlackScholes({ ...base, spot: s })
    return { x: s, y: p.callPrice }
  })
  const volSeries = Array.from({ length: 21 }, (_, i) => {
    const v = 0.05 + (0.5 * i) / 20
    const p = priceBlackScholes({ ...base, volatility: v })
    return { x: v * 100, y: p.callPrice }
  })
  const payoffSeries = Array.from({ length: 21 }, (_, i) => {
    const s = base.strike * 0.5 + (base.strike * i) / 10
    return { x: s, y: Math.max(0, s - base.strike) }
  })
  return [
    { type: 'line', title: 'Call value vs. stock price', valueFormat: 'currency', series: [{ name: 'Call', data: spotSeries, color: '#163B8C' }], xLabel: 'Stock price', yLabel: 'Call value' },
    { type: 'line', title: 'Payoff at expiration', valueFormat: 'currency', series: [{ name: 'Payoff', data: payoffSeries, color: '#64748B' }], xLabel: 'Stock price', yLabel: 'Payoff' },
    { type: 'line', title: 'Call value vs. volatility', valueFormat: 'currency', series: [{ name: 'Call', data: volSeries, color: '#163B8C' }], xLabel: 'Volatility (%)', yLabel: 'Call value' },
  ]
}

export function buildBlackScholesTable(result: BlackScholesCalcResult): TableData {
  const rows: Record<string, string | number>[] = [
    { greek: 'Call price', value: result.callPrice.toFixed(4) },
    { greek: 'Put price', value: result.putPrice.toFixed(4) },
  ]
  if (result.greeks) {
    rows.push(
      { greek: 'Delta (call)', value: result.greeks.deltaCall.toFixed(4) },
      { greek: 'Delta (put)', value: result.greeks.deltaPut.toFixed(4) },
      { greek: 'Gamma', value: result.greeks.gamma.toFixed(6) },
      { greek: 'Vega', value: result.greeks.vega.toFixed(4) },
      { greek: 'Theta (call)', value: result.greeks.thetaCall.toFixed(4) },
      { greek: 'Rho (call)', value: result.greeks.rhoCall.toFixed(4) },
    )
  }
  return {
    title: 'Option prices and Greeks',
    columns: [
      { key: 'greek', label: 'Metric', align: 'left' },
      { key: 'value', label: 'Value', align: 'right' },
    ],
    rows,
  }
}
