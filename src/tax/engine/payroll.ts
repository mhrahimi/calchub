import type { FilingStatus, PayrollResult, TaxCountry } from '../types'

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** US 2026 Additional Medicare Tax thresholds by filing status */
const ADDITIONAL_MEDICARE_THRESHOLDS: Record<FilingStatus, number> = {
  single: 200_000,
  head_of_household: 200_000,
  married_joint: 250_000,
  qualifying_surviving_spouse: 250_000,
  married_separate: 125_000,
}

export function computeUsPayroll(
  annualWages: number,
  filingStatus: FilingStatus = 'single',
): PayrollResult {
  const wages = Math.max(0, annualWages)
  const socialSecurity = round2(Math.min(wages, 184_500) * 0.062)
  const medicare = round2(wages * 0.0145)
  const threshold = ADDITIONAL_MEDICARE_THRESHOLDS[filingStatus]
  const additionalMedicare = round2(Math.max(0, wages - threshold) * 0.009)
  const total = round2(socialSecurity + medicare + additionalMedicare)
  return {
    socialSecurity,
    medicare,
    additionalMedicare,
    total,
    labels: [
      { label: 'Social Security', amount: socialSecurity },
      { label: 'Medicare', amount: medicare },
      ...(additionalMedicare > 0
        ? [{ label: 'Additional Medicare', amount: additionalMedicare }]
        : []),
    ],
  }
}

export function computeCanadaPayroll(annualEarnings: number, isQuebec = false): PayrollResult {
  const earnings = Math.max(0, annualEarnings)

  if (isQuebec) {
    // Simplified QPP/QPIP estimates for take-home; not a full Revenu Québec payroll table.
    const ybe = 3500
    const ympe = 74600
    const qpp1 = round2(Math.min(0.064 * Math.max(0, Math.min(earnings, ympe) - ybe), 4487.4))
    const yampe = 85000
    const qpp2 = round2(Math.min(0.04 * Math.max(0, Math.min(earnings, yampe) - ympe), 416))
    const qpipMax = 464.36
    const qpip = round2(Math.min(earnings * 0.00494, qpipMax))
    const total = round2(qpp1 + qpp2 + qpip)
    return {
      qpp: round2(qpp1 + qpp2),
      qpip,
      total,
      labels: [
        { label: 'QPP', amount: round2(qpp1 + qpp2) },
        { label: 'QPIP', amount: qpip },
      ],
    }
  }

  const cpp1 = round2(
    Math.min(0.0595 * Math.max(0, Math.min(earnings, 74_600) - 3500), 4230.45),
  )
  const cpp2 = round2(
    Math.min(0.04 * Math.max(0, Math.min(earnings, 85_000) - 74_600), 416),
  )
  const ei = round2(Math.min(Math.min(earnings, 68_900) * 0.0163, 1123.07))
  const total = round2(cpp1 + cpp2 + ei)
  return {
    cpp: cpp1,
    cpp2,
    ei,
    total,
    labels: [
      { label: 'CPP', amount: cpp1 },
      { label: 'CPP2', amount: cpp2 },
      { label: 'EI', amount: ei },
    ],
  }
}

export function computePayroll(
  country: TaxCountry,
  annualEarnings: number,
  options?: { filingStatus?: FilingStatus; jurisdictionId?: string },
): PayrollResult {
  if (country === 'US') {
    return computeUsPayroll(annualEarnings, options?.filingStatus ?? 'single')
  }
  const isQuebec = options?.jurisdictionId === 'quebec' || options?.jurisdictionId === 'ca-quebec'
  return computeCanadaPayroll(annualEarnings, isQuebec)
}
