export type MortgageCountry = 'US' | 'CA'

export interface MortgageInput {
  country: MortgageCountry
  homePrice: number
  downPayment: number
  downPaymentIsPercent: boolean
  interestRate: number
  term: number
  termUnit: 'years' | 'months'
  propertyTax: number
  propertyTaxPeriod: 'monthly' | 'annual'
  homeInsurance: number
  /** When false, HOA / PMI / other monthly costs are ignored (treated as 0). */
  includeMiscCosts: boolean
  hoa: number
  pmi: number
  otherCosts: number
  extraPayment?: number
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
    principal: number
    interest: number
    balance: number
  }>
  interestSaved?: number
  periodsSaved?: number
}
