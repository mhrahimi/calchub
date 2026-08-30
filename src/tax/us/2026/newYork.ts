import type { TaxJurisdictionConfig } from '../../types'

/** NY headline 2026 ordinary rates; high-income recapture not fully modeled. */
export const newYork2026: TaxJurisdictionConfig = {
  id: 'newYork',
  country: 'US',
  year: 2026,
  name: 'New York',
  brackets: [
    { lower: 0, upper: 8500, rate: 0.04 },
    { lower: 8500, upper: 11700, rate: 0.045 },
    { lower: 11700, upper: 13900, rate: 0.0525 },
    { lower: 13900, upper: 80650, rate: 0.055 },
    { lower: 80650, upper: 215400, rate: 0.06 },
    { lower: 215400, upper: 1077550, rate: 0.0685 },
    { lower: 1077550, upper: 5000000, rate: 0.0965 },
    { lower: 5000000, upper: 25000000, rate: 0.103 },
    { lower: 25000000, upper: Infinity, rate: 0.109 },
  ],
  metadata: {
    source: 'NYS 2026 withholding / rate publications',
    notes: [
      'High-income recapture/special computation rules are not fully modeled.',
      'NYC and Yonkers local taxes are separate modules not included here.',
    ],
  },
}
