import { checkIncomeContribution } from './income'
import type { RetirementInput } from './types'

const RETURN_PRESETS = new Set(['conservative', 'moderate', 'growth', 'custom'])

export function validateRetirement(input: RetirementInput) {
  const errors: Record<string, string> = {}
  const income = input.contributionPath === 'income'
  if (input.contributionPath != null && input.contributionPath !== 'direct' && !income) {
    errors.contributionPath = 'Choose dollar amount or from income'
  }
  if (input.returnPreset != null && !RETURN_PRESETS.has(input.returnPreset)) {
    errors.returnPreset = 'Choose a return preset'
  }

  const numericKeys = [
    'currentAge',
    'retirementAge',
    'currentSavings',
    'contributionGrowth',
    'expectedReturn',
    'inflation',
    'retirementSpending',
    'retirementDuration',
    'otherRetirementIncome',
  ] as const
  for (const key of numericKeys) {
    if (typeof input[key] !== 'number' || !Number.isFinite(input[key])) errors[key] = 'Enter a finite number'
  }
  if (!income && (typeof input.annualContribution !== 'number' || !Number.isFinite(input.annualContribution))) {
    errors.annualContribution = 'Enter a finite number'
  }

  for (const key of ['currentAge', 'retirementAge', 'retirementDuration'] as const) {
    if (!Number.isInteger(input[key]) || input[key] < 0 || input[key] > 150) errors[key] = 'Enter a whole number between 0 and 150'
  }
  if (input.retirementAge <= input.currentAge) {
    errors.retirementAge = 'Retirement age must be greater than your current age.'
  }
  if (input.currentSavings < 0) errors.currentSavings = 'Current savings cannot be negative'
  if (input.retirementDuration <= 0) {
    errors.retirementDuration = 'Retirement duration must be positive'
  }
  if (input.retirementAge + input.retirementDuration > 150) errors.retirementDuration = 'The projection must end by age 150'
  for (const key of ['expectedReturn', 'inflation', 'contributionGrowth'] as const) {
    if (!Number.isFinite(input[key]) || input[key] <= -100 || input[key] > 100) errors[key] = 'Enter a rate greater than -100% and no more than 100%'
  }
  for (const key of ['currentSavings', 'retirementSpending', 'otherRetirementIncome'] as const) {
    if (!Number.isFinite(input[key])) errors[key] = 'Enter a finite amount'
    else if (input[key] < 0) errors[key] = 'Amount cannot be negative'
  }
  if (!income) {
    if (!Number.isFinite(input.annualContribution)) errors.annualContribution = 'Enter a finite amount'
  }
  if (income) Object.assign(errors, checkIncomeContribution(input).errors)

  if (Object.keys(errors).length) return { valid: false as const, errors }
  return { valid: true as const, data: input }
}
