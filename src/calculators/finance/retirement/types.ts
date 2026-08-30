export interface RetirementInput {
  currentAge: number
  retirementAge: number
  currentSavings: number
  annualContribution: number
  contributionGrowth: number
  expectedReturn: number
  inflation: number
  retirementSpending: number
  retirementDuration: number
  otherRetirementIncome: number
}

export interface RetirementResult {
  yearsToRetirement: number
  projectedBalance: number
  requiredBalance: number
  shortfallOrSurplus: number
  requiredAnnualContribution: number
  accumulation: Array<{ age: number; balance: number; contributions: number }>
  drawdown: Array<{ age: number; balance: number; withdrawal: number }>
  annualSchedule: Array<{
    age: number
    phase: string
    balance: number
    contribution: number
    withdrawal: number
  }>
}
