import {
  buildCouponSchedule,
  solveYtm,
  macaulayDuration,
  modifiedDuration,
  convexity as bondConvexity,
  priceYieldCurve,
} from '@/utils/bonds'
import type { BondsInput, BondsResult } from './types'
import type { CalculationExplanation, ChartData, TableData } from '@/calculators/types'

export function calculateBonds(input: BondsInput): BondsResult {
  const couponRate = input.couponRate / 100
  const periods = input.periodsToMaturity
  const frequency = input.couponFrequency
  const ytmPerPeriod = solveYtm(input.faceValue, couponRate, periods, input.bondPrice, frequency)
  if (ytmPerPeriod === null) throw new Error('Could not solve yield to maturity for these inputs')
  const ytmAnnual = ytmPerPeriod * frequency
  const schedule = buildCouponSchedule(input.faceValue, couponRate, periods, frequency)
  const couponPayment = schedule[0]?.coupon ?? 0
  const currentYield = (couponPayment * frequency) / input.bondPrice * 100
  const macDur = macaulayDuration(
    input.faceValue,
    couponRate,
    periods,
    ytmPerPeriod,
    input.bondPrice,
    frequency,
  )
  const modDur = modifiedDuration(macDur, ytmPerPeriod)
  const conv = bondConvexity(
    input.faceValue,
    couponRate,
    periods,
    ytmPerPeriod,
    input.bondPrice,
    frequency,
  )

  const cashFlows = schedule.map((cf) => ({
    ...cf,
    pv: cf.total / Math.pow(1 + ytmPerPeriod, cf.period),
  }))

  return {
    ytm: ytmAnnual,
    ytmPercent: ytmAnnual * 100,
    couponPayment,
    currentYield,
    macaulayDuration: macDur,
    modifiedDuration: modDur,
    convexity: conv,
    cashFlows,
    chartParams: { faceValue: input.faceValue, couponRate, periods, ytmPerPeriod, frequency },
  }
}

export function explainBonds(_input: BondsInput, result: BondsResult): CalculationExplanation {
  return {
    title: 'Bond analytics',
    steps: [
      { label: 'YTM (annual)', result: `${result.ytmPercent.toFixed(4)}%` },
      { label: 'Macaulay duration', result: result.macaulayDuration.toFixed(4) },
      { label: 'Modified duration', result: result.modifiedDuration.toFixed(4) },
    ],
    assumptions: [
      'Coupons paid on schedule',
      'YTM solved numerically (Brent method)',
      'Standard 30/360-style period counting per coupon frequency',
    ],
  }
}

export function buildBondsCharts(result: BondsResult): ChartData[] {
  const { faceValue, couponRate, periods, ytmPerPeriod, frequency } = result.chartParams
  const curve = priceYieldCurve(faceValue, couponRate, periods, ytmPerPeriod, frequency)
  return [{
    type: 'line',
    title: 'Bond price vs. yield',
    series: [{ name: 'Price', data: curve.map((p) => ({ x: p.yield, y: p.price })), color: '#163B8C' }],
    xLabel: 'Annual yield (%)',
    yLabel: 'Price',
    valueFormat: 'currency',
  }]
}

export function buildBondsTable(result: BondsResult): TableData {
  return {
    title: 'Cash flows',
    columns: [
      { key: 'period', label: 'Period', align: 'right' },
      { key: 'coupon', label: 'Coupon', align: 'right', format: 'currency' },
      { key: 'principal', label: 'Principal', align: 'right', format: 'currency' },
      { key: 'total', label: 'Total', align: 'right', format: 'currency' },
      { key: 'pv', label: 'PV', align: 'right', format: 'currency' },
    ],
    rows: result.cashFlows.map((cf) => ({
      period: cf.period,
      coupon: cf.coupon,
      principal: cf.principal,
      total: cf.total,
      pv: Math.round(cf.pv * 100) / 100,
    })),
  }
}
