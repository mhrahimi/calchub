import type { TaxJurisdictionConfig } from '../../types'

export const texas2026: TaxJurisdictionConfig = {
  id: 'texas',
  country: 'US',
  year: 2026,
  name: 'Texas',
  noIncomeTax: true,
  metadata: {
    source: 'Texas constitutional prohibition on individual income tax',
  },
}
