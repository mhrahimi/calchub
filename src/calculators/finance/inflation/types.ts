export type InflationMode = 'historical' | 'projection'

export interface InflationInput {
  mode: InflationMode
  amount: number
  baseYear?: number
  targetYear?: number
  inflationRate?: number
  durationYears?: number
}

export interface InflationResult {
  mode: InflationMode
  primaryAmount: number
  percentChange: number
  purchasingPowerReduction?: number
  realValue?: number
  futurePrice?: number
  baseCpi?: number
  targetCpi?: number
  schedule: Array<{ year: number; value: number; realValue?: number; label?: string }>
}
