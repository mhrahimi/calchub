import type { TaxJurisdictionConfig } from '../../types'

export const pennsylvania2026: TaxJurisdictionConfig = {
  id: 'pennsylvania',
  country: 'US',
  year: 2026,
  name: 'Pennsylvania',
  flatRate: 0.0307,
  metadata: {
    source: 'PA Department of Revenue',
    notes: ['Local earned-income taxes are not modeled.'],
  },
}
