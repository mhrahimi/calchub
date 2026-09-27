export interface CompoundInterestInput {
  rateConvention?: 'nominal-annual'
  startDate?: string
  principal: number
  interestRate: number
  duration: number
  durationUnit: 'years' | 'months'
  compoundingFrequency: string
  contribution: number
  contributionFrequency: string
  contributionTiming: 'end' | 'begin'
  continuous: boolean
  adjustForInflation: boolean
  inflationRate: number
}

export interface CompoundInterestResult {
  status: 'success' | 'depleted'
  warnings: string[]
  rateConvention: 'nominal-annual'
  effectiveAnnualRate: number
  depletionDate?: string
  unmetWithdrawals: number
  finalBalance: number
  realValue: number
  totalContributions: number
  interestEarned: number
  schedule: Array<{ period: number; date?: string; balance: number; contributions: number; interest: number; unmetWithdrawals?: number }>
}
