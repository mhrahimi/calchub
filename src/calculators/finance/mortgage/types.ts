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
  hoa: number
  pmi: number
  otherCosts: number
  extraPayment?: number
}

export interface MortgageResult {
  loanAmount: number
  principalAndInterest: number
  totalMonthlyHousing: number
  totalInterest: number
  totalPayments: number
  payoffPeriod: number
  monthlyRate: number
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
