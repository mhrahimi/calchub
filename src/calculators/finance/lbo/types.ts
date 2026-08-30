export interface LboForecastYear {
  ebitda: number
  capex: number
  nwcChange: number
}

export interface LboInput {
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
}

export interface LboResult {
  debtSchedule: LboDebtRow[]
  exitEv: number
  exitEquity: number
  moic: number
  irr: number | null
  sourcesUses: Array<{ item: string; amount: number }>
}
