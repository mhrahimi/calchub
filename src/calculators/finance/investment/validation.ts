import type { InvestmentInput } from './types'
import { growthFrequency, MAX_GROWTH_EVENTS, MAX_GROWTH_YEARS, validGrowthAmount } from '@/utils/growthProjection'

export function validateInvestment(input: InvestmentInput) {
  const errors: Record<string, string> = {}
  if (!['fv', 'pv', 'pmt', 'rate', 'periods'].includes(input.solveFor)) errors.solveFor = 'Choose a supported calculation mode'
  const frequency = growthFrequency(input.contributionFrequency)
  if (!frequency) errors.contributionFrequency = 'Choose a contribution frequency'
  if (!['begin', 'end'].includes(input.contributionTiming)) errors.contributionTiming = 'Choose beginning or end of period'
  if (input.rateConvention !== undefined && input.rateConvention !== 'nominal-annual') errors.returnRate = 'Only nominal annual rates are supported'
  if (input.solveFor !== 'pv' && (!validGrowthAmount(input.startingInvestment) || input.startingInvestment < 0)) errors.startingInvestment = 'Enter a finite, non-negative starting investment within the supported monetary range'
  if (input.solveFor !== 'pmt' && !validGrowthAmount(input.periodicContribution)) errors.periodicContribution = 'Enter a finite contribution or withdrawal within the supported monetary range'
  if (input.solveFor !== 'rate' && (!Number.isFinite(input.returnRate) || (frequency && 1 + input.returnRate / 100 / frequency.periods <= 0))) errors.returnRate = frequency ? `Enter a finite nominal annual rate greater than ${-100 * frequency.periods}%` : 'Enter a finite nominal annual rate'
  if (input.solveFor !== 'periods') {
    if (!['years', 'months'].includes(input.periodUnit)) errors.periodUnit = 'Choose years or months'
    const years = input.periodUnit === 'months' ? input.period / 12 : input.period
    if (!Number.isFinite(years) || years <= 0 || years > MAX_GROWTH_YEARS) errors.period = `Enter a duration greater than zero and no longer than ${MAX_GROWTH_YEARS} years`
    else if (frequency) {
      const periods = years * frequency.periods
      if (Math.round(periods) < 1 || Math.abs(periods - Math.round(periods)) > 1e-8) errors.period = 'Enter a duration containing at least one whole contribution period, with no partial periods'
      else if (periods > MAX_GROWTH_EVENTS) errors.period = 'The duration creates too many contribution periods'
    }
  }
  if (input.solveFor !== 'fv' && (!validGrowthAmount(input.targetValue) || input.targetValue < 0)) errors.targetValue = 'Enter a finite, non-negative target balance'
  if (input.solveFor === 'rate' && input.targetValue === 0) errors.targetValue = 'Enter a target above zero to solve for a unique return rate'
  if (Object.keys(errors).length) return { valid: false as const, errors }
  return { valid: true as const, data: { ...input, rateConvention: 'nominal-annual' as const } }
}
