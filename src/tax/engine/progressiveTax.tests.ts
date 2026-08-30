import { describe, it, expect } from 'vitest'
import { applyProgressiveBrackets, computeCombinedTax } from './progressiveTax'
import { usFederal2026 } from '../us/2026/federal'
import { texas2026 } from '../us/2026/texas'
import { florida2026 } from '../us/2026/florida'
import { washington2026 } from '../us/2026/washington'
import { ontario2026 } from '../canada/2026/ontario'
import { canadaFederal2026 } from '../canada/2026/federal'
import { getTaxConfig, listJurisdictions } from '../registry'

describe('progressive tax engine', () => {
  it('returns zero tax for zero taxable income', () => {
    const r = applyProgressiveBrackets(0, usFederal2026.bracketsByStatus!.single!)
    expect(r.tax).toBe(0)
    expect(r.marginalRate).toBe(0)
  })

  it('applies exact bracket thresholds (just below)', () => {
    const justBelow = applyProgressiveBrackets(12399.99, usFederal2026.bracketsByStatus!.single!)
    expect(justBelow.marginalRate).toBe(0.1)
    expect(justBelow.tax).toBeCloseTo(12399.99 * 0.1, 1)
  })

  it('applies exact bracket thresholds (just above)', () => {
    const justAbove = applyProgressiveBrackets(12400.01, usFederal2026.bracketsByStatus!.single!)
    expect(justAbove.marginalRate).toBe(0.12)
    const expected = 12400 * 0.1 + 0.01 * 0.12
    expect(justAbove.tax).toBeCloseTo(expected, 1)
  })

  it('never multiplies all income by top rate', () => {
    const income = 100000
    const r = applyProgressiveBrackets(income, usFederal2026.bracketsByStatus!.single!)
    expect(r.tax).toBeLessThan(income * 0.37)
    expect(r.tax).toBeGreaterThan(income * 0.1)
  })

  it('uses standard deductions for Single and MFJ', () => {
    const single = computeCombinedTax({
      grossIncome: 50000,
      filingStatus: 'single',
      federal: usFederal2026,
      regional: texas2026,
    })
    expect(single.standardDeduction).toBe(16100)
    expect(single.taxableIncome).toBe(33900)

    const mfj = computeCombinedTax({
      grossIncome: 50000,
      filingStatus: 'married_joint',
      federal: usFederal2026,
      regional: texas2026,
    })
    expect(mfj.standardDeduction).toBe(32200)
    expect(mfj.taxableIncome).toBe(17800)
  })

  it('uses HOH standard deduction', () => {
    const hoh = computeCombinedTax({
      grossIncome: 50000,
      filingStatus: 'head_of_household',
      federal: usFederal2026,
      regional: texas2026,
    })
    expect(hoh.standardDeduction).toBe(24150)
  })

  it('returns zero regional tax for no-income-tax states', () => {
    for (const regional of [texas2026, florida2026, washington2026]) {
      const r = computeCombinedTax({
        grossIncome: 100000,
        filingStatus: 'single',
        federal: usFederal2026,
        regional,
      })
      expect(r.regionalTax).toBe(0)
      expect(r.federalTax).toBeGreaterThan(0)
    }
  })

  it('supports Canadian province selection via registry', () => {
    const provinces = listJurisdictions('CA')
    expect(provinces.map((p) => p.id)).toContain('ontario')
    const { federal, regional } = getTaxConfig('CA', 'ontario')
    expect(federal.id).toBe('ca-federal')
    expect(regional.id).toBe('ontario')
    const r = computeCombinedTax({
      grossIncome: 80000,
      filingStatus: 'single',
      federal,
      regional,
      useStandardDeduction: false,
    })
    expect(r.federalTax).toBeGreaterThan(0)
    expect(r.regionalTax).toBeGreaterThan(0)
  })

  it('matches Canada federal first bracket', () => {
    const r = applyProgressiveBrackets(50000, canadaFederal2026.brackets!)
    expect(r.tax).toBeCloseTo(50000 * 0.14, 2)
    expect(r.marginalRate).toBe(0.14)
  })

  it('matches Ontario first bracket', () => {
    const r = applyProgressiveBrackets(40000, ontario2026.brackets!)
    expect(r.tax).toBeCloseTo(40000 * 0.0505, 2)
  })

  it('uses the sum of federal and regional marginal rates', () => {
    const r = computeCombinedTax({
      grossIncome: 80000,
      filingStatus: 'single',
      federal: canadaFederal2026,
      regional: ontario2026,
      useStandardDeduction: false,
    })
    expect(r.marginalRate).toBeCloseTo(0.205 + 0.0915, 6)
  })
})
