import type { TaxJurisdictionConfig } from '../../types'

export const canadaFederal2026: TaxJurisdictionConfig = {
  id: 'ca-federal',
  country: 'CA',
  year: 2026,
  name: 'Canada Federal',
  brackets: [
    { lower: 0, upper: 58523, rate: 0.14 },
    { lower: 58523, upper: 117045, rate: 0.205 },
    { lower: 117045, upper: 181440, rate: 0.26 },
    { lower: 181440, upper: 258482, rate: 0.29 },
    { lower: 258482, upper: Infinity, rate: 0.33 },
  ],
  metadata: {
    source: 'CRA 2026 federal tax rates and brackets',
    notes: [
      'Basic personal amount and non-refundable credits are not applied in this headline engine.',
    ],
  },
}
