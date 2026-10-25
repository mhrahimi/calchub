import type { FilingStatus, TaxCountry } from '@/tax/types'

export type ContributionPath = 'direct' | 'income'
export type InvestMode = 'percent-gross' | 'percent-net' | 'fixed'
export type ContributionTaxTreatment = 'pretax' | 'aftertax'
export type ReturnPreset = 'conservative' | 'moderate' | 'growth' | 'custom'

export const RETURN_PRESETS: Record<Exclude<ReturnPreset, 'custom'>, number> = {
  conservative: 5,
  moderate: 7,
  growth: 9,
}

export interface RetirementInput {
  /** Missing values use the dollar-amount path so older saved calculations still run. */
  contributionPath?: ContributionPath
  returnPreset?: ReturnPreset
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
  grossIncome?: number
  country?: TaxCountry
  jurisdictionId?: string
  filingStatus?: FilingStatus
  taxYear?: number
  otherPretaxDeductions?: number
  investMode?: InvestMode
  investPercent?: number
  investAmount?: number
  contributionTaxTreatment?: ContributionTaxTreatment
  employerMatchPercent?: number
  employerMatchCapPercent?: number
}

export interface RetirementResult {
  contributionPath: ContributionPath
  yearsToRetirement: number
  projectedBalance: number
  requiredBalance: number
  shortfallOrSurplus: number
  requiredAnnualContribution: number
  depletionAge: number | null
  totalUnmetSpending: number
  status: 'success' | 'insufficient_funds'
  warnings: string[]
  estimatedNetAnnual?: number
  employeeContribution?: number
  employerMatch?: number
  investedThisYear?: number
  projectedBalanceToday?: number
  taxConfigVersion?: string
  accumulation: Array<{ age: number; balance: number; contributions: number }>
  drawdown: Array<{ age: number; balance: number; withdrawal: number; plannedWithdrawal: number; unmetSpending: number }>
  annualSchedule: Array<{
    age: number
    phase: string
    balance: number
    contribution: number
    withdrawal: number
    plannedWithdrawal: number
    unmetSpending: number
  }>
}
