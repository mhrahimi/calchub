import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CALCULATOR_REGISTRY } from '@/calculators/registry'
import { getEngineExportFns } from '@/exports/engineRegistry'
import { setPendingRestore, consumePendingRestore, clearPendingRestore } from '@/persistence/restore'
import { calculateMortgage } from '@/calculators/finance/mortgage/calculate'
import { calculateRetirement } from '@/calculators/finance/retirement/calculate'
import { calculateCompoundInterest } from '@/calculators/finance/compoundInterest/calculate'
import { calculateIncomeTax } from '@/calculators/tax/incomeTax/calculate'
import { isValidTriangle } from '@/calculators/math/triangle/solver'
import { validateTriangle } from '@/calculators/math/triangle/validation'

function mockSessionStorage() {
  const store = new Map<string, string>()
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: () => null,
    get length() {
      return store.size
    },
  })
}

describe('registry completeness', () => {
  it('has all calculators implemented with routes', () => {
    expect(CALCULATOR_REGISTRY.length).toBeGreaterThanOrEqual(27)
    for (const calc of CALCULATOR_REGISTRY) {
      expect(calc.implemented, `${calc.id} should be implemented`).toBe(true)
      expect(calc.route).toMatch(/^\/calculators\//)
    }
  })

  it('maps every calculator to export engine functions', () => {
    for (const calc of CALCULATOR_REGISTRY) {
      const engine = getEngineExportFns(calc.id)
      expect(engine, `${calc.id} missing export engine`).toBeDefined()
      expect(engine!.explain).toBeTypeOf('function')
    }
  })
})

describe('restore queue', () => {
  beforeEach(() => {
    mockSessionStorage()
    clearPendingRestore()
  })

  it('stores and consumes pending restore once', () => {
    setPendingRestore({
      mode: 'reopen',
      record: {
        id: '1',
        calculatorId: 'loan',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        inputs: { loanAmount: 1000 },
        results: { payment: 100 },
        settingsVersion: 1,
      },
    })
    const first = consumePendingRestore('loan')
    expect(first?.mode).toBe('reopen')
    expect(consumePendingRestore('loan')).toBeNull()
  })

  it('ignores restore for mismatched calculator', () => {
    setPendingRestore({
      mode: 'edit',
      record: {
        id: '2',
        calculatorId: 'mortgage',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        inputs: {},
        results: {},
        settingsVersion: 1,
      },
    })
    expect(consumePendingRestore('loan')).toBeNull()
    clearPendingRestore()
  })
})

describe('regression snapshots', () => {
  it('computes Canadian semi-annual mortgage compounding', () => {
    const r = calculateMortgage({
      country: 'CA',
      homePrice: 500000,
      downPayment: 100000,
      downPaymentIsPercent: false,
      interestRate: 5.5,
      term: 25,
      termUnit: 'years',
      propertyTax: 4000,
      propertyTaxPeriod: 'annual',
      homeInsurance: 1200,
      hoa: 0,
      pmi: 0,
      otherCosts: 0,
    })
    expect(r.principalAndInterest).toBeGreaterThan(2400)
    expect(r.principalAndInterest).toBeLessThan(2500)
    expect(r.schedule.at(-1)?.balance).toBeLessThanOrEqual(0.01)
  })

  it('detects retirement shortfall', () => {
    const r = calculateRetirement({
      currentAge: 35,
      retirementAge: 65,
      currentSavings: 50000,
      annualContribution: 2400,
      contributionGrowth: 0,
      expectedReturn: 6,
      inflation: 2.5,
      retirementSpending: 80000,
      retirementDuration: 25,
      otherRetirementIncome: 0,
    })
    expect(r.shortfallOrSurplus).toBeLessThan(0)
    expect(r.requiredAnnualContribution).toBeGreaterThan(2400)
  })

  it('handles compound interest end-of-period contributions', () => {
    const r = calculateCompoundInterest({
      principal: 10000,
      interestRate: 5,
      duration: 10,
      durationUnit: 'years',
      compoundingFrequency: 'monthly',
      contribution: 100,
      contributionFrequency: 'monthly',
      contributionTiming: 'end',
      continuous: false,
      adjustForInflation: false,
      inflationRate: 0,
    })
    expect(r.finalBalance).toBeGreaterThan(25000)
  })

  it('returns zero regional tax for no-income-tax jurisdiction', () => {
    const r = calculateIncomeTax({
      country: 'US',
      taxYear: 2026,
      jurisdictionId: 'texas',
      filingStatus: 'single',
      grossIncome: 100000,
      pretaxDeductions: 0,
      useStandardDeduction: true,
    })
    expect(r.regionalTax).toBe(0)
    expect(r.federalTax).toBeGreaterThan(0)
  })

  it('rejects impossible triangle dimensions', () => {
    expect(isValidTriangle(1, 2, 5)).toBe(false)
    const validation = validateTriangle({ case: 'SSS', sideA: 1, sideB: 2, sideC: 5 })
    expect(validation.valid).toBe(false)
    if (!validation.valid) {
      expect(validation.errors.sideC).toMatch(/triangle inequality/i)
    }
  })
})
