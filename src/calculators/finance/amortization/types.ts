export interface AmortizationInput {
  principal: number
  interestRate: number
  term: number
  termUnit: 'years' | 'months'
  paymentFrequency: string
  startDate?: string
  extraPayment?: number
  extraFrequency?: 'every' | 'monthly' | 'yearly' | 'once'
}

export interface AmortizationResult {
  payment: number
  totalPayments: number
  totalInterest: number
  totalPrincipal: number
  payoffPeriod: number
  interestSaved?: number
  periodsSaved?: number
  schedule: Array<{
    period: number
    date?: string
    payment: number
    principal: number
    interest: number
    extraPrincipal: number
    balance: number
  }>
  baselineSchedule?: AmortizationResult['schedule']
}
