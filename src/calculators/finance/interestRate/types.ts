export interface InterestRateInput {
  principal: number
  payment: number
  term: number
  termUnit: 'years' | 'months'
  paymentFrequency: string
  balloon?: number
}

export interface InterestRateResult {
  status?: string
  warnings?: string[]
  remainingBalance?: number
  balloonPaid?: number
  periodicRate: number
  annualRate: number
  effectiveAnnualRate: number
  totalInterest: number
  schedule: Array<{ period: number; payment: number; principal: number; interest: number; balance: number }>
}
