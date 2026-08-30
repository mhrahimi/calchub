import type { TaxJurisdictionConfig } from '../../types'

export const massachusetts2026: TaxJurisdictionConfig = {
  id: 'massachusetts',
  country: 'US',
  year: 2026,
  name: 'Massachusetts',
  flatRate: 0.05,
  surtaxes: [
    {
      label: '4% surtax on taxable income over threshold',
      threshold: 1_107_750,
      rate: 0.04,
    },
  ],
  metadata: {
    source: 'Massachusetts DOR 2026 rates / surtax',
    notes: ['Short-term capital gains and collectibles use separate rates not modeled here.'],
  },
}
