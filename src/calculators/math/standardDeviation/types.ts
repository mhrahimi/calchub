export interface StandardDeviationInput {
  dataset: string
}

export interface StandardDeviationResult {
  count: number
  sum: number
  mean: number
  min: number
  max: number
  range: number
  populationVariance: number
  sampleVariance: number | null
  populationSd: number
  sampleSd: number | null
  values: number[]
}
