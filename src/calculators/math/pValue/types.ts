export type PValueMode = 'zTest' | 'tTest' | 'meanCi' | 'proportionCi'
export type TailType = 'oneLower' | 'oneUpper' | 'two'

export interface PValueInput {
  mode: PValueMode
  tail?: TailType
  sampleMean?: number
  hypothesizedMean?: number
  populationSd?: number
  sampleSd?: number
  sampleSize?: number
  confidenceLevel?: number
  proportion?: number
}

export interface PValueResult {
  mode: PValueMode
  pValue?: number
  testStatistic?: number
  standardError?: number
  degreesOfFreedom?: number
  ciLower?: number
  ciUpper?: number
  marginOfError?: number
  confidenceLevel?: number
  distributionPoints: Array<{ x: number; y: number }>
  shadedRegion: Array<{ x: number; y: number }>
  shadedRegionLower?: Array<{ x: number; y: number }>
  tail?: TailType
  estimate?: number
  caveat: string
}
