import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MortgageResults } from './MortgageResults'
import { SnapshotFormatContext } from '@/components/calculator/SnapshotFormat'
import { calculateMortgage, buildMortgageCharts, explainMortgage } from '@/calculators/finance/mortgage/calculate'
import { resultMetadata } from '@/exports/resultMetadata'
import { captureProvenance } from '@/exports/provenance'
import { DEFAULT_SETTINGS } from '@/calculators/types'
import type { MortgageInput } from '@/calculators/finance/mortgage/types'

const base: MortgageInput = {
  country: 'US', homePrice: 500000, downPayment: 20, downPaymentIsPercent: true, interestRate: 6.5,
  termYears: 30, termMonths: 0, includeTaxesAndCosts: false, propertyTax: 6000, propertyTaxPeriod: 'annual',
  homeInsurance: 150, hoa: 0, pmi: 0, otherCosts: 0, includeExtraPayments: false, startYear: 2026, startMonth: 1,
}
function render(input: MortgageInput, legacy = false) {
  const result = calculateMortgage(input)
  if (legacy) result.monthlyBreakdown = result.monthlyBreakdown.filter(slice => slice.label !== 'Extra principal')
  const metadata = resultMetadata('mortgage', result, explainMortgage(input, result))
  const provenance = captureProvenance('mortgage', input, metadata, DEFAULT_SETTINGS, result)
  return renderToStaticMarkup(createElement(SnapshotFormatContext.Provider, { value: provenance }, createElement(MortgageResults, { result, input, charts: buildMortgageCharts(result), onApplyPayoff: () => {} })))
}

describe('mortgage result presentation', () => {
  it('clearly labels a principal-and-interest-only estimate', () => {
    const html = render(base)
    expect(html).toContain('USD 2,528.27')
    expect(html).toContain('Taxes, insurance and other ownership costs are not included.')
    expect(html).toContain('aria-label="Mortgage result views"')
    expect(html).not.toMatch(/NaN|undefined|Currency not recorded/)
  })
  it('labels housing costs and preserves the calculated country currency', () => {
    const html = render({ ...base, country: 'CA', includeTaxesAndCosts: true })
    expect(html).toContain('Monthly housing estimate')
    expect(html).toContain('CAD 650.00')
    expect(html).toContain('Canadian quotes use semi-annual compounding.')
    expect(html).not.toContain('USD')
  })
  it('explains extra cash requirements, including on reopened legacy results', () => {
    const html = render({ ...base, includeExtraPayments: true, monthlyExtraPayment: 200 }, true)
    expect(html).toContain('With your planned monthly extra:')
    expect(html).toContain('USD 2,728.27')
    expect(html).toContain('Extra principal')
    expect(html).toContain('Annual and one-time extras are separate')
  })
  it('marks old mortgage snapshots outdated without rewriting their saved numbers', () => {
    const result = { principalAndInterest: 1234, metadata: { primaryResult: 'principalAndInterest', modelVersion: 'mortgage/2.2.0', status: 'success', warnings: [], assumptions: [], sources: [] } }
    const metadata = resultMetadata('mortgage', result)
    expect(metadata.status).toBe('outdated')
    expect(metadata.modelVersion).toBe('mortgage/2.2.0')
    expect(result.principalAndInterest).toBe(1234)
  })
})
