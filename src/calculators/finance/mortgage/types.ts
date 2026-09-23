export type MortgageCountry = 'US' | 'CA'

export type ExtraPaymentFrequency = 'every' | 'yearly' | 'once'

export interface MortgageInput {
  country: MortgageCountry
  homePrice: number
  downPayment: number
  downPaymentIsPercent: boolean
  interestRate: number
  termYears: number
  termMonths: number
  /** When false, property tax, insurance, HOA, PMI, and other costs are ignored (treated as 0). */
  includeTaxesAndCosts: boolean
  propertyTax: number
  propertyTaxPeriod: 'monthly' | 'annual'
  homeInsurance: number
  hoa: number
  pmi: number
  otherCosts: number
  /** When false, extra payments are ignored. */
  includeExtraPayments: boolean
  extraPayment?: number
  extraFrequency?: ExtraPaymentFrequency
}

export interface CostSlice {
  label: string
  amount: number
  percent: number
}

export interface MortgageResult {
  loanAmount: number
  downPaymentAmount: number
  principalAndInterest: number
  firstPaymentPrincipal: number
  firstPaymentInterest: number
  totalMonthlyHousing: number
  totalInterest: number
  totalPrincipalPaid: number
  totalPayments: number
  /** Lifetime housing extras (tax, insurance, misc) over the payoff horizon. */
  totalLifetimeExtras: number
  /** Full lifetime cost of ownership while loan is outstanding (P+I paid + extras). */
  totalLifetimeCost: number
  payoffPeriod: number
  monthlyRate: number
  /** First-month payment mix including principal vs interest split. */
  monthlyBreakdown: CostSlice[]
  /** Lifetime allocation: principal repaid, interest, taxes, insurance, misc. */
  lifetimeBreakdown: CostSlice[]
  housingBreakdown: { label: string; amount: number }[]
  schedule: Array<{
    period: number
    payment: number
    extraPrincipal?: number
    principal: number
    interest: number
    balance: number
  }>
  interestSaved?: number
  periodsSaved?: number
}
