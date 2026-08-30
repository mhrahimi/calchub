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
  sampleVariance: number
  populationSd: number
  sampleSd: number
  values: number[]
}
