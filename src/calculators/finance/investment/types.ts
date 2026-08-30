export type SolveFor = 'fv' | 'pv' | 'pmt' | 'rate' | 'periods'

export interface InvestmentInput {
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
  endingBalance: number
  startingPrincipal: number
  totalContributions: number
  investmentEarnings: number
  solvedValue: number
  solvedLabel: string
  schedule: Array<{ period: number; balance: number; contributions: number; earnings: number }>
}
