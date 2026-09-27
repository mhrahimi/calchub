import { describe, expect, it } from 'vitest'
import { calculateInvestment, explainInvestment, buildInvestmentTable } from './investment/calculate'
import { validateInvestment } from './investment/validation'
import type { InvestmentInput } from './investment/types'
import { calculateCompoundInterest, explainCompoundInterest } from './compoundInterest/calculate'
import { validateCompoundInterest } from './compoundInterest/validation'
import type { CompoundInterestInput } from './compoundInterest/types'
import { resultMetadata } from '@/exports/resultMetadata'
import { captureProvenance } from '@/exports/provenance'
import { inputFields, resultFields } from '@/exports/reportFields'
import { DEFAULT_SETTINGS } from '@/calculators/types'

const investment: InvestmentInput = { solveFor: 'fv', startingInvestment: 10000, periodicContribution: 500, contributionFrequency: 'monthly', contributionTiming: 'end', returnRate: 7, period: 20, periodUnit: 'years' }
const compound: CompoundInterestInput = { principal: 10000, interestRate: 7, duration: 10, durationUnit: 'years', compoundingFrequency: 'monthly', contribution: 200, contributionFrequency: 'monthly', contributionTiming: 'end', continuous: false, adjustForInflation: false, inflationRate: 3 }

describe('P1 investment goal and withdrawal calculations', () => {
  it('retains standard results and explicit rate assumptions', () => {
    const r = calculateInvestment(investment)
    expect(r.endingBalance).toBe(300850.72)
    expect(r.effectiveAnnualRate).toBeCloseTo(((1 + .07 / 12) ** 12 - 1) * 100, 9)
    expect(r.rateConvention).toBe('nominal-annual')
    expect(explainInvestment(investment, r).assumptions?.join(' ')).toContain('nominal annual')
    expect(validateInvestment(investment)).toMatchObject({ data: { rateConvention: 'nominal-annual' } })
  })
  it.each(['begin', 'end'] as const)('verifies every inverse mode against a forward ledger with %s timing', contributionTiming => {
    const input = { ...investment, contributionTiming }
    const targetValue = calculateInvestment(input).endingBalance
    const pmt = calculateInvestment({ ...input, solveFor: 'pmt', targetValue })
    const pv = calculateInvestment({ ...input, solveFor: 'pv', targetValue })
    const rate = calculateInvestment({ ...input, solveFor: 'rate', targetValue })
    expect(pmt.solvedValue).toBeCloseTo(500, 2)
    expect(pv.solvedValue).toBeCloseTo(10000, 2)
    expect(rate.solvedValue).toBeCloseTo(7, 6) // The target is rounded to cents.
    for (const r of [pmt, pv, rate]) expect(r.schedule.at(-1)?.balance).toBe(targetValue)
    expect(calculateInvestment({ ...input, periodicContribution: pmt.solvedValue }).endingBalance).toBe(targetValue)
    expect(calculateInvestment({ ...input, startingInvestment: pv.solvedValue }).endingBalance).toBe(targetValue)
    expect(calculateInvestment({ ...input, returnRate: rate.solvedValue }).endingBalance).toBe(targetValue)
  })
  it('counts drawdown events at their actual beginning/end timing', () => {
    const input = { ...investment, solveFor: 'periods' as const, startingInvestment: 100000, periodicContribution: -1000, returnRate: 0, targetValue: 50000 }
    const end = calculateInvestment(input)
    expect(end.elapsedPeriods).toBe(50)
    expect(end.solvedValue).toBe(50 / 12)
    expect(end.elapsedTime).toBe('4 years, 2 months')
    expect(end.endingBalance).toBe(50000)
    const begin = calculateInvestment({ ...input, contributionTiming: 'begin' })
    expect(begin.elapsedPeriods).toBe(49)
    expect(begin.endingBalance).toBe(50000)
  })
  it('reaches a goal with the contribution posted at time zero', () => {
    const r = calculateInvestment({ ...investment, solveFor: 'periods', startingInvestment: 0, periodicContribution: 100, contributionTiming: 'begin', returnRate: 0, targetValue: 50 })
    expect(r.solvedValue).toBe(0)
    expect(r.elapsedPeriods).toBe(0)
    expect(r.endingBalance).toBe(100)
    expect(r.schedule).toHaveLength(1)
    expect(r.schedule[0]).toMatchObject({ period: 0, balance: 100, contributions: 100 })
  })
  it('identifies already-funded and unreachable goals', () => {
    const already = calculateInvestment({ ...investment, solveFor: 'periods', startingInvestment: 60000, targetValue: 50000 })
    expect(already.elapsedPeriods).toBe(0)
    expect(already.endingBalance).toBe(60000)
    expect(() => calculateInvestment({ ...investment, solveFor: 'periods', periodicContribution: 0, returnRate: 0, targetValue: 20000 })).toThrow(/unreachable/)
    expect(() => calculateInvestment({ ...investment, solveFor: 'periods', periodicContribution: 500, returnRate: -5, startingInvestment: 100000, targetValue: 50000 })).toThrow(/unreachable/)
  })
  it('distinguishes an already-funded zero goal from asymptotic decay to zero', () => {
    expect(calculateInvestment({ ...investment, solveFor: 'periods', targetValue: 0 }).elapsedPeriods).toBe(0)
    expect(() => calculateInvestment({ ...investment, solveFor: 'periods', returnRate: -1000, periodicContribution: 0, targetValue: 0 })).toThrow(/exactly zero/)
  })
  it('caps withdrawals, conserves the ledger, and reports depletion and unmet cash flows', () => {
    const r = calculateInvestment({ ...investment, startingInvestment: 100, periodicContribution: -200, returnRate: 0, period: 1 })
    expect(r.status).toBe('depleted')
    expect(r.depletionPeriod).toBe(1 / 12)
    expect(r.endingBalance).toBe(0)
    expect(r.totalContributions).toBe(0)
    expect(r.investmentEarnings).toBe(0)
    expect(r.unmetWithdrawals).toBe(2300)
    expect(r.schedule.every(row => row.balance >= 0 && row.balance === row.contributions + row.earnings)).toBe(true)
    expect(buildInvestmentTable(r).columns.some(col => col.key === 'unmetWithdrawals')).toBe(true)
    expect(r.warnings.join(' ')).toContain('No borrowing')
  })
  it('reports immediate depletion for beginning withdrawals', () => {
    const r = calculateInvestment({ ...investment, startingInvestment: 100, periodicContribution: -200, returnRate: 0, period: 1, contributionTiming: 'begin' })
    expect(r.depletionPeriod).toBe(0)
    expect(r.unmetWithdrawals).toBe(2300)
    expect(r.endingBalance).toBe(0)
  })
  it('retains precise time and units for weekly goals', () => {
    const r = calculateInvestment({ ...investment, solveFor: 'periods', startingInvestment: 0, periodicContribution: 100, contributionFrequency: 'weekly', returnRate: 0, targetValue: 300 })
    expect(r.elapsedPeriods).toBe(3)
    expect(r.elapsedTime).toBe('3 weeks')
    expect(r.solvedValue).toBe(3 / 52)
  })
  it('keeps tiny nonzero rates consistent across summary and ledger', () => {
    const r = calculateInvestment({ ...investment, returnRate: 1e-12 })
    expect(r.endingBalance).toBe(130000)
    expect(r.schedule.at(-1)?.balance).toBe(r.endingBalance)
    const solved = calculateInvestment({ ...investment, solveFor: 'pmt', returnRate: 1e-12, targetValue: 130000 })
    expect(solved.solvedValue).toBeCloseTo(500, 8)
    expect(solved.endingBalance).toBe(130000)
  })
  it('rejects a PV requiring negative starting capital', () => {
    expect(() => calculateInvestment({ ...investment, solveFor: 'pv', targetValue: 1000 })).toThrow(/contributions already exceed/)
  })
})

