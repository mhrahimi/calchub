import type {
  TaxBracket,
  TaxJurisdictionConfig,
  FilingStatus,
  ProgressiveTaxResult,
  BracketSlice,
  CombinedTaxResult,
  SurtaxRule,
} from '../types'

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function applyProgressiveBrackets(
  taxableIncome: number,
  brackets: TaxBracket[],
): ProgressiveTaxResult {
  const income = Math.max(0, taxableIncome)
  const bracketBreakdown: BracketSlice[] = []
  let tax = 0
  let marginalRate = 0

  for (const bracket of brackets) {
    const taxableInBracket = Math.max(0, Math.min(income, bracket.upper) - bracket.lower)
    const taxInBracket = taxableInBracket * bracket.rate
    if (taxableInBracket > 0 || income >= bracket.lower) {
      bracketBreakdown.push({
        lower: bracket.lower,
        upper: bracket.upper === Infinity ? Infinity : bracket.upper,
        rate: bracket.rate,
        taxableInBracket: round2(taxableInBracket),
        taxInBracket: round2(taxInBracket),
      })
    }
    tax += taxInBracket
    if (income > bracket.lower) {
      marginalRate = bracket.rate
    }
  }

  const surtax = 0
  const totalTax = round2(tax + surtax)
  return {
    tax: totalTax,
    marginalRate,
    effectiveRate: income > 0 ? totalTax / income : 0,
    bracketBreakdown,
    surtax: 0,
  }
}

export function applySurtaxes(taxableIncome: number, surtaxes: SurtaxRule[] | undefined): number {
  if (!surtaxes?.length) return 0
  let total = 0
  for (const rule of surtaxes) {
    const excess = Math.max(0, taxableIncome - rule.threshold)
    total += excess * rule.rate
  }
  return round2(total)
}

export function getBracketsForStatus(
  config: TaxJurisdictionConfig,
  filingStatus: FilingStatus,
): TaxBracket[] {
  if (config.noIncomeTax) return []
  if (config.flatRate !== undefined) {
    return [{ lower: 0, upper: Infinity, rate: config.flatRate }]
  }
  if (config.bracketsByStatus?.[filingStatus]) {
    return config.bracketsByStatus[filingStatus]!
  }
  return config.brackets ?? []
}

export function computeJurisdictionTax(
  taxableIncome: number,
  config: TaxJurisdictionConfig,
  filingStatus: FilingStatus,
): ProgressiveTaxResult {
  if (config.noIncomeTax) {
    return {
      tax: 0,
      marginalRate: 0,
      effectiveRate: 0,
      bracketBreakdown: [],
      surtax: 0,
    }
  }

  const brackets = getBracketsForStatus(config, filingStatus)
  const base = applyProgressiveBrackets(taxableIncome, brackets)
  const surtax = applySurtaxes(taxableIncome, config.surtaxes)
  const tax = round2(base.tax + surtax)
  let marginalRate = base.marginalRate
  if (config.surtaxes) {
    for (const rule of config.surtaxes) {
      if (taxableIncome > rule.threshold) {
        marginalRate += rule.rate
      }
    }
  }
  return {
    tax,
    marginalRate,
    effectiveRate: taxableIncome > 0 ? tax / taxableIncome : 0,
    bracketBreakdown: base.bracketBreakdown,
    surtax,
  }
}

export function computeCombinedTax(options: {
  grossIncome: number
  pretaxDeductions?: number
  useStandardDeduction?: boolean
  filingStatus: FilingStatus
  federal: TaxJurisdictionConfig
  regional: TaxJurisdictionConfig
}): CombinedTaxResult {
  const pretax = Math.max(0, options.pretaxDeductions ?? 0)
  const useStd = options.useStandardDeduction !== false
  const stdDeduction = useStd
    ? (options.federal.standardDeductionByStatus?.[options.filingStatus] ?? 0)
    : 0
  const taxableIncome = Math.max(0, options.grossIncome - pretax - stdDeduction)

  const federal = computeJurisdictionTax(taxableIncome, options.federal, options.filingStatus)
  const regional = computeJurisdictionTax(taxableIncome, options.regional, options.filingStatus)

  const totalTax = round2(federal.tax + regional.tax)
  const afterTaxIncome = round2(options.grossIncome - pretax - totalTax)

  return {
    taxableIncome: round2(taxableIncome),
    federalTax: federal.tax,
    regionalTax: regional.tax,
    totalTax,
    afterTaxIncome,
    effectiveRate: options.grossIncome > 0 ? totalTax / options.grossIncome : 0,
    marginalRate: federal.marginalRate + regional.marginalRate,
    federalBreakdown: federal.bracketBreakdown,
    regionalBreakdown: regional.bracketBreakdown,
    federalSurtax: federal.surtax,
    regionalSurtax: regional.surtax,
    standardDeduction: stdDeduction,
    pretaxDeductions: pretax,
  }
}
