export interface LboForecastYear {
  depreciation?: number
  taxRate?: number
  ebitda: number
  capex: number
  nwcChange: number
}

export interface LboInput {
  transactionFees?: number
  minimumCash?: number
  cashSweepPercent?: number
  debtTranches?: Array<{name: string; amount: number; interestRate: number; mandatoryAmortizationPercent: number}>
  purchaseEv: number
  sponsorEquity: number
  initialDebt: number
  interestRate: number
  forecast: LboForecastYear[]
  exitMultiple: number
  exitYear: number
}

export interface LboDebtRow {
  year: number
  ebitda: number
  fcf: number
  interest: number
  paydown: number
  endingDebt: number
  endingCash: number
  cashTaxes: number
  fundingShortfall: number
  trancheBalances: number[]
}

export interface LboResult {
  status: 'success' | 'funding_shortfall'
  warnings: string[]
  exitCash: number
  sourcesTotal: number
  usesTotal: number
  debtSchedule: LboDebtRow[]
  exitEv: number
  exitEquity: number
  moic: number
  irr: number | null
  sourcesUses: Array<{ item: string; amount: number }>
}
