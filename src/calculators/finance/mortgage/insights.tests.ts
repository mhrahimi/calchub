import { describe, expect, it } from 'vitest'
import { buildMortgageCharts, calculateMortgage } from './calculate'
import { convertDownPayment, mortgageScheduleTable, monthlyExtra, rateScenarios } from './insights'
import { validateMortgage } from './validation'
import type { MortgageInput } from './types'

const input: MortgageInput = {
  country: 'US', homePrice: 500000, downPayment: 20, downPaymentIsPercent: true,
  interestRate: 6.5, termYears: 30, termMonths: 0,
  includeTaxesAndCosts: true, propertyTax: 6000, propertyTaxPeriod: 'annual',
  homeInsurance: 150, hoa: 0, pmi: 0, otherCosts: 0,
  includeExtraPayments: true, monthlyExtraPayment: 200, yearlyExtraPayment: 1000,
  oneTimeExtraPayments: [{ amount: 500, year: 2026, month: 1 }], startYear: 2026, startMonth: 1,
}

describe('mortgage planning insights', () => {
  it('preserves the down payment across unit changes, including zero home prices', () => {
    const amount = convertDownPayment(input, false)
    expect(amount).toBe(100000)
    expect(convertDownPayment({ ...input, downPayment: amount, downPaymentIsPercent: false }, true)).toBe(20)
    expect(convertDownPayment({ ...input, downPaymentIsPercent: false, homePrice: 0 }, true)).toBe(0)
    const fractional = { ...input, homePrice: 687432.17, downPayment: 17.37 }
    const roundTrip = convertDownPayment({ ...fractional, downPayment: convertDownPayment(fractional, false), downPaymentIsPercent: false }, true)
    expect(roundTrip).toBeCloseTo(fractional.downPayment, 10)
  })

  it('includes every first-month cash flow while keeping the regular housing estimate separate', () => {
    const result = calculateMortgage(input)
    const firstMonth = result.schedule.filter(row => row.period === 1)
    const firstMonthTotal = firstMonth.reduce((sum, row) => sum + row.payment, 0) + 650
    expect(result.monthlyBreakdown.reduce((sum, slice) => sum + slice.amount, 0)).toBeCloseTo(firstMonthTotal, 2)
    expect(result.monthlyBreakdown.find(slice => slice.label === 'Extra principal')?.amount).toBe(700)
    expect(result.totalMonthlyHousing).toBeCloseTo(result.principalAndInterest + 650, 2)
    expect(result.monthlyBreakdown.reduce((sum, slice) => sum + slice.percent, 0)).toBeCloseTo(100, 8)
  })

  it('keeps balance charts in chronological order and closes each month after extras', () => {
    const result = calculateMortgage(input)
    const chart = buildMortgageCharts(result).find(chart => chart.title === 'Remaining balance')!
    const points = chart.series[0].data
    expect(points[0]).toEqual({ x: 0, y: result.loanAmount })
    expect(new Set(points.map(point => point.x)).size).toBe(points.length)
    expect(points.find(point => point.x === 12)?.y).toBe(result.schedule.filter(row => row.period === 12).at(-1)?.balance)
    expect(points.at(-1)).toEqual({ x: result.payoffPeriod, y: 0 })
    expect(points.every((point, i) => i === 0 || Number(point.x) > Number(points[i - 1].x))).toBe(true)
  })

  it('conserves principal, interest and cash flow in both schedule views', () => {
    const result = calculateMortgage(input)
    for (const annual of [true, false]) {
      const table = mortgageScheduleTable(result, annual)
      const sum = (key: string) => table.rows.reduce((total, row) => total + Number(row[key]), 0)
      expect(sum('payment')).toBeCloseTo(result.totalPayments, 2)
      expect(sum('interest')).toBeCloseTo(result.totalInterest, 2)
      expect(sum('principal') + sum('extraPrincipal')).toBeCloseTo(result.loanAmount, 2)
      expect(table.rows.at(-1)?.balance).toBe(0)
      expect(table.rows.length).toBe(annual ? Math.ceil(result.payoffPeriod / 12) : result.payoffPeriod)
    }
    expect(mortgageScheduleTable(result, false).rows[0].extraPrincipal).toBe(700)
    expect(mortgageScheduleTable(result, false).rows[11].extraPrincipal).toBe(1200)
  })

  it('does not use event count as a substitute for payment periods on short loans', () => {
    const result = calculateMortgage({ ...input, termYears: 0, termMonths: 6, interestRate: 0 })
    const table = mortgageScheduleTable(result, true)
    expect(table.rows).toHaveLength(1)
    expect(table.rows[0].payment).toBeCloseTo(result.loanAmount, 2)
  })

  it.each(['US', 'CA'] as const)('matches the engine payment for %s rate comparisons', country => {
    const scenario = { ...input, country, includeExtraPayments: false }
    const result = calculateMortgage(scenario)
    const comparisons = rateScenarios(scenario, result.loanAmount)
    expect(comparisons[1].payment).toBe(result.principalAndInterest)
    expect(comparisons[0].payment).toBeLessThan(comparisons[1].payment)
    expect(comparisons[2].payment).toBeGreaterThan(comparisons[1].payment)
  })

  it('handles zero interest and legacy monthly extras', () => {
    expect(rateScenarios({ ...input, interestRate: 0 }, 360000)).toEqual([{ rate: 0, payment: 1000 }, { rate: 0.5, payment: expect.any(Number) }])
    expect(monthlyExtra({ ...input, monthlyExtraPayment: undefined, extraPayment: 300 })).toBe(300)
    expect(monthlyExtra({ ...input, includeExtraPayments: false })).toBe(0)
  })

  it('applies a payoff target as a complete replacement and achieves its horizon', () => {
    const result = calculateMortgage(input)
    const target = result.payoffOptions.find(option => option.years === 15)!
    const applied = calculateMortgage({ ...input, monthlyExtraPayment: target.monthlyExtra, yearlyExtraPayment: 0, oneTimeExtraPayments: [], extraPayment: 0 })
    expect(applied.payoffPeriod).toBeLessThanOrEqual(180)
    expect(applied.interestSaved).toBeCloseTo(target.interestSaved, 0)
    expect(applied.remainingBalance).toBe(0)
  })

  it('reports invalid fractional or oversized terms before running the engine', () => {
    expect(validateMortgage({ ...input, termYears: 29.5 }).valid).toBe(false)
    expect(validateMortgage({ ...input, termMonths: 0.5 }).valid).toBe(false)
    expect(validateMortgage({ ...input, termYears: 50, termMonths: 1 }).valid).toBe(false)
    expect(validateMortgage({ ...input, interestRate: Infinity }).valid).toBe(false)
    expect(validateMortgage({ ...input, termYears: 29, termMonths: 12 }).valid).toBe(true)
  })
})
