import { presentValue } from '@/utils/npv'
import type { DcfInput, DcfResult } from './types'
import type { CalculationExplanation, ChartData, TableData } from '@/calculators/types'

function computeDcf(input: DcfInput): Omit<DcfResult, 'sensitivity'> {
  const wacc = input.wacc / 100
  const g = input.terminalGrowth / 100
  const fcfByYear = input.forecast.map((y, i) => {
    const ebitda = y.revenue * (y.ebitdaMargin / 100)
    const depreciation = y.depreciation ?? 0
    const ebit = ebitda - depreciation
    const taxes = Math.max(0, ebit) * (y.taxRate / 100)
    const nopat = ebit - taxes
    const capex = y.revenue * (y.capexPercent / 100)
    const nwcChange = y.revenue * y.nwcPercent / 100 - (i === 0 ? (input.baseNwc ?? 0) : input.forecast[i - 1].revenue * input.forecast[i - 1].nwcPercent / 100)
    const fcf = nopat + depreciation - capex - nwcChange
    const pv = presentValue(fcf, wacc, i + 1)
    return { year: i + 1, revenue: y.revenue, ebitda, depreciation, ebit, cashTaxes: taxes, capex, nwcChange, fcf, pv }
  })
  const pvFcf = fcfByYear.reduce((s, r) => s + r.pv, 0)
  const last = fcfByYear[fcfByYear.length - 1]
  const terminalValue =
    input.terminalMethod === 'gordon'
      ? (last.fcf * (1 + g)) / (wacc - g)
      : last.ebitda * input.exitMultiple
  const pvTerminalValue = presentValue(terminalValue, wacc, input.forecast.length)
  const enterpriseValue = pvFcf + pvTerminalValue
  const equityValue = enterpriseValue - (input.grossDebt === undefined ? input.netDebt : input.grossDebt - input.cash)
  return { terminalMethod: input.terminalMethod, enterpriseValue, equityValue, terminalValue, pvTerminalValue, pvFcf, fcfByYear }
}

export function calculateDcf(input: DcfInput): DcfResult {
  if (Object.values(input).some(v => typeof v === 'number' && !Number.isFinite(v)) || input.forecast.some(y => Object.values(y).some(v => !Number.isFinite(v)))) throw new Error('Model inputs must be finite')
  if (input.forecast.some(y => (y.taxRate ?? 0) < 0 || (y.taxRate ?? 0) > 100 || (y.depreciation ?? 0) < 0)) throw new Error('Invalid cash tax rate or depreciation')
  if (!input.forecast.length || !Number.isFinite(input.wacc) || input.wacc <= -100 || (input.terminalMethod === 'gordon' && input.wacc <= input.terminalGrowth)) throw new Error('Invalid DCF discount or terminal assumptions')
  const base = computeDcf(input)
  const sensitivity: Array<{ wacc: number; growth: number; ev: number }> = []
  for (let wi = -2; wi <= 2; wi++) {
    for (let gi = -1; gi <= 1; gi++) {
      const wacc = input.wacc + wi
      const growth = (input.terminalMethod === 'gordon' ? input.terminalGrowth : input.exitMultiple) + gi
      if (wacc <= -100 || (input.terminalMethod === 'gordon' && wacc <= growth) || (input.terminalMethod === 'exitMultiple' && growth <= 0)) continue
      const r = computeDcf({ ...input, wacc, terminalGrowth: growth, exitMultiple: growth })
      sensitivity.push({ wacc, growth, ev: r.enterpriseValue })
    }
  }
  return { ...base, sensitivity }
}

export function explainDcf(input: DcfInput, _result: DcfResult): CalculationExplanation {
  return {
    title: 'DCF valuation',
    steps: [
      {
        label: 'Unlevered FCF',
        expression: 'UFCF = EBIT − cash taxes + D&A − capex − ΔNWC',
      },
      {
        label: 'Discounting',
        expression: 'PV_t = FCF_t / (1 + WACC)^t',
      },
      {
        label: 'Terminal value',
        expression:
          input.terminalMethod === 'gordon'
            ? `TV = FCF_n (1 + g) / (WACC − g)  with g = ${input.terminalGrowth}%`
            : `TV = EBITDA_n × ${input.exitMultiple}`,
      },
      {
        label: 'Equity value',
        expression: 'Equity = EV − net debt (or EV − gross debt + cash),  EV = Σ PV(FCF) + PV(TV)',
      },
    ],
    assumptions: [
      'Cash tax is max(EBIT, 0) × tax rate; no loss carryforwards. Missing D&A and opening NWC default to zero.',
      'Net debt already includes cash. Legacy separate cash is ignored unless grossDebt is explicitly supplied.',
    ],
  }
}

export function buildDcfCharts(result: DcfResult): ChartData[] {
  return [{
    type: 'bar',
    title: 'Unlevered free cash flow',
    valueFormat: 'currency',
    series: [{ name: 'FCF', data: result.fcfByYear.map((r) => ({ x: `Y${r.year}`, y: r.fcf })), color: '#163B8C' }],
  }]
}

export function buildDcfTable(result: DcfResult): TableData {
  return {
    title: 'DCF forecast',
    columns: [
      { key: 'year', label: 'Year', align: 'right' },
      { key: 'revenue', label: 'Revenue', align: 'right', format: 'currency' },
      { key: 'ebitda', label: 'EBITDA', align: 'right', format: 'currency' },
      ...['depreciation','ebit','cashTaxes','capex','nwcChange'].map(key => ({key,label:({depreciation:'D&A',ebit:'EBIT',cashTaxes:'Cash taxes',capex:'Capex',nwcChange:'Change in NWC',endingCash:'Retained cash',fundingShortfall:'Funding shortfall'} as Record<string,string>)[key],align:'right' as const,format:'currency' as const})),
      { key: 'fcf', label: 'FCF', align: 'right', format: 'currency' },
      { key: 'pv', label: 'PV', align: 'right', format: 'currency' },
    ],
    rows: result.fcfByYear.map((r) => ({
      year: r.year,
      revenue: Math.round(r.revenue),
      ebitda: Math.round(r.ebitda),
      depreciation:r.depreciation??0, ebit:r.ebit??0, cashTaxes:r.cashTaxes??0, capex:r.capex??0, nwcChange:r.nwcChange??0,
      fcf: Math.round(r.fcf),
      pv: Math.round(r.pv),
    })),
  }
}

export function buildDcfSensitivityTable(result: DcfResult): TableData {
  return {
    title: result.terminalMethod === 'exitMultiple' ? 'WACC × exit multiple sensitivity (EV)' : 'WACC × terminal growth sensitivity (EV)',
    columns: [
      { key: 'wacc', label: 'WACC (%)', align: 'right' },
      { key: 'growth', label: result.terminalMethod === 'exitMultiple' ? 'Exit multiple (x)' : 'Growth (%)', align: 'right' },
      { key: 'ev', label: 'EV', align: 'right', format: 'currency' },
    ],
    rows: result.sensitivity.map((s) => ({
      wacc: s.wacc,
      growth: s.growth,
      ev: Math.round(s.ev),
    })),
  }
}
