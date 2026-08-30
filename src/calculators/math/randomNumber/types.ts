export interface RandomNumberInput {
  min: number
  max: number
  count: number
  integer: boolean
  unique: boolean
  decimalPlaces: number
  sortResults: boolean
}

export interface RandomNumberResult {
  values: number[]
  min: number
  max: number
  count: number
  integer: boolean
  unique: boolean
}
