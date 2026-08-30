import type { TaxCountry, FilingStatus } from '@/tax/types'

export type SalaryMode = 'conversion' | 'take-home'
export type PayFrequency =
  | 'annual'
  | 'monthly'
  | 'semi-monthly'
  | 'biweekly'
  | 'weekly'
  | 'daily'
  | 'hourly'

export interface SalaryInput {
  mode: SalaryMode
  amount: number
  fromFrequency: PayFrequency
  toFrequency: PayFrequency
  hoursPerWeek?: number
  weeksPerYear?: number
  country?: TaxCountry
  jurisdictionId?: string
  filingStatus?: FilingStatus
  pretaxDeductions?: number
  taxYear?: number
}

export interface SalaryResult {
  mode: SalaryMode
  annualGross: number
  convertedAmount: number
  equivalents: Record<PayFrequency, number>
  estimatedNetAnnual?: number
  federalTax?: number
  regionalTax?: number
  payrollTotal?: number
  payrollLabels?: { label: string; amount: number }[]
  pretaxDeductions?: number
  waterfall?: { label: string; amount: number }[]
  taxConfigVersion?: string
}
