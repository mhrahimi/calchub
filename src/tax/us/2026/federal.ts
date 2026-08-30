import type { TaxBracket, TaxJurisdictionConfig, FilingStatus } from '../../types'

const SINGLE: TaxBracket[] = [
  { lower: 0, upper: 12400, rate: 0.1 },
  { lower: 12400, upper: 50400, rate: 0.12 },
  { lower: 50400, upper: 105700, rate: 0.22 },
  { lower: 105700, upper: 201775, rate: 0.24 },
  { lower: 201775, upper: 256225, rate: 0.32 },
  { lower: 256225, upper: 640600, rate: 0.35 },
  { lower: 640600, upper: Infinity, rate: 0.37 },
]

const MFJ: TaxBracket[] = [
  { lower: 0, upper: 24800, rate: 0.1 },
  { lower: 24800, upper: 100800, rate: 0.12 },
  { lower: 100800, upper: 211400, rate: 0.22 },
  { lower: 211400, upper: 403550, rate: 0.24 },
  { lower: 403550, upper: 512450, rate: 0.32 },
  { lower: 512450, upper: 768700, rate: 0.35 },
  { lower: 768700, upper: Infinity, rate: 0.37 },
]

/** MFS mirrors Single thresholds per IRS 2026 inflation adjustments */
const MFS = SINGLE

/** HOH brackets (IRS 2026 inflation adjustments) */
const HOH: TaxBracket[] = [
  { lower: 0, upper: 17700, rate: 0.1 },
  { lower: 17700, upper: 67450, rate: 0.12 },
  { lower: 67450, upper: 105700, rate: 0.22 },
  { lower: 105700, upper: 201775, rate: 0.24 },
  { lower: 201775, upper: 256225, rate: 0.32 },
  { lower: 256225, upper: 640600, rate: 0.35 },
  { lower: 640600, upper: Infinity, rate: 0.37 },
]

const STANDARD: Partial<Record<FilingStatus, number>> = {
  single: 16100,
  married_separate: 16100,
  married_joint: 32200,
  qualifying_surviving_spouse: 32200,
  head_of_household: 24150,
}

export const usFederal2026: TaxJurisdictionConfig = {
  id: 'us-federal',
  country: 'US',
  year: 2026,
  name: 'United States Federal',
  bracketsByStatus: {
    single: SINGLE,
    married_joint: MFJ,
    married_separate: MFS,
    head_of_household: HOH,
    qualifying_surviving_spouse: MFJ,
  },
  standardDeductionByStatus: STANDARD,
  metadata: {
    source: 'IRS 2026 inflation adjustments / Rev. Proc. tables',
  },
}
