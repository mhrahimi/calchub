import type { TaxJurisdictionConfig } from '../../types'

export const alberta2026: TaxJurisdictionConfig = {
  id: 'alberta',
  country: 'CA',
  year: 2026,
  name: 'Alberta',
  brackets: [
    { lower: 0, upper: 61200, rate: 0.08 },
    { lower: 61200, upper: 154259, rate: 0.1 },
    { lower: 154259, upper: 185111, rate: 0.12 },
    { lower: 185111, upper: 246813, rate: 0.13 },
    { lower: 246813, upper: 370220, rate: 0.14 },
    { lower: 370220, upper: Infinity, rate: 0.15 },
  ],
  metadata: {
    source: 'CRA 2026 provincial brackets',
  },
}
