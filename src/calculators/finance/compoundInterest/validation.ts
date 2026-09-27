import type { CompoundInterestInput } from './types'
import { calendarDate } from '@/utils/cashFlowDates'
import { growthFrequency, MAX_GROWTH_EVENTS, MAX_GROWTH_YEARS, validGrowthAmount } from '@/utils/growthProjection'

export function validateCompoundInterest(input: CompoundInterestInput) {
  const errors: Record<string, string> = {}
  if (!validGrowthAmount(input.principal) || input.principal < 0) errors.principal = 'Enter a finite, non-negative principal within the supported monetary range'
  if (!validGrowthAmount(input.contribution)) errors.contribution = 'Enter a finite contribution or withdrawal within the supported monetary range'
  if (!['years', 'months'].includes(input.durationUnit)) errors.durationUnit = 'Choose years or months'
  const years = input.durationUnit === 'months' ? input.duration / 12 : input.duration
  if (!Number.isFinite(years) || years <= 0 || years > MAX_GROWTH_YEARS) errors.duration = `Enter a duration greater than zero and no longer than ${MAX_GROWTH_YEARS} years`
  const contributionFrequency = growthFrequency(input.contributionFrequency)
  if (!contributionFrequency) errors.contributionFrequency = 'Choose a contribution frequency'
  else if (years * contributionFrequency.periods > MAX_GROWTH_EVENTS) errors.duration = 'The duration creates too many contribution events'
  const compounding = growthFrequency(input.compoundingFrequency)
  const continuous = input.continuous || input.compoundingFrequency === 'continuous'
  if (!compounding && input.compoundingFrequency !== 'continuous') errors.compoundingFrequency = 'Choose a supported compounding frequency'
  if (!Number.isFinite(input.interestRate) || (!continuous && compounding && 1 + input.interestRate / 100 / compounding.periods <= 0)) errors.interestRate = continuous ? 'Enter a finite nominal annual rate' : `Enter a finite nominal annual rate greater than ${-100 * (compounding?.periods ?? 1)}%`
  if (input.rateConvention !== undefined && input.rateConvention !== 'nominal-annual') errors.interestRate = 'Only nominal annual rates are supported'
  if (!['begin', 'end'].includes(input.contributionTiming)) errors.contributionTiming = 'Choose beginning or end of period'
  if (typeof input.continuous !== 'boolean') errors.compoundingFrequency = 'Choose a supported compounding frequency'
  if (typeof input.adjustForInflation !== 'boolean') errors.adjustForInflation = 'Choose whether to adjust for inflation'
  if (input.adjustForInflation && (!Number.isFinite(input.inflationRate) || input.inflationRate <= -100)) errors.inflationRate = 'Enter a finite inflation rate greater than −100%'
  try {
    if (input.startDate !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(input.startDate)) throw new Error('Invalid date')
    const start = calendarDate(input.startDate ?? '2026-01-01')
    if (start.getUTCFullYear() < 1900 || start.getUTCFullYear() + years > 9999) errors.startDate = 'Use a start date from 1900 with a projection ending before year 10000'
  } catch { errors.startDate = 'Enter a valid start date' }
  if (Object.keys(errors).length) return { valid: false as const, errors }
  return { valid: true as const, data: { ...input, startDate: input.startDate ?? '2026-01-01', rateConvention: 'nominal-annual' as const } }
}
