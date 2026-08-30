import type { TaxJurisdictionConfig } from '../../types'

export const washington2026: TaxJurisdictionConfig = {
  id: 'washington',
  country: 'US',
  year: 2026,
  name: 'Washington',
  noIncomeTax: true,
  metadata: {
    source: 'WA Department of Revenue',
    notes: [
      'No general individual income tax in 2026.',
      'Capital-gains tax regime is separate and not modeled here.',
    ],
  },
}
