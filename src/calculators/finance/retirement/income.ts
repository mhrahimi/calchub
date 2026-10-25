import { calculateSalary } from '@/calculators/finance/salary/calculate'
import { listJurisdictions } from '@/tax/registry'
import type { FilingStatus, TaxCountry } from '@/tax/types'
import type { RetirementInput } from './types'

export interface IncomeContribution {
  annualContribution: number
  estimatedNetAnnual: number
  employeeContribution: number
  employerMatch: number
  investedThisYear: number
  taxConfigVersion?: string
  paycheckSlices: Array<{ label: string; amount: number }>
  investmentSlices: Array<{ label: string; amount: number }>
}

const FILING_STATUSES = new Set<FilingStatus>([
  'single',
  'married_joint',
  'married_separate',
  'head_of_household',
  'qualifying_surviving_spouse',
])

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function investmentIsPretax(input: RetirementInput): boolean {
  return input.investMode !== 'percent-net' && (input.contributionTaxTreatment ?? 'pretax') === 'pretax'
}

export function checkIncomeContribution(input: RetirementInput): { errors: Record<string, string>; contribution?: IncomeContribution } {
  const errors: Record<string, string> = {}
  const country = input.country
  if (country !== 'US' && country !== 'CA') errors.country = 'Country is required for take-home pay'
  if (!country || !input.jurisdictionId || !listJurisdictions(country as TaxCountry).some((item) => item.id === input.jurisdictionId)) {
    errors.jurisdictionId = 'State or province is required for take-home pay'
  }
  if (country === 'US' && input.filingStatus != null && !FILING_STATUSES.has(input.filingStatus)) {
    errors.filingStatus = 'Choose a filing status'
  }
  if (input.taxYear != null && input.taxYear !== 2026) errors.taxYear = 'Only tax year 2026 is supported'
  if (typeof input.grossIncome !== 'number' || !Number.isFinite(input.grossIncome)) errors.grossIncome = 'Enter a finite amount'
  else if (input.grossIncome < 0) errors.grossIncome = 'Amount cannot be negative'

  const otherPretax = input.otherPretaxDeductions ?? 0
  if (!Number.isFinite(otherPretax) || otherPretax < 0) errors.otherPretaxDeductions = 'Amount cannot be negative'
  else if (typeof input.grossIncome === 'number' && Number.isFinite(input.grossIncome) && otherPretax > input.grossIncome) {
    errors.otherPretaxDeductions = 'Pre-tax deductions cannot exceed gross income'
  }

  if (input.investMode !== 'percent-gross' && input.investMode !== 'percent-net' && input.investMode !== 'fixed') {
    errors.investMode = 'Choose how much of your pay you invest'
  } else if (input.investMode === 'fixed') {
    if (typeof input.investAmount !== 'number' || !Number.isFinite(input.investAmount)) errors.investAmount = 'Enter a finite amount'
    else if (input.investAmount < 0) errors.investAmount = 'Amount cannot be negative'
  } else if (typeof input.investPercent !== 'number' || !Number.isFinite(input.investPercent) || input.investPercent < 0 || input.investPercent > 100) {
    errors.investPercent = 'Enter a percent from 0% to 100%'
  }

  if (input.investMode !== 'percent-net' && input.contributionTaxTreatment != null && input.contributionTaxTreatment !== 'pretax' && input.contributionTaxTreatment !== 'aftertax') {
    errors.contributionTaxTreatment = 'Choose pre-tax or after-tax'
  }
  for (const [key, label] of [['employerMatchPercent', 'employer match'], ['employerMatchCapPercent', 'match cap']] as const) {
    const value = input[key]
    if (value == null) continue
    if (!Number.isFinite(value) || value < 0 || value > 100) errors[key] = `Enter ${label} from 0% to 100%`
  }
  if (Object.keys(errors).length) return { errors }

  const gross = input.grossIncome as number
  const pretaxInvestment = investmentIsPretax(input)
  let employee = input.investMode === 'fixed'
    ? round2(input.investAmount as number)
    : input.investMode === 'percent-gross'
      ? round2(gross * ((input.investPercent as number) / 100))
      : 0
  const pretax = round2(round2(otherPretax) + (pretaxInvestment ? employee : 0))
  if (pretax - gross > 0.005) {
    errors[input.investMode === 'fixed' ? 'investAmount' : 'investPercent'] = 'Pre-tax deductions and the pre-tax investment cannot exceed gross income.'
    return { errors }
  }

  let salary
  try {
    salary = calculateSalary({
      mode: 'take-home',
      amount: gross,
      fromFrequency: 'annual',
      toFrequency: 'annual',
      country,
      jurisdictionId: input.jurisdictionId,
      filingStatus: input.filingStatus && FILING_STATUSES.has(input.filingStatus) ? input.filingStatus : 'single',
      pretaxDeductions: pretax,
      taxYear: input.taxYear ?? 2026,
    })
  } catch (error) {
    errors.jurisdictionId = error instanceof Error ? error.message : 'Take-home could not be estimated'
    return { errors }
  }

  const estimatedNetAnnual = salary.estimatedNetAnnual ?? 0
  if (input.investMode === 'percent-net') employee = round2(estimatedNetAnnual * ((input.investPercent as number) / 100))
  if (!pretaxInvestment && employee - estimatedNetAnnual > 0.005) {
    errors[input.investMode === 'fixed' ? 'investAmount' : 'investPercent'] = 'After-tax investment exceeds estimated take-home.'
    return { errors }
  }

  // The cap is the employee contribution eligible for a match. A zero cap matches nothing.
  const cap = gross * ((input.employerMatchCapPercent ?? 0) / 100)
  const employerMatch = round2(Math.min(Math.max(employee, 0), cap) * ((input.employerMatchPercent ?? 0) / 100))
  const investedThisYear = round2(employee + employerMatch)
  if (![estimatedNetAnnual, employee, employerMatch, investedThisYear].every(Number.isFinite)) {
    errors.grossIncome = 'These amounts exceed the supported numerical range'
    return { errors }
  }

  const paycheckSlices: Array<{ label: string; amount: number }> = []
  if (pretaxInvestment && employee > 0.005) paycheckSlices.push({ label: 'Pre-tax investment', amount: employee })
  if (otherPretax > 0.005) paycheckSlices.push({ label: 'Other pre-tax deductions', amount: round2(otherPretax) })
  if ((salary.federalTax ?? 0) > 0.005) paycheckSlices.push({ label: 'Federal tax', amount: salary.federalTax ?? 0 })
  if ((salary.regionalTax ?? 0) > 0.005) paycheckSlices.push({ label: 'State / provincial tax', amount: salary.regionalTax ?? 0 })
  const payrollParts = (salary.payrollLabels ?? []).filter((part) => part.amount > 0.005)
  const payrollSum = round2(payrollParts.reduce((sum, part) => sum + part.amount, 0))
  if (payrollParts.length && Math.abs(payrollSum - (salary.payrollTotal ?? 0)) <= 0.05) paycheckSlices.push(...payrollParts.map((part) => ({ label: part.label, amount: part.amount })))
  else if ((salary.payrollTotal ?? 0) > 0.005) paycheckSlices.push({ label: 'Payroll', amount: salary.payrollTotal ?? 0 })
  if (!pretaxInvestment && employee > 0.005) paycheckSlices.push({ label: 'After-tax investment', amount: employee })
  const remainingTakeHome = round2(estimatedNetAnnual - (pretaxInvestment ? 0 : employee))
  if (remainingTakeHome > 0.005) paycheckSlices.push({ label: 'Take-home', amount: remainingTakeHome })

  return {
    errors,
    contribution: {
      annualContribution: investedThisYear,
      estimatedNetAnnual,
      employeeContribution: employee,
      employerMatch,
      investedThisYear,
      taxConfigVersion: salary.taxConfigVersion,
      paycheckSlices,
      investmentSlices: [
        { label: 'You invest', amount: employee },
        { label: 'Employer match', amount: employerMatch },
      ].filter((slice) => slice.amount > 0.005),
    },
  }
}
