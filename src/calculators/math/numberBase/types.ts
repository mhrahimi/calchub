export interface NumberBaseInput {
  value: string
  fromBase: number
  toBase: number
  fractionalPrecision: number
}

export interface NumberBaseResult {
  sourceValue: string
  sourceBase: number
  targetBase: number
  targetValue: string
  steps: Array<{ label: string; value: string }>
}
