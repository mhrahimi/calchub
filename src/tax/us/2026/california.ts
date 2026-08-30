import type { TaxJurisdictionConfig } from '../../types'

/**
 * California 2026 headline rates. Bracket thresholds are provisional pending
 * FTB Form 540 TY2026 publication. Do not treat as final official 2026 schedule.
 */
export const california2026: TaxJurisdictionConfig = {
  id: 'california',
  country: 'US',
  year: 2026,
  name: 'California',
  brackets: [
    { lower: 0, upper: 10756, rate: 0.01 },
    { lower: 10756, upper: 25499, rate: 0.02 },
    { lower: 25499, upper: 40245, rate: 0.04 },
    { lower: 40245, upper: 55866, rate: 0.06 },
    { lower: 55866, upper: 70606, rate: 0.08 },
    { lower: 70606, upper: 360659, rate: 0.093 },
    { lower: 360659, upper: 432787, rate: 0.103 },
    { lower: 432787, upper: 721314, rate: 0.113 },
    { lower: 721314, upper: Infinity, rate: 0.123 },
  ],
  surtaxes: [{ label: 'Mental Health Services Tax', threshold: 1_000_000, rate: 0.01 }],
  metadata: {
    source: 'CA statutory rates; thresholds provisional pending FTB 2026 Form 540',
    notes: [
      '2026 Form 540 rate schedule thresholds not confirmed as of 2026-08-28.',
      'Update from FTB when official TY2026 schedule is published.',
    ],
  },
}
