export type SavingsSolveFor = 'contribution' | 'time' | 'balance'

export interface SavingsGoalInput {
  solveFor: SavingsSolveFor
  currentSavings: number
  goalAmount: number
  returnRate: number
  period: number
  periodUnit: 'years' | 'months'
  contributionFrequency: string
  periodicContribution?: number
}

export interface SavingsGoalResult {
  requiredContribution: number
  timeToGoal: number
  projectedBalance: number
  totalContributions: number
  goalAmount: number
  schedule: Array<{ period: number; balance: number }>
}
