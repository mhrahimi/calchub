import type { TaxJurisdictionConfig } from '../../types'

/** NJ filing-status schedule (Single); rates 1.4%-10.75%. */
export const newJersey2026: TaxJurisdictionConfig = {
  id: 'newJersey',
  country: 'US',
  year: 2026,
  name: 'New Jersey',
  brackets: [
    { lower: 0, upper: 20000, rate: 0.014 },
    { lower: 20000, upper: 35000, rate: 0.0175 },
    { lower: 35000, upper: 40000, rate: 0.035 },
    { lower: 40000, upper: 75000, rate: 0.05525 },
    { lower: 75000, upper: 500000, rate: 0.0637 },
    { lower: 500000, upper: 1000000, rate: 0.0897 },
    { lower: 1000000, upper: Infinity, rate: 0.1075 },
  ],
  metadata: {
    source: 'NJ Division of Taxation rate schedules (2020 and after)',
  },
}
