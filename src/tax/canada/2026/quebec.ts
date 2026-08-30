import type { TaxJurisdictionConfig } from '../../types'

export const quebec2026: TaxJurisdictionConfig = {
  id: 'quebec',
  country: 'CA',
  year: 2026,
  name: 'Quebec',
  brackets: [
    { lower: 0, upper: 54345, rate: 0.14 },
    { lower: 54345, upper: 108680, rate: 0.19 },
    { lower: 108680, upper: 132245, rate: 0.24 },
    { lower: 132245, upper: Infinity, rate: 0.2575 },
  ],
  metadata: {
    source: 'Revenu Québec 2026 rates',
    notes: [
      'Quebec has separate payroll (QPP/QPIP). Do not apply CPP/EI to Quebec take-home.',
      'Federal abatement and Quebec-specific credits are not fully modeled.',
    ],
  },
}
