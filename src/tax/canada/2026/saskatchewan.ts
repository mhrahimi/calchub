import type { TaxJurisdictionConfig } from '../../types'

export const saskatchewan2026: TaxJurisdictionConfig = {
  id: 'saskatchewan',
  country: 'CA',
  year: 2026,
  name: 'Saskatchewan',
  brackets: [
    { lower: 0, upper: 54532, rate: 0.105 },
    { lower: 54532, upper: 155805, rate: 0.125 },
    { lower: 155805, upper: Infinity, rate: 0.145 },
  ],
  metadata: {
    source: 'CRA 2026 provincial brackets',
  },
}
