import type { TaxCountry, FilingStatus } from '@/tax/types'

export interface IncomeTaxInput {
  country: TaxCountry
  taxYear: number
  jurisdictionId: string
  filingStatus: FilingStatus
  grossIncome: number
  pretaxDeductions: number
  useStandardDeduction: boolean
}

export interface IncomeTaxResult {
  taxableIncome: number
  federalTax: number
  regionalTax: number
  totalTax: number
  afterTaxIncome: number
  effectiveRate: number
  marginalRate: number
  standardDeduction: number
  pretaxDeductions: number
  federalBreakdown: Array<{
    lower: number
    upper: number
    rate: number
    taxableInBracket: number
    taxInBracket: number
  }>
  regionalBreakdown: Array<{
    lower: number
    upper: number
    rate: number
    taxableInBracket: number
    taxInBracket: number
  }>
  federalSurtax: number
  regionalSurtax: number
  taxConfigVersion: string
  notes: string[]
}
