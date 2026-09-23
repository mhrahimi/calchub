export interface CompoundInterestInput {
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
  finalBalance: number
  realValue: number
  totalContributions: number
  interestEarned: number
  schedule: Array<{ period: number; date?: string; balance: number; contributions: number; interest: number }>
}
