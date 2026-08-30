export type TerminalMethod = 'gordon' | 'exitMultiple'

export interface DcfForecastYear {
  revenue: number
  ebitdaMargin: number
  taxRate: number
  capexPercent: number
  nwcPercent: number
}

export interface DcfInput {
  forecast: DcfForecastYear[]
  wacc: number
  terminalGrowth: number
  terminalMethod: TerminalMethod
  exitMultiple: number
  netDebt: number
  cash: number
}

export interface DcfResult {
  enterpriseValue: number
  equityValue: number
  terminalValue: number
  pvTerminalValue: number
  pvFcf: number
  fcfByYear: Array<{ year: number; revenue: number; ebitda: number; fcf: number; pv: number }>
  sensitivity: Array<{ wacc: number; growth: number; ev: number }>
}
