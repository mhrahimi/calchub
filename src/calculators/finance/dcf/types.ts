export type TerminalMethod = 'gordon' | 'exitMultiple'

export interface DcfForecastYear {
  depreciation?: number
  revenue: number
  ebitdaMargin: number
  taxRate: number
  capexPercent: number
  nwcPercent: number
}

export interface DcfInput {
  baseNwc?: number
  grossDebt?: number
  forecast: DcfForecastYear[]
  wacc: number
  terminalGrowth: number
  terminalMethod: TerminalMethod
  exitMultiple: number
  netDebt: number
  cash: number
}

export interface DcfResult {
  terminalMethod: TerminalMethod
  enterpriseValue: number
  equityValue: number
  terminalValue: number
  pvTerminalValue: number
  pvFcf: number
  fcfByYear: Array<{ year: number; revenue: number; ebitda: number; depreciation: number; ebit: number; cashTaxes: number; capex: number; nwcChange: number; fcf: number; pv: number }>
  sensitivity: Array<{ wacc: number; growth: number; ev: number }>
}
