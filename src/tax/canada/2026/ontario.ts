import type { TaxJurisdictionConfig } from '../../types'

export const ontario2026: TaxJurisdictionConfig = {
  id: 'ontario',
  country: 'CA',
  year: 2026,
  name: 'Ontario',
  brackets: [
    { lower: 0, upper: 53891, rate: 0.0505 },
    { lower: 53891, upper: 107785, rate: 0.0915 },
    { lower: 107785, upper: 150000, rate: 0.1116 },
    { lower: 150000, upper: 220000, rate: 0.1216 },
    { lower: 220000, upper: Infinity, rate: 0.1316 },
  ],
  metadata: {
    source: 'CRA 2026 provincial brackets',
    notes: ['Ontario Health Premium and provincial surtax are not modeled.'],
  },
}
