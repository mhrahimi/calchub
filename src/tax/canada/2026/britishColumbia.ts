import type { TaxJurisdictionConfig } from '../../types'

export const britishColumbia2026: TaxJurisdictionConfig = {
  id: 'britishColumbia',
  country: 'CA',
  year: 2026,
  name: 'British Columbia',
  brackets: [
    { lower: 0, upper: 50363, rate: 0.056 },
    { lower: 50363, upper: 100728, rate: 0.077 },
    { lower: 100728, upper: 115648, rate: 0.105 },
    { lower: 115648, upper: 140430, rate: 0.1229 },
    { lower: 140430, upper: 190405, rate: 0.147 },
    { lower: 190405, upper: 265545, rate: 0.168 },
    { lower: 265545, upper: Infinity, rate: 0.205 },
  ],
  metadata: {
    source: 'CRA 2026 provincial brackets',
  },
}