describe('P1 investment domain validation', () => {
  it.each([
    { startingInvestment: NaN }, { startingInvestment: Infinity }, { startingInvestment: -1 },
    { periodicContribution: NaN }, { periodicContribution: Infinity }, { returnRate: NaN },
    { returnRate: Infinity }, { returnRate: -1200 }, { period: 0 }, { period: NaN },
    { period: Infinity }, { period: 501 }, { period: .1, periodUnit: 'months' },
    { period: 1.5, periodUnit: 'months' }, { contributionFrequency: 'invalid' },
    { contributionFrequency: 'toString' }, { contributionTiming: 'middle' }, { periodUnit: 'days' },
    { solveFor: 'invalid' }, { solveFor: 'pmt' }, { solveFor: 'rate', targetValue: 0 },
    { solveFor: 'pmt', targetValue: -1 }, { solveFor: 'pmt', targetValue: Infinity },
  ])('rejects malformed or unsupported input %j', patch => {
    const input = { ...investment, ...patch } as InvestmentInput
    expect(validateInvestment(input).valid).toBe(false)
    expect(() => calculateInvestment(input)).toThrow()
  })
  it('ignores inactive unknowns without ignoring active inputs', () => {
    expect(() => calculateInvestment({ ...investment, solveFor: 'rate', returnRate: NaN, targetValue: 300850.72 })).not.toThrow()
    expect(() => calculateInvestment({ ...investment, solveFor: 'pmt', periodicContribution: NaN, targetValue: 300850.72 })).not.toThrow()
    expect(() => calculateInvestment({ ...investment, solveFor: 'pv', startingInvestment: NaN, targetValue: 300850.72 })).not.toThrow()
    expect(() => calculateInvestment({ ...investment, solveFor: 'periods', period: NaN, targetValue: 20000 })).not.toThrow()
  })
  it('rejects overflow before it can become a saved successful result', () => {
    expect(() => calculateInvestment({ ...investment, returnRate: 1000, period: 100 })).toThrow(/range/)
  })
})

