export type HolderType = 'common' | 'options'

export interface CapTableHolder {
  id: string
  name: string
  type: HolderType
  shares: number
}

export interface CapTableInput {
  holders: CapTableHolder[]
  preMoneyValuation: number
  investmentAmount: number
  optionPoolTopUpPercent: number
}

export interface HolderOwnership {
  id: string
  name: string
  type: HolderType
  shares: number
  preOwnership: number
  postOwnership: number
  dilution: number
}

export interface CapTableResult {
  holders: HolderOwnership[]
  preMoneyFds: number
  postMoneyFds: number
  pricePerShare: number
  newInvestorShares: number
  optionPoolShares: number
  postMoneyValuation: number
}
