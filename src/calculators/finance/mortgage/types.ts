export type MortgageCountry = 'US' | 'CA'

export type ExtraPaymentFrequency = 'every' | 'yearly' | 'once'

export interface OneTimeExtraPayment {
  amount: number
  year: number
  month: number
}

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
  /** Legacy single extra. Used when the specific monthly or yearly amount is omitted. */
  extraPayment?: number
  extraFrequency?: ExtraPaymentFrequency
  /** Extra principal paid with every monthly installment. */
  monthlyExtraPayment?: number
  /** Extra principal paid once each year. */
  yearlyExtraPayment?: number
  /** First payment year. Falls back to the current year when omitted. */
  startYear?: number
  /** First payment month, 1–12. Falls back to the current month when omitted. */
  startMonth?: number
  /** One-time extras, each applied on the 1st of that month. Can be combined with monthly and yearly extras. */
  oneTimeExtraPayments?: OneTimeExtraPayment[]
}

export interface CostSlice {
  label: string
  amount: number
  percent: number
}

export interface PayoffOption {
  years: number
  /** Extra principal each month, rounded to the nearest dollar. */
  monthlyExtra: number
  /** Extra principal once a year, rounded to the nearest dollar. */
  yearlyExtra: number
  /** Interest avoided versus the original schedule, using the monthly extra. */
  interestSaved: number
  /** Sum of monthly extras actually paid over the shorter payoff. */
  totalExtraPaid: number
  /** Month and year of the last payment when the monthly extra is used. */
  payoffDate: string
}

export interface MortgageResult {
  status: string
  warnings: string[]
  remainingBalance: number
  finalPayment: number
  payoffDate: string | null
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
    date?: string
    payment: number
    extraPrincipal?: number
    principal: number
    interest: number
    balance: number
  }>
  interestSaved?: number
  periodsSaved?: number
  /** Extra monthly or yearly payment needed to finish in a shorter whole-year term. */
  payoffOptions: PayoffOption[]
}
