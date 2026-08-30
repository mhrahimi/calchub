export type TaxCountry = 'US' | 'CA'

export type FilingStatus =
  | 'single'
  | 'married_joint'
  | 'married_separate'
  | 'head_of_household'
  | 'qualifying_surviving_spouse'

export interface TaxBracket {
  lower: number
  /** Exclusive upper bound; Infinity for top bracket */
  upper: number
  rate: number
}

export interface SurtaxRule {
  label: string
  threshold: number
  rate: number
}

export interface TaxJurisdictionConfig {
  id: string
  country: TaxCountry
  year: number
  name: string
  /** Flat rate if set; otherwise use bracketsByStatus or brackets */
  flatRate?: number
  noIncomeTax?: boolean
  brackets?: TaxBracket[]
  bracketsByStatus?: Partial<Record<FilingStatus, TaxBracket[]>>
  standardDeductionByStatus?: Partial<Record<FilingStatus, number>>
  surtaxes?: SurtaxRule[]
  metadata?: {
    source?: string
    notes?: string[]
  }
}

export interface BracketSlice {
  lower: number
  upper: number
  rate: number
  taxableInBracket: number
  taxInBracket: number
}

export interface ProgressiveTaxResult {
  tax: number
  marginalRate: number
  effectiveRate: number
  bracketBreakdown: BracketSlice[]
  surtax: number
}

export interface CombinedTaxResult {
  taxableIncome: number
  federalTax: number
  regionalTax: number
  totalTax: number
  afterTaxIncome: number
  effectiveRate: number
  marginalRate: number
  federalBreakdown: BracketSlice[]
  regionalBreakdown: BracketSlice[]
  federalSurtax: number
  regionalSurtax: number
  standardDeduction: number
  pretaxDeductions: number
}

export interface PayrollResult {
  socialSecurity?: number
  medicare?: number
  additionalMedicare?: number
  cpp?: number
  cpp2?: number
  ei?: number
  qpp?: number
  qpip?: number
  total: number
  labels: { label: string; amount: number }[]
}

export interface JurisdictionOption {
  id: string
  name: string
  country: TaxCountry
}
