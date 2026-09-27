export type SolveFor = 'fv' | 'pv' | 'pmt' | 'rate' | 'periods'

export interface InvestmentInput {
  rateConvention?: 'nominal-annual'
  solveFor: SolveFor
  startingInvestment: number
  periodicContribution: number
  contributionFrequency: string
  contributionTiming: 'end' | 'begin'
  returnRate: number
  period: number
  periodUnit: 'years' | 'months'
  targetValue?: number
}

export interface InvestmentResult {
  status: 'success' | 'depleted'
  warnings: string[]
  rateConvention: 'nominal-annual'
  effectiveAnnualRate: number
  depletionPeriod?: number
  unmetWithdrawals: number
  elapsedPeriods?: number
  elapsedTime?: string
  endingBalance: number
  startingPrincipal: number
  totalContributions: number
  investmentEarnings: number
  solvedValue: number
  solvedLabel: string
  schedule: Array<{ period: number; balance: number; contributions: number; earnings: number; unmetWithdrawals?: number }>
}
