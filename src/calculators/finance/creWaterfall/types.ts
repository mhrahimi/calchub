export interface CreWaterfallInput {
  lpContribution: number
  gpContribution: number
  totalDistribution: number
  preferredReturnPercent: number
  catchUpPercent: number
  lpPromotePercent: number
}

export interface CreWaterfallTier {
  tier: string
  lpAmount: number
  gpAmount: number
  total: number
}

export interface CreWaterfallResult {
  tiers: CreWaterfallTier[]
  lpTotal: number
  gpTotal: number
  lpIrr: number | null
  gpIrr: number | null
  lpMoic: number
  gpMoic: number
}
