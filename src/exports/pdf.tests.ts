import { describe, expect, it } from 'vitest'
import { buildExportPayloadFromRecord, humanizeKey } from './buildPayload'
import { exportToPdf } from './pdf'
import { calculateLoan } from '@/calculators/finance/loan/calculate'
import { calculateDti } from '@/calculators/finance/dti/calculate'
import { calculateCompoundInterest } from '@/calculators/finance/compoundInterest/calculate'

describe('export pdf', () => {
  it('builds payload from stored record', async () => {
    const inputs = {
      mode: 'standard' as const,
      loanAmount: 25000,
      interestRate: 5.9,
      term: 5,
      termUnit: 'years' as const,
      paymentFrequency: 'monthly' as const,
    }
    const results = calculateLoan(inputs)
    const payload = await buildExportPayloadFromRecord({
      calculatorId: 'loan',
      inputs,
      results,
      createdAt: '2026-01-01T00:00:00.000Z',
    })
    expect(payload.title).toBe('Loan Calculator')
    expect(payload.resultsSummary.length).toBeGreaterThan(0)
    expect(payload.explanation?.steps.length).toBeGreaterThan(0)
  })

  it('generates a non-empty PDF blob', async () => {
    const inputs = {
      grossMonthlyIncome: 8000,
      housingCost: 2000,
      debtPayments: 500,
      guideline: 43,
    }
    const results = calculateDti(inputs)
    const payload = await buildExportPayloadFromRecord({
      calculatorId: 'dti',
      inputs,
      results,
      createdAt: '2026-01-01T00:00:00.000Z',
    })
    const blob = await exportToPdf(payload)
    expect(blob.size).toBeGreaterThan(500)
    expect(blob.type).toBe('application/pdf')
  })

  it('humanizes result labels and marks the first metric primary', async () => {
    expect(humanizeKey('finalBalance')).toBe('Final balance')
    const inputs = {
      principal: 10000,
      interestRate: 7,
      duration: 10,
      durationUnit: 'years' as const,
      compoundingFrequency: 'monthly',
      contribution: 200,
      contributionFrequency: 'monthly',
      contributionTiming: 'end' as const,
      continuous: false,
      adjustForInflation: false,
      inflationRate: 0,
    }
    const results = calculateCompoundInterest(inputs)
    const payload = await buildExportPayloadFromRecord({
      calculatorId: 'compound-interest',
      inputs,
      results,
      createdAt: '2026-01-01T00:00:00.000Z',
    })
    expect(payload.charts?.length).toBeGreaterThan(0)
    expect(payload.resultsSummary[0]?.primary).toBe(true)
    expect(payload.resultsSummary[0]?.label).toBe('Final balance')
    const blob = await exportToPdf(payload)
    expect(blob.size).toBeGreaterThan(1000)
    expect(blob.type).toBe('application/pdf')
  })
})
