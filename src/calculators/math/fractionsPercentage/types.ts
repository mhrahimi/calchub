export type FractionOperation = 'add' | 'subtract' | 'multiply' | 'divide'
export type PercentageMode = 'percentOf' | 'whatPercent' | 'percentChange'

export interface FractionsPercentageInput {
  mode: 'fraction' | 'percentage'
  fractionOperation?: FractionOperation
  fractionA?: string
  fractionB?: string
  percentageMode?: PercentageMode
  percentValue?: number
  baseValue?: number
  oldValue?: number
  newValue?: number
}

export interface FractionsPercentageResult {
  mode: 'fraction' | 'percentage'
  primary: string
  improper: string
  mixed: string
  decimal: number
  percentageLabel?: string
}