describe('P1 compound interest validation and withdrawal policy', () => {
  it('preserves nominal, real, and continuous benchmarks', () => {
    const r = calculateCompoundInterest({ ...compound, adjustForInflation: true })
    expect(r.finalBalance).toBe(54713.58)
    expect(r.realValue).toBe(40712.04)
    expect(r.effectiveAnnualRate).toBeCloseTo(((1 + .07 / 12) ** 12 - 1) * 100, 9)
    expect(calculateCompoundInterest({ ...compound, continuous: true, contribution: 0 }).finalBalance).toBe(20137.53)
    expect(explainCompoundInterest(compound, r).assumptions?.join(' ')).toContain('nominal annual')
  })
  it.each([
    { principal: NaN }, { principal: -1 }, { contribution: Infinity }, { duration: 0 },
    { duration: NaN }, { duration: 501 }, { interestRate: Infinity }, { interestRate: -1200 },
    { compoundingFrequency: 'invalid' }, { contributionFrequency: 'invalid' },
    { contributionTiming: 'middle' }, { durationUnit: 'days' }, { startDate: '' },
    { startDate: '2026-02-30' }, { startDate: '2026-01-01junk' },
    { adjustForInflation: true, inflationRate: -100 }, { adjustForInflation: true, inflationRate: NaN },
  ])('rejects invalid compound input %j in validation and engine', patch => {
    const input = { ...compound, ...patch } as CompoundInterestInput
    expect(validateCompoundInterest(input).valid).toBe(false)
    expect(() => calculateCompoundInterest(input)).toThrow()
  })
  it('ignores disabled inflation and supports finite negative interest', () => {
    expect(calculateCompoundInterest({ ...compound, inflationRate: NaN }).realValue).toBe(54713.58)
    expect(calculateCompoundInterest({ ...compound, interestRate: -5, contribution: 0 }).finalBalance).toBeLessThan(10000)
    expect(() => calculateCompoundInterest({ ...compound, continuous: true, interestRate: -2000 })).not.toThrow()
  })
  it('rejects overflow from inflation deflation', () => {
    expect(() => calculateCompoundInterest({ ...compound, duration: 500, interestRate: 0, adjustForInflation: true, inflationRate: -99 })).toThrow(/range/)
  })
  it.each(['begin', 'end'] as const)('tracks depletion dates and cumulative unmet withdrawals for %s timing', contributionTiming => {
    const r = calculateCompoundInterest({ ...compound, principal: 100, contribution: -200, interestRate: 0, duration: 1, contributionTiming, startDate: '2026-01-01' })
    expect(r.depletionDate).toBe(contributionTiming === 'begin' ? '2026-01-01' : '2026-02-01')
    expect(r.status).toBe('depleted')
    expect(r.finalBalance).toBe(0)
    expect(r.totalContributions).toBe(0)
    expect(r.interestEarned).toBe(0)
    expect(r.unmetWithdrawals).toBe(2300)
    expect(r.schedule.every(row => row.balance >= 0)).toBe(true)
    expect(r.schedule.at(-1)?.unmetWithdrawals).toBe(r.unmetWithdrawals)
  })
})

describe('P1 result/report and saved-snapshot contracts', () => {
  it('records rate convention, frequency, and readable solved time', () => {
    const input = { ...investment, solveFor: 'periods' as const, startingInvestment: 0, periodicContribution: 100, contributionFrequency: 'weekly', returnRate: 0, targetValue: 300 }
    const validated = validateInvestment(input)
    if (!validated.valid) throw new Error('Invalid fixture')
    const r = calculateInvestment(validated.data)
    const metadata = resultMetadata('investment', r, explainInvestment(validated.data, r))
    const provenance = captureProvenance('investment', validated.data, metadata, DEFAULT_SETTINGS, r)
    expect(provenance.units).toMatchObject({ contributionFrequency: 'weekly', rateConvention: 'nominal-annual' })
    expect(inputFields(validated.data, provenance).map(field => field.key)).not.toContain('period')
    expect(inputFields(validated.data, provenance).map(field => field.key)).not.toContain('periodUnit')
    const fields = resultFields('investment', input, r, provenance, metadata.primaryResult)
    expect(fields.find(field => field.primary)?.display).toBe('3 weeks')
    expect(fields.find(field => field.key === 'elapsedPeriods')?.raw).toBe(3)
  })
  it('includes frequency in solved contribution results and reports', () => {
    const r = calculateInvestment({ ...investment, solveFor: 'pmt', targetValue: 100000, contributionFrequency: 'weekly' })
    expect(r.solvedLabel).toBe('Required contribution per week')
  })
  it.each(['investment', 'compound-interest'])('marks previous %s models outdated without rewriting their values', id => {
    const old = { endingBalance: -100, finalBalance: -100, metadata: { primaryResult: 'finalBalance', modelVersion: `${id}/2.2.0`, status: 'success', warnings: [], assumptions: [], sources: [] } }
    expect(resultMetadata(id, old).status).toBe('outdated')
    expect(old.finalBalance).toBe(-100)
    expect(resultMetadata(id, {}).modelVersion).toBe(`${id}/2.3.0`)
  })
})
