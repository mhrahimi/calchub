import type { TaxJurisdictionConfig } from '../../types'

export const manitoba2026: TaxJurisdictionConfig = {
  id: 'manitoba',
  country: 'CA',
  year: 2026,
  name: 'Manitoba',
  brackets: [
    { lower: 0, upper: 47564, rate: 0.108 },
    { lower: 47564, upper: 101200, rate: 0.1275 },
    { lower: 101200, upper: Infinity, rate: 0.174 },
  ],
  metadata: {
    source: 'CRA 2026 provincial brackets',
  },
}
