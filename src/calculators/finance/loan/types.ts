export type LoanMode = 'standard' | 'auto'

export interface LoanInput {
  mode: LoanMode
  loanAmount?: number
  interestRate: number
  term: number
  termUnit: 'years' | 'months'
  paymentFrequency: string
  fees?: number
  balloon?: number
  extraPayment?: number
  vehiclePrice?: number
  cashDown?: number
  tradeIn?: number
  rebates?: number
  salesTaxRate?: number
  taxableFees?: number
}

export interface LoanResult {
  financedAmount: number
  payment: number
  totalInterest: number
  totalCost: number
  schedule: Array<{
    period: number
    payment: number
    principal: number
    interest: number
    balance: number
  }>
  costBreakdown?: { label: string; amount: number }[]
}
