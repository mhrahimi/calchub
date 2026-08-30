export interface DtiInput {
  grossMonthlyIncome: number
  housingCost: number
  debtPayments: number
  guideline: number
}

export interface DtiResult {
  frontEndDti: number
  backEndDti: number
  housingCost: number
  totalDebt: number
  withinGuideline: boolean
  breakdown: { label: string; amount: number }[]
}
