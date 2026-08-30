/**
 * US CPI-U annual averages (index, 1982-84=100).
 * Source: BLS series CUUR0000SA0, U.S. city average, not seasonally adjusted.
 * 2026 is omitted: BLS has not published a completed annual average for the current year.
 */
export const CPI_VERSION = 'bls-annual-2025'

/** Year -> annual average CPI-U */
export const US_CPI_U: Record<number, number> = {
  2000: 172.2,
  2001: 177.1,
  2002: 179.9,
  2003: 184.0,
  2004: 188.9,
  2005: 195.3,
  2006: 201.6,
  2007: 207.342,
  2008: 215.303,
  2009: 214.537,
  2010: 218.056,
  2011: 224.939,
  2012: 229.594,
  2013: 232.957,
  2014: 236.736,
  2015: 237.017,
  2016: 240.007,
  2017: 245.12,
  2018: 251.107,
  2019: 255.657,
  2020: 258.811,
  2021: 270.97,
  2022: 292.655,
  2023: 304.702,
  2024: 313.689,
  2025: 321.943,
}

export function getAvailableYears(): number[] {
  return Object.keys(US_CPI_U)
    .map(Number)
    .sort((a, b) => a - b)
}

export function getCpi(year: number): number | null {
  return US_CPI_U[year] ?? null
}

export function convertPurchasingPower(
  amount: number,
  baseYear: number,
  targetYear: number,
): { equivalent: number; baseCpi: number; targetCpi: number; percentChange: number } {
  const baseCpi = getCpi(baseYear)
  const targetCpi = getCpi(targetYear)
  if (baseCpi === null || targetCpi === null) {
    throw new Error(`CPI data not available for year ${baseCpi === null ? baseYear : targetYear}`)
  }
  if (baseCpi === 0) throw new Error('Base CPI cannot be zero')
  const equivalent = (amount * targetCpi) / baseCpi
  const percentChange = ((targetCpi - baseCpi) / baseCpi) * 100
  return {
    equivalent: Math.round(equivalent * 100) / 100,
    baseCpi,
    targetCpi,
    percentChange: Math.round(percentChange * 100) / 100,
  }
}
